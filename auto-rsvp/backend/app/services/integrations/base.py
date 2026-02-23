"""Base interface for RSVP platform integrations."""

from abc import ABC, abstractmethod


class BaseIntegration(ABC):
    """Abstract base for all RSVP platform handlers."""

    @abstractmethod
    async def rsvp(self, rsvp_url: str, user_email: str, user_name: str) -> bool:
        """Attempt to RSVP on the platform. Returns True on success."""
        ...

    @abstractmethod
    async def check_availability(self, rsvp_url: str) -> bool:
        """Check if the event still has capacity."""
        ...
