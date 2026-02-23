"""AI-powered event matching — scores events against user preferences using Claude.

Implementation in #150.
"""


async def match_events(user_id: str, event_ids: list[str]) -> dict[str, float]:
    """Return {event_id: match_score} for the given user and events.

    match_score is a float from 0.0 (no match) to 1.0 (perfect match).
    """
    raise NotImplementedError("Event matching not yet implemented — see #150")
