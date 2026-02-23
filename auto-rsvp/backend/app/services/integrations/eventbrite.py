"""Eventbrite RSVP integration via REST API.

Implementation in #151.
"""

from app.services.integrations.base import BaseIntegration


class EventbriteIntegration(BaseIntegration):
    async def rsvp(self, rsvp_url: str, user_email: str, user_name: str) -> bool:
        raise NotImplementedError("Eventbrite integration not yet implemented — see #151")

    async def check_availability(self, rsvp_url: str) -> bool:
        raise NotImplementedError("Eventbrite integration not yet implemented — see #151")
