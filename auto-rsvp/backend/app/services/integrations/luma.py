"""Lu.ma RSVP integration via the Lu.ma public API.

Lu.ma events use lu.ma/{event-slug} URLs. Registration is done via their
/api/event/register endpoint with the user's email and name.
"""

import logging

import httpx

from app.config import settings
from app.services.integrations.base import BaseIntegration, RSVPResult

logger = logging.getLogger(__name__)

_API_BASE = "https://api.lu.ma/public/v1"
_TIMEOUT = 15.0


class LumaIntegration(BaseIntegration):
    def __init__(self) -> None:
        self._api_key = settings.LUMA_API_KEY

    def _headers(self) -> dict[str, str]:
        return {
            "x-luma-api-key": self._api_key,
            "Content-Type": "application/json",
        }

    # ── URL handling ──────────────────────────────────────────────────────

    async def can_handle(self, url: str) -> bool:
        return "lu.ma/" in url.lower()

    @staticmethod
    def _extract_event_slug(url: str) -> str | None:
        """Extract the event slug from a lu.ma URL.

        e.g. https://lu.ma/technight → "technight"
             https://lu.ma/evt-AbCdEf12 → "evt-AbCdEf12"
        """
        try:
            path = url.split("lu.ma/", 1)[1].split("?")[0].split("#")[0].strip("/")
            return path if path else None
        except (IndexError, AttributeError):
            return None

    # ── RSVP ──────────────────────────────────────────────────────────────

    async def rsvp(
        self,
        url: str,
        user_email: str,
        user_first_name: str,
        user_last_name: str,
    ) -> RSVPResult:
        if not self._api_key:
            return RSVPResult(
                success=False,
                status="failed",
                message="LUMA_API_KEY not configured",
            )

        slug = self._extract_event_slug(url)
        if not slug:
            return RSVPResult(
                success=False,
                status="failed",
                message=f"Could not extract Lu.ma event slug from URL: {url}",
            )

        try:
            return await self._do_rsvp(slug, url, user_email, user_first_name, user_last_name)
        except httpx.HTTPStatusError as exc:
            return self._handle_http_error(exc, url)
        except httpx.RequestError as exc:
            return RSVPResult(
                success=False,
                status="failed",
                message=f"Network error contacting Lu.ma: {exc}",
            )

    async def _do_rsvp(
        self,
        slug: str,
        url: str,
        user_email: str,
        user_first_name: str,
        user_last_name: str,
    ) -> RSVPResult:
        # 1. Look up the event to get its API ID and verify it exists
        async with httpx.AsyncClient() as client:
            event_resp = await client.get(
                f"{_API_BASE}/event/get",
                params={"event_slug_or_api_id": slug},
                headers=self._headers(),
                timeout=_TIMEOUT,
            )
            event_resp.raise_for_status()

        event_data = event_resp.json()
        event = event_data.get("event", {})
        event_api_id = event.get("api_id")
        event_name = event.get("name", slug)

        if not event_api_id:
            return RSVPResult(
                success=False,
                status="failed",
                message=f"Could not resolve Lu.ma event API ID for: {url}",
            )

        # 2. Register for the event
        payload = {
            "event_api_id": event_api_id,
            "email": user_email,
            "name": f"{user_first_name} {user_last_name}".strip(),
        }

        async with httpx.AsyncClient() as client:
            reg_resp = await client.post(
                f"{_API_BASE}/event/register",
                json=payload,
                headers=self._headers(),
                timeout=_TIMEOUT,
            )

        if reg_resp.status_code in (200, 201):
            reg_data = reg_resp.json()
            return RSVPResult(
                success=True,
                status="success",
                message=f"Registered for Lu.ma event: {event_name}",
                confirmation_url=reg_data.get("calendar_event_url") or url,
            )

        return self._handle_http_error_response(reg_resp, event_name)

    @staticmethod
    def _handle_http_error(exc: httpx.HTTPStatusError, url: str) -> RSVPResult:
        code = exc.response.status_code
        try:
            body = exc.response.json()
            msg = body.get("message") or body.get("error") or exc.response.text
        except Exception:
            msg = exc.response.text

        if code == 404:
            return RSVPResult(success=False, status="failed", message=f"Event not found at: {url}")
        if code == 409 or "already" in msg.lower():
            return RSVPResult(success=False, status="already_registered", message=f"Already registered: {msg}")
        if code == 403 or "full" in msg.lower() or "capacity" in msg.lower() or "sold" in msg.lower():
            return RSVPResult(success=False, status="event_full", message=f"Event full: {msg}")
        return RSVPResult(success=False, status="failed", message=f"Lu.ma API error ({code}): {msg}")

    @staticmethod
    def _handle_http_error_response(resp: httpx.Response, event_name: str) -> RSVPResult:
        try:
            body = resp.json()
            msg = body.get("message") or body.get("error") or resp.text
        except Exception:
            msg = resp.text

        if "already" in msg.lower():
            return RSVPResult(success=False, status="already_registered", message=f"Already registered: {event_name}")
        if "full" in msg.lower() or "capacity" in msg.lower() or "sold" in msg.lower():
            return RSVPResult(success=False, status="event_full", message=f"Event full: {event_name}")
        return RSVPResult(
            success=False,
            status="failed",
            message=f"Lu.ma registration failed ({resp.status_code}): {msg}",
        )

    # ── Availability check ────────────────────────────────────────────────

    async def check_availability(self, url: str) -> bool:
        slug = self._extract_event_slug(url)
        if not slug or not self._api_key:
            return True  # assume available if we can't check

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{_API_BASE}/event/get",
                    params={"event_slug_or_api_id": slug},
                    headers=self._headers(),
                    timeout=_TIMEOUT,
                )
                resp.raise_for_status()
                event = resp.json().get("event", {})
                # Lu.ma marks sold-out events with a cover_url or registration_questions
                # but the clearest signal is the ticket_info if present
                ticket_info = event.get("ticket_info", {})
                if ticket_info:
                    return not ticket_info.get("is_sold_out", False)
                return True
        except Exception as exc:
            logger.warning("Lu.ma availability check failed for %s: %s", url, exc)
            return True  # fail open
