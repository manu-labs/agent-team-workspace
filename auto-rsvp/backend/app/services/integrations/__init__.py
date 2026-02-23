"""Platform integration registry.

Import and instantiate all integrations here. The rsvp_runner uses
get_integration(url) to find the right handler for a given event URL.
"""

from app.services.integrations.base import BaseIntegration, RSVPResult
from app.services.integrations.eventbrite import EventbriteIntegration
from app.services.integrations.luma import LumaIntegration

_INTEGRATIONS: list[BaseIntegration] = [
    EventbriteIntegration(),
    LumaIntegration(),
]


async def get_integration(url: str) -> BaseIntegration | None:
    """Return the first integration that can handle the given URL, or None."""
    for integration in _INTEGRATIONS:
        if await integration.can_handle(url):
            return integration
    return None


__all__ = ["BaseIntegration", "RSVPResult", "get_integration"]
