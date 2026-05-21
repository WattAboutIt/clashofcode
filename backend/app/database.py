import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from dotenv import load_dotenv
from pathlib import Path
import logging


env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)
load_dotenv()

logger = logging.getLogger(__name__)

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

# Choose DATABASE_URL deterministically — do not run async checks at import time.
if HARDCODED_DATABASE_URL:
    DATABASE_URL = HARDCODED_DATABASE_URL
elif RAILWAY_DATABASE_URL:
    try:
        DATABASE_URL = normalize_database_url(RAILWAY_DATABASE_URL)
    except Exception:
        DATABASE_URL = None
elif MAIN_DATABASE_URL:
    try:
        DATABASE_URL = normalize_database_url(MAIN_DATABASE_URL)
    except Exception:
        DATABASE_URL = None
else:
    try:
        DATABASE_URL = normalize_database_url(os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))
    except Exception:
        DATABASE_URL = DEFAULT_DATABASE_URL

if not DATABASE_URL:
    DATABASE_URL = DEFAULT_DATABASE_URL

logger.info("Selected DATABASE_URL: %s", DATABASE_URL if DATABASE_URL else "<default sqlite>")

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
