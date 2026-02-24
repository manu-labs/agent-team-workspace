"""Client-facing WebSocket endpoint for real-time price updates.

Frontend clients connect to /ws, then send subscribe/unsubscribe messages
with match IDs. The server pushes price_update messages whenever the
upstream platform WebSockets deliver new data via ws_manager.

Client → Server:
  {"action": "subscribe", "match_ids": [834, 820, 831]}
  {"action": "unsubscribe", "match_ids": [834]}

Server → Client:
  {"type": "price_update", "match_id": 834, "poly_yes": 0.0245,
   "poly_no": 0.9755, "kalshi_yes": 0.04, "kalshi_no": 0.96,
   "spread": 0.015, "fee_adjusted_spread": 0.012,
   "last_updated": "2026-02-24T20:44:40+00:00"}
"""

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()
logger = logging.getLogger(__name__)


class _ConnectionManager:
    """Tracks connected frontend clients and their match subscriptions."""

    def __init__(self) -> None:
        # ws → set of match_ids this client is subscribed to
        self._connections: dict[WebSocket, set[int]] = {}
        # match_id → set of ws clients watching this match
        self._match_subscribers: dict[int, set[WebSocket]] = {}

    @property
    def client_count(self) -> int:
        return len(self._connections)

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[ws] = set()
        logger.info("Client WS: new connection (%d total)", len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        match_ids = self._connections.pop(ws, set())
        for mid in match_ids:
            subs = self._match_subscribers.get(mid)
            if subs:
                subs.discard(ws)
                if not subs:
                    del self._match_subscribers[mid]
        logger.info("Client WS: disconnected (%d remaining)", len(self._connections))

    def subscribe(self, ws: WebSocket, match_ids: list[int]) -> None:
        current = self._connections.get(ws)
        if current is None:
            return
        for mid in match_ids:
            current.add(mid)
            self._match_subscribers.setdefault(mid, set()).add(ws)

    def unsubscribe(self, ws: WebSocket, match_ids: list[int]) -> None:
        current = self._connections.get(ws)
        if current is None:
            return
        for mid in match_ids:
            current.discard(mid)
            subs = self._match_subscribers.get(mid)
            if subs:
                subs.discard(ws)
                if not subs:
                    del self._match_subscribers[mid]

    async def broadcast(self, match_id: int, data: dict) -> None:
        """Send a price update to all clients subscribed to this match."""
        subs = self._match_subscribers.get(match_id)
        if not subs:
            return
        dead: list[WebSocket] = []
        msg = json.dumps(data)
        for ws in subs:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = _ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    """Client-facing WebSocket — subscribe to match price updates."""
    await manager.connect(ws)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "invalid JSON"})
                continue

            action = msg.get("action")
            match_ids = msg.get("match_ids")

            if not isinstance(match_ids, list):
                await ws.send_json({"type": "error", "message": "match_ids must be a list"})
                continue

            # Coerce to ints, skip invalid
            int_ids = []
            for mid in match_ids:
                try:
                    int_ids.append(int(mid))
                except (ValueError, TypeError):
                    pass

            if action == "subscribe":
                manager.subscribe(ws, int_ids)
                await ws.send_json({
                    "type": "subscribed",
                    "match_ids": int_ids,
                })
            elif action == "unsubscribe":
                manager.unsubscribe(ws, int_ids)
                await ws.send_json({
                    "type": "unsubscribed",
                    "match_ids": int_ids,
                })
            else:
                await ws.send_json({
                    "type": "error",
                    "message": f"unknown action: {action}",
                })
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("Client WS error: %s", exc)
    finally:
        manager.disconnect(ws)
