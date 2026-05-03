from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, get_developer_email, is_developer_user, normalize_developer_username
from app.database import get_db
from app.models import CodingQuestion, MatchHistory, User

router = APIRouter(
    prefix="/user",
    tags=["User"],
)

DEV_STATS = {
    "gamesPlayed": 0,
    "wins": 0,
    "losses": 0,
    "totalPoints": 0,
    "winRate": 0,
    "currentStreak": 0,
    "bestStreak": 0,
    "rank": "Developer",
}


async def _get_user_by_username(db: AsyncSession, username: str) -> User:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


async def _build_rank(db: AsyncSession, user: User) -> str:
    result = await db.execute(
        select(User.id).order_by(desc(User.total_points), desc(User.wins), User.username.asc())
    )
    ordered_ids = result.scalars().all()
    if user.id not in ordered_ids:
        return "Unranked"
    return f"#{ordered_ids.index(user.id) + 1}"


async def _serialize_stats(db: AsyncSession, user: User) -> dict:
    games_played = user.games_played or 0
    win_rate = round((user.wins / games_played) * 100) if games_played else 0
    return {
        "gamesPlayed": games_played,
        "wins": user.wins or 0,
        "losses": user.losses or 0,
        "totalPoints": user.total_points or 0,
        "winRate": win_rate,
        "currentStreak": user.current_streak or 0,
        "bestStreak": user.best_streak or 0,
        "rank": await _build_rank(db, user),
    }


@router.get("/profile")
async def profile(
    current_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if is_developer_user(current_username):
        username = normalize_developer_username(current_username)
        return {
            "username": username,
            "email": get_developer_email(username),
            "createdAt": None,
        }

    user = await _get_user_by_username(db, current_username)
    return {
        "username": user.username,
        "email": user.email,
        "createdAt": user.created_at,
    }


@router.get("/stats")
async def stats(
    current_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if is_developer_user(current_username):
        return DEV_STATS

    user = await _get_user_by_username(db, current_username)
    return await _serialize_stats(db, user)


@router.get("/dashboard")
async def dashboard(
    current_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if is_developer_user(current_username):
        return {
            "stats": DEV_STATS,
            "recentBattles": [],
            "questionCounts": {"easy": 0, "medium": 0, "hard": 0},
        }

    user = await _get_user_by_username(db, current_username)
    stats_payload = await _serialize_stats(db, user)

    history_result = await db.execute(
        select(MatchHistory)
        .where(MatchHistory.user_id == user.id)
        .order_by(MatchHistory.created_at.desc())
        .limit(5)
    )
    matches = history_result.scalars().all()

    questions_result = await db.execute(select(CodingQuestion))
    question_counts = {"easy": 0, "medium": 0, "hard": 0}
    for question in questions_result.scalars().all():
        if question.difficulty in question_counts:
            question_counts[question.difficulty] += 1

    return {
        "stats": stats_payload,
        "recentBattles": [
            {
                "id": match.id,
                "title": match.question_title,
                "difficulty": match.difficulty,
                "result": match.result,
                "score": match.score,
                "playedAt": match.created_at,
            }
            for match in matches
        ],
        "questionCounts": question_counts,
    }
