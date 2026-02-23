from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import events, rsvps, users

app = FastAPI(
    title="Auto-RSVP",
    description="Automatic event discovery and RSVP for Austin events",
    version="0.1.0",
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


@app.get("/health")
async def health_check():
    return {"status": "ok"}
