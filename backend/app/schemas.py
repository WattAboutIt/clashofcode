from datetime import datetime
from typing import Any
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class LoginSchema(BaseModel):
    username: str
    password: str

class DeveloperLoginSchema(BaseModel):
    username: str


class QuestionExample(BaseModel):
    input: str
    output: str
    explanation: str | None = None


class TestCase(BaseModel):
    """
    Matches the DB JSON format exactly:
      { "input": { "nums": [2,7], "target": 9 }, "expected": [0, 1] }
    """
    input: dict        # kwargs dict passed to the solution function
    expected: Any      # any JSON-serialisable type (list, bool, int, str…)


class CodingQuestionResponse(BaseModel):
    id: int
    title: str
    difficulty: str
    description: str
    test_cases: list[TestCase]   # typed — was list[dict]
    points: int
    examples: list[QuestionExample] = []
    constraints: str | None = None
    starter_code: str | None = None

    class Config:
        from_attributes = True


class CodingQuestionCreate(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    difficulty: str
    description: str = Field(min_length=10)
    test_cases: list[TestCase] = Field(min_length=1)
    examples: list[QuestionExample] = []
    constraints: str | None = None
    points: int = Field(gt=0, le=10000)
    starter_code: str | None = None

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, value: str) -> str:
        normalized = value.lower().strip()
        if normalized not in {"easy", "medium", "hard"}:
            raise ValueError("Difficulty must be easy, medium, or hard")
        return normalized


class RoomCreateRequest(BaseModel):
    host: str | None = None
    difficulty: str = "easy"

class RoomJoinRequest(BaseModel):
    roomCode: str

class SubmissionRequest(BaseModel):
    code: str
    language: str
    score: int | None = None
    passed: bool | None = None

class MatchHistoryItem(BaseModel):
    id: int
    roomCode: str
    questionTitle: str
    difficulty: str
    result: str
    score: int
    createdAt: datetime

class UserStatsResponse(BaseModel):
    gamesPlayed: int
    wins: int
    losses: int
    totalPoints: int
    winRate: int
    currentStreak: int
    bestStreak: int
    rank: str
