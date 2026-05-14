from __future__ import annotations

import argparse
import asyncio
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import create_async_engine

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from app.bootstrap import ensure_legacy_schema  # noqa: E402
from app.database import normalize_database_url  # noqa: E402
from app.models import Base, CodingQuestion, MatchHistory, User  # noqa: E402


TABLES = [User.__table__, CodingQuestion.__table__, MatchHistory.__table__]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copy local clashofcode.db rows into a PostgreSQL database."
    )
    parser.add_argument(
        "--sqlite-path",
        default=str(ROOT_DIR / "clashofcode.db"),
        help="Path to the source SQLite database.",
    )
    parser.add_argument(
        "--target-database-url",
        default=(
            os.getenv("RAILWAY_DATABASE_URL")
            or os.getenv("TARGET_DATABASE_URL")
            or os.getenv("POSTGRES_DATABASE_URL")
        ),
        help=(
            "Railway/PostgreSQL URL. You can also set RAILWAY_DATABASE_URL, "
            "TARGET_DATABASE_URL, or POSTGRES_DATABASE_URL."
        ),
    )
    return parser.parse_args()


def read_rows(sqlite_path: Path, table_name: str) -> list[dict[str, Any]]:
    with sqlite3.connect(sqlite_path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(f'SELECT * FROM "{table_name}" ORDER BY id').fetchall()
        return [dict(row) for row in rows]


async def upsert_rows(conn, table, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return

    statement = insert(table).values(rows)
    update_columns = {
        column.name: statement.excluded[column.name]
        for column in table.columns
        if not column.primary_key
    }
    statement = statement.on_conflict_do_update(
        index_elements=["id"],
        set_=update_columns,
    )
    await conn.execute(statement)


async def reset_sequence(conn, table_name: str, id_column: str = "id") -> None:
    await conn.execute(
        text(
            """
            SELECT setval(
                pg_get_serial_sequence(:table_name, :id_column),
                COALESCE((SELECT MAX(id) FROM "{table_name}"), 1),
                (SELECT COUNT(*) > 0 FROM "{table_name}")
            )
            """.format(table_name=table_name)
        ),
        {"table_name": table_name, "id_column": id_column},
    )


async def migrate(sqlite_path: Path, target_database_url: str) -> None:
    if not sqlite_path.exists():
        raise FileNotFoundError(f"SQLite database not found: {sqlite_path}")

    target_database_url = normalize_database_url(target_database_url)
    if not target_database_url.startswith("postgresql+asyncpg://"):
        raise ValueError("Target database URL must be a PostgreSQL async URL.")

    engine = create_async_engine(target_database_url, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await ensure_legacy_schema(conn)

        for table in TABLES:
            rows = read_rows(sqlite_path, table.name)
            await upsert_rows(conn, table, rows)
            print(f"Copied {len(rows)} rows into {table.name}.")

        for table in TABLES:
            await reset_sequence(conn, table.name)

    await engine.dispose()


async def main() -> None:
    load_dotenv(ROOT_DIR / ".env")
    load_dotenv()
    args = parse_args()

    if not args.target_database_url:
        raise ValueError(
            "Set RAILWAY_DATABASE_URL/TARGET_DATABASE_URL/POSTGRES_DATABASE_URL "
            "or pass --target-database-url."
        )

    await migrate(Path(args.sqlite_path), args.target_database_url)


if __name__ == "__main__":
    asyncio.run(main())
