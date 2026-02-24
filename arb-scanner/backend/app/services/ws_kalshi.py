"""Kalshi WebSocket client — real-time price streaming via Trade API WS v2.

Subscribes to the public `ticker` channel for market-level price data
(yes_bid, yes_ask, no_bid, no_ask, last_price, volume).

Protocol notes:
  - Auth headers passed on connect (RSA-PSS, same as REST API)
  - The `ticker` channel is PUBLIC — auth not required for price data
  - Commands: {"id": N, "cmd": "subscribe"|"unsubscribe", "params": {...}}
  - Events: {"type": "ticker", "msg": {...}}
  - WebSocket library handles protocol-level ping/pong automatically
"""

import asyncio
import json
import logging
from typing import Awaitable, Callable

import websockets
from websockets.exceptions import ConnectionClosed

from app.config import settings
from app.services.kalshi_auth import get_auth_headers

logger = logging.getLogger(__name__)

WS_URL = "wss://api.elections.kalshi.com/trade-api/ws/v2"
_WS_PATH = "/trade-api/ws/v2"


class KalshiWSClient:
    """Kalshi Trade API WebSocket client with auto-reconnect and subscription management."""

    def __init__(self, on_price_update: Callable[[str, float, float, float], Awaitable[None]]):
        """
        Args:
            on_price_update: async callback(ticker, yes_price, no_price, volume)
        """
        self._on_price_update = on_price_update
        self._subscribed_tickers: set[str] = set()
        self._ws = None
        self._running = False
        self._connected = False
        self._task: asyncio.Task | None = None
        self._msg_id = 0

    @property
    def connected(self) -> bool:
        return self._connected

    def _next_id(self) -> int:
        self._msg_id += 1
        return self._msg_id

    async def start(self) -> None:
        """Start the WS client as a background task."""
        self._running = True
        self._task = asyncio.create_task(self._run(), name="kalshi-ws")

    async def stop(self) -> None:
        """Stop the WS client and cancel the background task."""
        self._running = False
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def subscribe(self, tickers: list[str]) -> None:
        """Subscribe to ticker updates for the given market tickers."""
        new = [t for t in tickers if t not in self._subscribed_tickers]
        if not new:
            return
        self._subscribed_tickers.update(new)
        if self._ws and self._connected:
            try:
                await self._ws.send(json.dumps({
                    "id": self._next_id(),
                    "cmd": "subscribe",
                    "params": {
                        "channels": ["ticker"],
                        "market_tickers": new,
                    },
                }))
                logger.info("Kalshi WS: subscribed to %d new tickers", len(new))
            except Exception as exc:
                logger.warning("Kalshi WS: failed to send subscribe: %s", exc)

    async def unsubscribe(self, tickers: list[str]) -> None:
        """Unsubscribe from ticker updates for the given market tickers."""
        to_remove = [t for t in tickers if t in self._subscribed_tickers]
        if not to_remove:
            return
        for t in to_remove:
            self._subscribed_tickers.discard(t)
        if self._ws and self._connected:
            try:
                await self._ws.send(json.dumps({
                    "id": self._next_id(),
                    "cmd": "unsubscribe",
                    "params": {
                        "channels": ["ticker"],
                        "market_tickers": to_remove,
                    },
                }))
                logger.info("Kalshi WS: unsubscribed from %d tickers", len(to_remove))
            except Exception as exc:
                logger.warning("Kalshi WS: failed to send unsubscribe: %s", exc)

    async def _run(self) -> None:
        """Main loop — connect, message-loop, reconnect on failure with backoff."""
        backoff = 1.0
        while self._running:
            try:
                await self._connect_and_loop()
                backoff = 1.0  # reset on clean exit
            except asyncio.CancelledError:
                break
            except Exception as exc:
                self._connected = False
                if not self._running:
                    break
                logger.warning(
                    "Kalshi WS disconnected: %s — retrying in %.0fs", exc, backoff
                )
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, settings.WS_RECONNECT_MAX_SECONDS)

    def _build_auth_headers(self) -> list[tuple[str, str]]:
        """Build RSA-PSS auth headers for the WS connection (if keys configured)."""
        headers = get_auth_headers(
            settings.KALSHI_API_KEY_ID,
            settings.KALSHI_API_KEY,
            "GET",
            _WS_PATH,
        )
        return list(headers.items()) if headers else []

    async def _connect_and_loop(self) -> None:
        """Establish connection with auth headers, re-subscribe, then pump messages."""
        auth_headers = self._build_auth_headers()
        async with websockets.connect(WS_URL, additional_headers=auth_headers) as ws:
            self._ws = ws
            self._connected = True
            logger.info(
                "Kalshi WS: connected%s",
                " (authenticated)" if auth_headers else " (unauthenticated)",
            )

            # Re-subscribe to all tracked tickers on (re)connect
            if self._subscribed_tickers:
                await ws.send(json.dumps({
                    "id": self._next_id(),
                    "cmd": "subscribe",
                    "params": {
                        "channels": ["ticker"],
                        "market_tickers": list(self._subscribed_tickers),
                    },
                }))
                logger.info(
                    "Kalshi WS: (re)subscribed to %d tickers",
                    len(self._subscribed_tickers),
                )

            try:
                async for raw_msg in ws:
                    await self._handle_message(raw_msg)
            except ConnectionClosed:
                pass
            finally:
                self._connected = False
                self._ws = None

    async def _handle_message(self, raw: str) -> None:
        """Parse Kalshi ticker events and fire the update callback."""
        try:
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type != "ticker":
                return

            data = msg.get("msg") or {}
            ticker = data.get("market_ticker") or data.get("ticker")
            if not ticker:
                return

            # yes_price: last_price → midpoint(yes_bid, yes_ask) → yes_ask alone
            last_price = data.get("last_price") or 0
            yes_ask = data.get("yes_ask") or 0
            yes_bid = data.get("yes_bid") or 0

            if last_price > 0:
                yes_price = max(0.0, min(1.0, float(last_price) / 100.0))
            elif yes_ask > 0 and yes_bid > 0:
                yes_price = max(0.0, min(1.0, (float(yes_ask) + float(yes_bid)) / 200.0))
            else:
                yes_price = max(0.0, min(1.0, float(yes_ask) / 100.0))

            # no_price: no_ask → no_bid → 1 - yes_price
            no_ask = data.get("no_ask") or 0
            no_bid = data.get("no_bid") or 0

            if no_ask > 0:
                no_price = max(0.0, min(1.0, float(no_ask) / 100.0))
            elif no_bid > 0:
                no_price = max(0.0, min(1.0, float(no_bid) / 100.0))
            else:
                no_price = max(0.0, min(1.0, 1.0 - yes_price))

            volume = float(data.get("volume") or 0)

            await self._on_price_update(ticker, yes_price, no_price, volume)

        except (json.JSONDecodeError, KeyError, ValueError, TypeError) as exc:
            logger.debug("Kalshi WS: failed to parse message: %s", exc)
