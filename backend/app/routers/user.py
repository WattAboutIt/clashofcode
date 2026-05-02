from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User
from app.auth import get_current_user

router = APIRouter(
    prefix="/user",
    tags=["User"],
)

@router.get("/profile")
async def profile(
    current_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.username == current_username)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {
        "username": user.username,
        "email": user.email,
    }

@router.get("/stats")
async def stats(
    current_username: str = Depends(get_current_user),
):
    # TODO: replace with real game stats storage when ready
    return {
        "gamesPlayed": 0,
        "wins": 0,
        "losses": 0,
        "rank": "Unranked",
    }
