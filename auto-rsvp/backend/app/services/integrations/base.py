"""Base interface for RSVP platform integrations."""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class RSVPResult:
    """Structured result from an RSVP attempt."""

    success: bool
    status: str  # success, failed, already_registered, event_full, paid_event, manual_required
    message: str
    confirmation_url: str | None = None


class BaseIntegration(ABC):
    """Abstract base for all RSVP platform handlers."""

    @abstractmethod
    async def can_handle(self, url: str) -> bool:
        """Return True if this integration can handle the given event URL."""
        ...

    @abstractmethod
    async def rsvp(
        self,
        url: str,
        user_email: str,
        user_first_name: str,
        user_last_name: str,
    ) -> RSVPResult:
        """Attempt to RSVP the user for the event at the given URL."""
        ...

    async def check_availability(self, url: str) -> bool:
        """Check if the event still has capacity. Default: assume available."""
        return True
