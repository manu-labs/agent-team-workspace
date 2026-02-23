"""Background job runner: scrape -> match -> RSVP pipeline.

Implementation in #153.
"""


async def run_rsvp_pipeline() -> None:
    """Execute the full auto-RSVP pipeline.

    1. Scrape events from rsvpatx.com
    2. Match events to user preferences via AI
    3. Auto-RSVP to top matches on supported platforms
    """
    raise NotImplementedError("RSVP pipeline not yet implemented — see #153")
