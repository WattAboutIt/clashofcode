from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)

    username = Column(
        String(50),
        unique=True,
        nullable=False
    )

    email = Column(
        String(100),
        unique=True,
        nullable=False
    )

    hashed_pw = Column(
        String,
        nullable=False
    )

    games_played = Column(Integer, nullable=False, default=0)
    wins = Column(Integer, nullable=False, default=0)
    losses = Column(Integer, nullable=False, default=0)
    total_points = Column(Integer, nullable=False, default=0)
    current_streak = Column(Integer, nullable=False, default=0)
    best_streak = Column(Integer, nullable=False, default=0)
    role = Column(String(20), nullable=False, default="user")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    matches = relationship("MatchHistory", back_populates="user", cascade="all, delete-orphan")


class CodingQuestion(Base):
    __tablename__ = "coding_questions"

    id = Column(Integer, primary_key=True)
    title = Column(String(150), nullable=False, unique=True)
    difficulty = Column(String(20), nullable=False, index=True)
    description = Column(Text, nullable=False)
    test_cases = Column(JSON, nullable=False, default=list)
    examples = Column(JSON, nullable=False, default=list)
    constraints = Column(Text, nullable=True)
    points = Column(Integer, nullable=False)
    starter_code = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class MatchHistory(Base):
    __tablename__ = "match_history"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    room_code = Column(String(20), nullable=False, index=True)
    question_title = Column(String(150), nullable=False)
    difficulty = Column(String(20), nullable=False)
    result = Column(String(20), nullable=False)
    score = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="matches")
