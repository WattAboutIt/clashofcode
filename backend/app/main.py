from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import engine, Base
from .routers import auth
from .routers import user
from .routers import rooms

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="Clash of Code API",
    lifespan=lifespan
)

# CORS configuration for local frontend development
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    user.router,
)

app.include_router(
    rooms.router,
)

# Test route
@app.get("/")
async def home():
    return {"message": "Clash of Code Backend Running"}