import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .bootstrap import ensure_legacy_schema, seed_questions
from .database import AsyncSessionLocal, Base, engine
from .routers import auth
from .routers import leaderboard
from .routers import questions
from .routers import user
from .routers import rooms
from .routers import execution

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await ensure_legacy_schema(conn)
        await seed_questions(AsyncSessionLocal)
    except Exception:
        logger.exception("Database startup failed; the app will continue, but database functionality may be degraded.")
    yield


app = FastAPI(
    title="Clash of Code API",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(
    auth.router,
    tags=["Authentication"]
)

app.include_router(
    questions.router,
)

app.include_router(
    user.router,
)

app.include_router(
    leaderboard.router,
)

app.include_router(
    rooms.router,
)

app.include_router(
    execution.router,
)

# Test route
@app.get("/")
async def home():
    return {"message": "Clash of Code Runner is running"}
