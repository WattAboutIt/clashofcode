from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_developer
from app.database import get_db
from app.models import CodingQuestion
from app.schemas import CodingQuestionCreate, CodingQuestionResponse

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


@router.post(
    "/questions",
    response_model=CodingQuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_question(
    data: CodingQuestionCreate,
    _: str = Depends(get_current_developer),
    db: AsyncSession = Depends(get_db),
):
    question = CodingQuestion(
        title=data.title.strip(),
        difficulty=data.difficulty,
        description=data.description.strip(),
        test_cases=[case.model_dump() for case in data.test_cases],
        examples=[example.model_dump() for example in data.examples],
        constraints=data.constraints.strip() if data.constraints else None,
        points=data.points,
        starter_code=data.starter_code,
    )

    db.add(question)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A question with this title already exists.",
        ) from exc

    await db.refresh(question)
    return question
