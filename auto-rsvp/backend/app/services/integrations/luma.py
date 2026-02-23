"""Lu.ma RSVP integration.

Implementation in #152.
"""

from app.services.integrations.base import BaseIntegration


class LumaIntegration(BaseIntegration):
    async def rsvp(self, rsvp_url: str, user_email: str, user_name: str) -> bool:
        raise NotImplementedError("Lu.ma integration not yet implemented — see #152")

    async def check_availability(self, rsvp_url: str) -> bool:
        raise NotImplementedError("Lu.ma integration not yet implemented — see #152")
