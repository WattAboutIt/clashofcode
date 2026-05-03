from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User

router = APIRouter(tags=["Leaderboard"])


@router.get("/leaderboard")
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).order_by(desc(User.total_points), desc(User.wins), User.username.asc())
    )
    players = result.scalars().all()

    leaderboard = []
    for index, player in enumerate(players, start=1):
        games_played = player.games_played or 0
        win_rate = round((player.wins / games_played) * 100) if games_played else 0
        leaderboard.append(
            {
                "rank": index,
                "username": player.username,
                "totalPoints": player.total_points,
                "wins": player.wins,
                "losses": player.losses,
                "winRate": win_rate,
                "bestStreak": player.best_streak,
            }
        )

    return {"players": leaderboard}
