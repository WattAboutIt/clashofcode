import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv
from pathlib import Path


env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)
load_dotenv()

DEFAULT_DATABASE_URL = "sqlite+aiosqlite:///./clashofcode.db"


def normalize_database_url(url: str | None) -> str:
    if not url:
        raise ValueError("DATABASE_URL is not set")

    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://"):]
    return url


# Environment precedence: RAILWAY_DATABASE_URL -> MAIN_DATABASE_URL -> DATABASE_URL -> DEFAULT (sqlite)
RAILWAY_DATABASE_URL = os.getenv("RAILWAY_DATABASE_URL")
MAIN_DATABASE_URL = os.getenv("MAIN_DATABASE_URL")
HARDCODED_DATABASE_URL = None  # <- Edit this value directly to switch DB when debugging


async def _test_connect(url: str) -> bool:
    try:
        engine = create_async_engine(url, echo=False)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await engine.dispose()
        return True
    except Exception:
        return False


# Build candidate list
candidates: list[str] = []
if HARDCODED_DATABASE_URL:
    candidates.append(HARDCODED_DATABASE_URL)
if RAILWAY_DATABASE_URL:
    try:
        candidates.append(normalize_database_url(RAILWAY_DATABASE_URL))
    except Exception:
        pass
if MAIN_DATABASE_URL:
    try:
        candidates.append(normalize_database_url(MAIN_DATABASE_URL))
    except Exception:
        pass
env_db = os.getenv("DATABASE_URL")
if env_db:
    try:
        candidates.append(normalize_database_url(env_db))
    except Exception:
        pass

# always consider default sqlite as last resort
candidates.append(DEFAULT_DATABASE_URL)


DATABASE_URL = None
engine = None

# Try candidates in order and pick first that successfully connects.
for candidate in candidates:
    try:
        norm = normalize_database_url(candidate)
    except Exception:
        continue
    # Attempt a short async connection test
    try:
        ok = asyncio.get_event_loop().run_until_complete(_test_connect(norm))
    except RuntimeError:
        # No running loop — create a new temporary loop
        loop = asyncio.new_event_loop()
        try:
            ok = loop.run_until_complete(_test_connect(norm))
        finally:
            loop.close()

    if ok:
        DATABASE_URL = norm
        engine = create_async_engine(DATABASE_URL, echo=True)
        break

if engine is None:
    # fallback: use sqlite default
    DATABASE_URL = DEFAULT_DATABASE_URL
    engine = create_async_engine(DATABASE_URL, echo=True)


AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
