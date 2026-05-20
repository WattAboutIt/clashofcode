import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
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


# Allow a simple hard override for demo/testing: set MAIN_DATABASE_URL to a full SQLAlchemy URL
# Example: export MAIN_DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/dbname"
MAIN_DATABASE_URL = os.getenv("MAIN_DATABASE_URL")
# For manual editing, follow the example below:
# Local Postgres: "postgresql+asyncpg://user:pass@127.0.0.1:5432/dbname"
# Railway: "postgresql+asyncpg://user:pass@xxx.railway.app:5432/dbname"
HARDCODED_DATABASE_URL = None  # <- Edit this value directly to switch DB

if HARDCODED_DATABASE_URL:
    DATABASE_URL = HARDCODED_DATABASE_URL
elif MAIN_DATABASE_URL:
    DATABASE_URL = MAIN_DATABASE_URL
else:
    DATABASE_URL = normalize_database_url(os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
)

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
