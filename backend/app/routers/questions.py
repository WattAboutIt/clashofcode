from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import CodingQuestion
from app.schemas import CodingQuestionResponse

router = APIRouter(tags=["Questions"])

VALID_LEVELS = {"easy", "medium", "hard"}


@router.get("/questions", response_model=list[CodingQuestionResponse])
async def list_questions(
    level: str | None = Query(default=None, alias="level"),
    db: AsyncSession = Depends(get_db),
):
    query = select(CodingQuestion).order_by(CodingQuestion.points.asc(), CodingQuestion.id.asc())

    if level:
        normalized_level = level.lower()
        if normalized_level not in VALID_LEVELS:
            raise HTTPException(status_code=400, detail="Invalid difficulty level.")
        query = query.where(CodingQuestion.difficulty == normalized_level)

    result = await db.execute(query)
    return result.scalars().all()
