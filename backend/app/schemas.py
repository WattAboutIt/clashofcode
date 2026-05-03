from datetime import datetime

from pydantic import BaseModel, EmailStr


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


class CodingQuestionResponse(BaseModel):
    id: int
    title: str
    difficulty: str
    description: str
    test_cases: list[dict]
    points: int
    examples: list[QuestionExample] = []
    constraints: str | None = None
    starter_code: str | None = None

    class Config:
        from_attributes = True


class RoomCreateRequest(BaseModel):
    host: str | None = None
    difficulty: str = "easy"


class RoomJoinRequest(BaseModel):
    roomCode: str


class SubmissionRequest(BaseModel):
    code: str
    language: str


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
