import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_db, init_db
from app.routers import markets, matches
from app.routers.poll import router as poll_router
from app.routers.ws import manager as client_ws_manager
from app.routers.ws import router as ws_router
from app.services import poller, ws_manager

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Register client WS broadcast before starting ws_manager
    ws_manager.register_broadcast(client_ws_manager.broadcast)
    await poller.start()
    await ws_manager.start()
    yield
    await ws_manager.stop()
    await poller.stop()
    await close_db()


app = FastAPI(
    title="Arb Scanner",
    description="Prediction market arbitrage scanner - Polymarket vs Kalshi",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

origins = json.loads(settings.CORS_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(markets.router, prefix="/api/v1")
app.include_router(matches.router, prefix="/api/v1")
app.include_router(poll_router, prefix="/api/v1")
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
