from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.routers import events, jobs, match, rsvps, users

app = FastAPI(
    title="Auto-RSVP",
    description="Automatic event discovery and RSVP for Austin events",
    version="0.1.0",
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/v1")
app.include_router(events.router, prefix="/api/v1")
app.include_router(rsvps.router, prefix="/api/v1")
app.include_router(match.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# Serve Next.js frontend static export — must be last (after all API routes)
_frontend_static = "/app/static/frontend"
if os.path.exists(_frontend_static):
    app.mount("/", StaticFiles(directory=_frontend_static, html=True), name="frontend")
