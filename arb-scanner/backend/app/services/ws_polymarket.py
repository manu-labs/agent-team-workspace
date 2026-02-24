"""Polymarket WebSocket client — real-time price streaming via CLOB WS API.

Subscribes to YES-side CLOB token IDs and fires an async callback on each
price_change or last_trade_price event.

Protocol notes:
  - Messages arrive as JSON arrays of event objects
  - Application-level heartbeat: send text "PING" every 10s, server replies "PONG"
  - Initial subscribe: {"assets_ids": [...], "type": "market"}
  - Dynamic sub/unsub: add "operation": "subscribe" | "unsubscribe"
"""

import asyncio
import json
import logging
from typing import Awaitable, Callable

import websockets
from websockets.exceptions import ConnectionClosed

from app.config import settings

logger = logging.getLogger(__name__)

WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market"
_HEARTBEAT_INTERVAL = 10  # seconds


class PolymarketWSClient:
    """Polymarket CLOB WebSocket client with auto-reconnect and subscription management."""

    def __init__(self, on_price_update: Callable[[str, float, float, float], Awaitable[None]]):
        """
        Args:
            on_price_update: async callback(token_id, yes_price, no_price, volume)
        """
        self._on_price_update = on_price_update
        self._subscribed_tokens: set[str] = set()
        self._ws = None
        self._running = False
        self._connected = False
        self._task: asyncio.Task | None = None

    @property
    def connected(self) -> bool:
        return self._connected

    async def start(self) -> None:
        """Start the WS client as a background task."""
        self._running = True
        self._task = asyncio.create_task(self._run(), name="poly-ws")

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

    async def subscribe(self, token_ids: list[str]) -> None:
        """Subscribe to price updates for the given CLOB token IDs."""
        new = [t for t in token_ids if t not in self._subscribed_tokens]
        if not new:
            return
        self._subscribed_tokens.update(new)
        if self._ws and self._connected:
            try:
                await self._ws.send(json.dumps({
                    "assets_ids": new,
                    "type": "market",
                    "operation": "subscribe",
                }))
                logger.info("Polymarket WS: subscribed to %d new tokens", len(new))
            except Exception as exc:
                logger.warning("Polymarket WS: failed to send subscribe: %s", exc)

    async def unsubscribe(self, token_ids: list[str]) -> None:
        """Unsubscribe from price updates for the given CLOB token IDs."""
        to_remove = [t for t in token_ids if t in self._subscribed_tokens]
        if not to_remove:
            return
        for t in to_remove:
            self._subscribed_tokens.discard(t)
        if self._ws and self._connected:
            try:
                await self._ws.send(json.dumps({
                    "assets_ids": to_remove,
                    "type": "market",
                    "operation": "unsubscribe",
                }))
                logger.info("Polymarket WS: unsubscribed from %d tokens", len(to_remove))
            except Exception as exc:
                logger.warning("Polymarket WS: failed to send unsubscribe: %s", exc)

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
                    "Polymarket WS disconnected: %s — retrying in %.0fs", exc, backoff
                )
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, settings.WS_RECONNECT_MAX_SECONDS)

    async def _connect_and_loop(self) -> None:
        """Establish connection, re-subscribe, then pump messages until disconnect."""
        async with websockets.connect(WS_URL) as ws:
            self._ws = ws
            self._connected = True
            logger.info("Polymarket WS: connected")

            # Re-subscribe to all tracked tokens on (re)connect
            if self._subscribed_tokens:
                await ws.send(json.dumps({
                    "assets_ids": list(self._subscribed_tokens),
                    "type": "market",
                }))
                logger.info(
                    "Polymarket WS: (re)subscribed to %d tokens",
                    len(self._subscribed_tokens),
                )

            heartbeat_task = asyncio.create_task(self._heartbeat_loop(ws))
            try:
                async for raw_msg in ws:
                    if raw_msg == "PONG":
                        continue
                    await self._handle_message(raw_msg)
            except ConnectionClosed:
                pass
            finally:
                heartbeat_task.cancel()
                self._connected = False
                self._ws = None

    async def _heartbeat_loop(self, ws) -> None:
        """Send application-level PING every 10s to keep the connection alive."""
        while True:
            await asyncio.sleep(_HEARTBEAT_INTERVAL)
            try:
                await ws.send("PING")
            except Exception:
                break

    async def _handle_message(self, raw: str) -> None:
        """Parse Polymarket price events and fire the update callback."""
        try:
            events = json.loads(raw)
            if not isinstance(events, list):
                events = [events]

            for event in events:
                event_type = event.get("event_type") or event.get("type")
                if event_type not in ("price_change", "last_trade_price"):
                    continue

                asset_id = event.get("asset_id") or event.get("market")
                if not asset_id:
                    continue

                price_raw = event.get("price")
                if price_raw is None:
                    continue

                yes_price = max(0.0, min(1.0, float(price_raw)))
                no_price = round(1.0 - yes_price, 6)
                volume = float(event.get("volume") or 0)

                await self._on_price_update(asset_id, yes_price, no_price, volume)

        except (json.JSONDecodeError, KeyError, ValueError, TypeError) as exc:
            logger.debug("Polymarket WS: failed to parse message: %s", exc)
