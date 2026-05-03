from datetime import datetime, timezone
import random
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import CodingQuestion, MatchHistory, User
from app.room_store import room_store
from app.schemas import RoomCreateRequest, RoomJoinRequest, SubmissionRequest

router = APIRouter(prefix="/rooms", tags=["Rooms"])

VALID_LEVELS = {"easy", "medium", "hard"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _generate_room_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choices(alphabet, k=length))


def _get_room_or_404(room_code: str) -> dict:
    code = room_code.strip().upper()
    room = room_store.get(code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")
    return room


def _serialize_question(question: CodingQuestion | None) -> dict | None:
    if not question:
        return None

    return {
        "id": question.id,
        "title": question.title,
        "difficulty": question.difficulty,
        "description": question.description,
        "test_cases": question.test_cases,
        "examples": question.examples or [],
        "constraints": question.constraints,
        "points": question.points,
        "starter_code": question.starter_code,
    }


async def _get_user(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def _get_question_by_id(db: AsyncSession, question_id: int | None) -> CodingQuestion | None:
    if not question_id:
        return None
    result = await db.execute(select(CodingQuestion).where(CodingQuestion.id == question_id))
    return result.scalar_one_or_none()


async def _serialize_room(room: dict, db: AsyncSession) -> dict:
    question = await _get_question_by_id(db, room.get("question_id"))
    players = sorted(room["players"].values(), key=lambda item: item["joined_at"])
    return {
        "roomCode": room["room_code"],
        "host": room["host"],
        "status": room["status"],
        "difficulty": room["difficulty"],
        "created_at": room["created_at"],
        "started_at": room.get("started_at"),
        "time_limit_minutes": room["time_limit_minutes"],
        "question": _serialize_question(question),
        "players": [
            {
                "username": player["username"],
                "status": player["status"],
                "score": player["score"],
                "language": player.get("language"),
            }
            for player in players
        ],
    }


async def _finalize_room(room: dict, db: AsyncSession) -> None:
    if room["status"] == "finished":
        return

    room["status"] = "finished"
    room["finished_at"] = _now_iso()

    players = list(room["players"].values())
    scored_players = sorted(
        players,
        key=lambda player: (-player["score"], player.get("submitted_at") or _now_iso()),
    )
    winner_username = scored_players[0]["username"] if scored_players else None
    question = await _get_question_by_id(db, room.get("question_id"))
    question_title = question.title if question else "Untitled Challenge"

    for player_state in players:
        user = await _get_user(db, player_state["username"])
        if not user:
            continue

        user.games_played = (user.games_played or 0) + 1
        user.total_points = (user.total_points or 0) + player_state["score"]

        if player_state["username"] == winner_username:
            user.wins = (user.wins or 0) + 1
            user.current_streak = (user.current_streak or 0) + 1
            user.best_streak = max(user.best_streak or 0, user.current_streak or 0)
            result = "Victory"
        else:
            user.losses = (user.losses or 0) + 1
            user.current_streak = 0
            result = "Defeat"

        db.add(
            MatchHistory(
                user_id=user.id,
                room_code=room["room_code"],
                question_title=question_title,
                difficulty=room["difficulty"],
                result=result,
                score=player_state["score"],
            )
        )

    await db.commit()


@router.post("/create")
async def create_room(
    request: RoomCreateRequest,
    current_username: str = Depends(get_current_user),
):
    difficulty = request.difficulty.lower()
    if difficulty not in VALID_LEVELS:
        raise HTTPException(status_code=400, detail="Invalid difficulty level.")

    room_code = _generate_room_code()
    while room_code in room_store:
        room_code = _generate_room_code()

    host = current_username
    room_store[room_code] = {
        "room_code": room_code,
        "host": host,
        "difficulty": difficulty,
        "status": "waiting",
        "created_at": _now_iso(),
        "started_at": None,
        "finished_at": None,
        "question_id": None,
        "time_limit_minutes": {"easy": 10, "medium": 15, "hard": 20}[difficulty],
        "players": {
            host: {
                "username": host,
                "status": "waiting",
                "score": 0,
                "joined_at": _now_iso(),
                "submitted_at": None,
                "code": "",
                "language": None,
            }
        },
    }

    return {"roomCode": room_code, "difficulty": difficulty}


@router.post("/join")
async def join_room(
    request: RoomJoinRequest,
    current_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = _get_room_or_404(request.roomCode)
    username = current_username

    if username not in room["players"]:
        room["players"][username] = {
            "username": username,
            "status": "active" if room["status"] == "active" else "waiting",
            "score": 0,
            "joined_at": _now_iso(),
            "submitted_at": None,
            "code": "",
            "language": None,
        }

    payload = await _serialize_room(room, db)
    return {"roomCode": payload["roomCode"]}


@router.get("/{room_code}")
async def get_room(
    room_code: str,
    db: AsyncSession = Depends(get_db),
):
    room = _get_room_or_404(room_code)
    return await _serialize_room(room, db)


@router.post("/{room_code}/start")
async def start_room(
    room_code: str,
    current_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = _get_room_or_404(room_code)
    if room["host"] != current_username:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the host can start the room.")
    if room["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Room has already started.")

    result = await db.execute(
        select(CodingQuestion).where(CodingQuestion.difficulty == room["difficulty"])
    )
    questions = result.scalars().all()
    if not questions:
        raise HTTPException(status_code=404, detail="No questions available for this difficulty.")

    question = random.choice(questions)
    room["question_id"] = question.id
    room["status"] = "active"
    room["started_at"] = _now_iso()

    for player in room["players"].values():
        player["status"] = "active"

    return await _serialize_room(room, db)


@router.post("/{room_code}/submit")
async def submit_solution(
    room_code: str,
    request: SubmissionRequest,
    current_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = _get_room_or_404(room_code)
    if room["status"] != "active":
        raise HTTPException(status_code=400, detail="This room is not accepting submissions right now.")

    player = room["players"].get(current_username)
    if not player:
        raise HTTPException(status_code=403, detail="Join the room before submitting.")
    if player["status"] == "submitted":
        raise HTTPException(status_code=400, detail="You have already submitted for this room.")

    question = await _get_question_by_id(db, room.get("question_id"))
    if not question:
        raise HTTPException(status_code=400, detail="No question has been assigned to this room.")

    code = request.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="Submission code cannot be empty.")

    player["code"] = request.code
    player["language"] = request.language
    player["submitted_at"] = _now_iso()
    player["status"] = "submitted"

    passed = True
    score = question.points
    player["score"] = score

    if all(member["status"] == "submitted" for member in room["players"].values()):
        await _finalize_room(room, db)

    return {
        "passed": passed,
        "score": score,
        "test_results": [
            {"name": f"Case {index + 1}", "passed": True}
            for index, _ in enumerate(question.test_cases or [])
        ],
        "message": "Submission recorded. Execution-based judging can plug into this response later.",
    }
