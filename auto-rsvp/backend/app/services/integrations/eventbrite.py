"""Eventbrite RSVP integration via REST API.

Handles free event registration through the Eventbrite v3 API.
Detects Eventbrite URLs across all regional TLDs, extracts event IDs,
checks ticket availability, and creates orders for free events.
"""

import re

import httpx

from app.config import settings
from app.services.integrations.base import BaseIntegration, RSVPResult

# Matches eventbrite URLs across all TLDs. The event ID is the trailing
# numeric segment: e.g. https://www.eventbrite.com/e/my-event-123456789
_EVENTBRITE_PATTERN = re.compile(
    r"https?://(?:www\.)?eventbrite\.[a-z.]+/e/\S*?(\d+)(?:\?|$)"
)

_API_BASE = "https://www.eventbriteapi.com/v3"
_DEFAULT_TIMEOUT = 15.0


class EventbriteIntegration(BaseIntegration):
    def __init__(self) -> None:
        self._api_key = settings.EVENTBRITE_API_KEY

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._api_key}"}

    # ── URL handling ──────────────────────────────────────────────────────

    async def can_handle(self, url: str) -> bool:
        return bool(_EVENTBRITE_PATTERN.search(url))

    @staticmethod
    def extract_event_id(url: str) -> str | None:
        match = _EVENTBRITE_PATTERN.search(url)
        return match.group(1) if match else None

    # ── Event details ─────────────────────────────────────────────────────

    async def get_event_details(self, event_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{_API_BASE}/events/{event_id}/",
                headers=self._headers(),
                timeout=_DEFAULT_TIMEOUT,
            )
            resp.raise_for_status()
            return resp.json()

    async def _get_free_ticket_class(self, event_id: str) -> dict | None:
        """Find an available free ticket class for the event."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{_API_BASE}/events/{event_id}/ticket_classes/",
                headers=self._headers(),
                timeout=_DEFAULT_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()

        for tc in data.get("ticket_classes", []):
            is_free = tc.get("free", False) or tc.get("cost") is None
            has_capacity = tc.get("on_sale_status") != "SOLD_OUT"
            if is_free and has_capacity:
                return tc
        return None

    # ── RSVP ──────────────────────────────────────────────────────────────

    async def rsvp(
        self,
        url: str,
        user_email: str,
        user_first_name: str,
        user_last_name: str,
    ) -> RSVPResult:
        event_id = self.extract_event_id(url)
        if not event_id:
            return RSVPResult(
                success=False,
                status="failed",
                message=f"Could not extract Eventbrite event ID from URL: {url}",
            )

        if not self._api_key:
            return RSVPResult(
                success=False,
                status="failed",
                message="EVENTBRITE_API_KEY not configured",
            )

        try:
            return await self._do_rsvp(event_id, user_email, user_first_name, user_last_name)
        except httpx.HTTPStatusError as exc:
            return RSVPResult(
                success=False,
                status="failed",
                message=f"Eventbrite API HTTP error: {exc.response.status_code}",
            )
        except httpx.RequestError as exc:
            return RSVPResult(
                success=False,
                status="failed",
                message=f"Network error contacting Eventbrite: {exc}",
            )

    async def _do_rsvp(
        self,
        event_id: str,
        user_email: str,
        user_first_name: str,
        user_last_name: str,
    ) -> RSVPResult:
        # 1. Fetch event details
        event = await self.get_event_details(event_id)
        event_name = event.get("name", {}).get("text", "Unknown event")

        # 2. Check if free
        if not event.get("is_free", False):
            return RSVPResult(
                success=False,
                status="paid_event",
                message=f"Event is paid — skipping: {event_name}",
            )

        # 3. Check capacity
        ticket_class = await self._get_free_ticket_class(event_id)
        if not ticket_class:
            return RSVPResult(
                success=False,
                status="event_full",
                message=f"No free tickets available for: {event_name}",
            )

        # 4. Create the order (register)
        order_payload = {
            "attendees": [
                {
                    "profile": {
                        "email": user_email,
                        "first_name": user_first_name,
                        "last_name": user_last_name,
                    },
                    "ticket_class_id": ticket_class["id"],
                    "quantity": 1,
                }
            ],
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{_API_BASE}/events/{event_id}/orders/",
                headers=self._headers(),
                json=order_payload,
                timeout=30.0,
            )

        if resp.status_code in (200, 201):
            order_data = resp.json()
            return RSVPResult(
                success=True,
                status="success",
                message=f"Registered for: {event_name}",
                confirmation_url=order_data.get("resource_uri"),
            )

        # Parse error response
        try:
            error_data = resp.json()
            error_msg = error_data.get("error_description", resp.text)
        except Exception:
            error_msg = resp.text

        if "already" in error_msg.lower() or "duplicate" in error_msg.lower():
            return RSVPResult(
                success=False,
                status="already_registered",
                message=f"Already registered for: {event_name}",
            )

        return RSVPResult(
            success=False,
            status="failed",
            message=f"Eventbrite registration failed ({resp.status_code}): {error_msg}",
        )

    # ── Availability check ────────────────────────────────────────────────

    async def check_availability(self, url: str) -> bool:
        event_id = self.extract_event_id(url)
        if not event_id:
            return False
        try:
            ticket_class = await self._get_free_ticket_class(event_id)
            return ticket_class is not None
        except Exception:
            return False
