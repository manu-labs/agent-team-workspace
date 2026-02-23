"""Job runner endpoints — manual trigger and status."""

from fastapi import APIRouter, BackgroundTasks

from app.tasks.rsvp_runner import get_job_status, run_pipeline

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/run")
async def trigger_pipeline(background_tasks: BackgroundTasks):
    """Trigger the full auto-RSVP pipeline (scrape -> match -> RSVP).

    Runs in the background. Check /api/v1/jobs/status for results.
    """
    status = get_job_status()
    if status["running"]:
        return {"message": "Pipeline is already running", "status": status}

    background_tasks.add_task(run_pipeline)
    return {"message": "Pipeline started", "status": status}


@router.get("/status")
async def pipeline_status():
    """Get the current job runner status and last run results."""
    return get_job_status()
