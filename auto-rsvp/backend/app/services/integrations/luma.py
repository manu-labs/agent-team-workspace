"""Lu.ma RSVP integration.

Implementation in #152.
"""

from app.services.integrations.base import BaseIntegration, RSVPResult


class LumaIntegration(BaseIntegration):
    async def can_handle(self, url: str) -> bool:
        return "lu.ma/" in url

    async def rsvp(
        self,
        url: str,
        user_email: str,
        user_first_name: str,
        user_last_name: str,
    ) -> RSVPResult:
        raise NotImplementedError("Lu.ma integration not yet implemented — see #152")

    async def check_availability(self, url: str) -> bool:
        raise NotImplementedError("Lu.ma integration not yet implemented — see #152")
