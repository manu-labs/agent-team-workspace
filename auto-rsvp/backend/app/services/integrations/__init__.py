"""Platform integration registry.

Import and instantiate all integrations. The rsvp_runner calls
get_integration(url) to find the right handler for a given event URL.
Integrations are checked in priority order; GenericIntegration is the fallback.
"""

from app.services.integrations.base import BaseIntegration, RSVPResult
from app.services.integrations.eventbrite import EventbriteIntegration
from app.services.integrations.generic import GenericIntegration
from app.services.integrations.luma import LumaIntegration
from app.services.integrations.partiful import PartifulIntegration
from app.services.integrations.splashthat import SplashthatIntegration

# Ordered list: specific integrations first, generic fallback last
_INTEGRATIONS: list[BaseIntegration] = [
    EventbriteIntegration(),
    LumaIntegration(),
    SplashthatIntegration(),
    PartifulIntegration(),
]

_GENERIC = GenericIntegration()


async def get_integration(url: str) -> BaseIntegration:
    """Return the integration that handles the given URL.

    Falls back to GenericIntegration if no specific handler matches.
    GenericIntegration.rsvp() returns status="manual_required" when it
    cannot automate the registration.
    """
    for integration in _INTEGRATIONS:
        if await integration.can_handle(url):
            return integration
    return _GENERIC


__all__ = ["BaseIntegration", "RSVPResult", "GenericIntegration", "get_integration"]
