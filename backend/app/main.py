import os
import logging

from fastapi import FastAPI
from fastapi.routing import APIRoute, APIWebSocketRoute
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .bootstrap import ensure_legacy_schema, seed_questions
from sqlalchemy import select

from .database import AsyncSessionLocal, Base, engine
from .models import CodingQuestion
from .routers import auth
from .routers import leaderboard
from .routers import questions
from .routers import user
from .routers import rooms
from .routers import execution
from .websocket_manager import manager

logger = logging.getLogger(__name__)
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))


def _env_list(name: str, default: list[str]) -> list[str]:
    raw_value = os.getenv(name, "")
    if not raw_value.strip():
        return default
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def route_table(app: FastAPI) -> list[dict]:
    routes = []
    for route in app.routes:
        if isinstance(route, APIWebSocketRoute):
            routes.append({
                "type": "websocket",
                "path": route.path,
                "name": route.name,
                "methods": [],
            })
        elif isinstance(route, APIRoute):
            routes.append({
                "type": "http",
                "path": route.path,
                "name": route.name,
                "methods": sorted(route.methods or []),
            })
    return routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Registered FastAPI routes:")
    for route in route_table(app):
        logger.info("ROUTE type=%s methods=%s path=%s name=%s", route["type"], route["methods"], route["path"], route["name"])
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
# Configure CORS middleware BEFORE including routers (critical for Railway)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_env_list(
        "CORS_ORIGINS",
        [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
    ),
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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/debug/routes")
async def debug_routes():
    return {
        "routes": route_table(app),
        "websockets": [route for route in route_table(app) if route["type"] == "websocket"],
        "active_websockets": manager.snapshot(),
    }


@app.get("/debug/questions")
async def debug_questions():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(CodingQuestion).order_by(CodingQuestion.points.asc(), CodingQuestion.id.asc())
        )
        questions = result.scalars().all()
        sample = [
            {
                "id": question.id,
                "question_text": question.description,
                "option_a": getattr(question, "option_a", None),
                "option_b": getattr(question, "option_b", None),
                "option_c": getattr(question, "option_c", None),
                "option_d": getattr(question, "option_d", None),
                "difficulty": question.difficulty,
            }
            for question in questions[:2]
        ]
        return {
            "count": len(questions),
            "sample": sample,
        }
