from datetime import datetime, timezone
import random
import string
import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import AsyncSessionLocal, get_db
from app.models import CodingQuestion, MatchHistory, User
from app.room_store import room_store
from app.schemas import RoomCreateRequest, RoomJoinRequest, SubmissionRequest
from app.websocket_manager import manager
from app.routers.execution import evaluate_python_cases, unsupported_language_response

router = APIRouter(prefix="/rooms", tags=["Rooms"])
logger = logging.getLogger(__name__)

VALID_LEVELS = {"easy", "medium", "hard"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _timer_payload(room: dict) -> dict:
    started_at = _parse_iso(room.get("started_at"))
    ends_at = None
    remaining_seconds = None
    if started_at and room.get("time_limit_minutes"):
        ends_at_dt = started_at.timestamp() + room["time_limit_minutes"] * 60
        now_ts = datetime.now(timezone.utc).timestamp()
        ends_at = datetime.fromtimestamp(ends_at_dt, timezone.utc).isoformat()
        remaining_seconds = max(0, int(ends_at_dt - now_ts))
    return {
        "server_now": _now_iso(),
        "ends_at": ends_at,
        "remaining_seconds": remaining_seconds,
    }


def _push_event(room: dict, kind: str, message: str, username: str | None = None) -> None:
    events = room.setdefault("events", [])
    events.append({
        "id": f"{int(datetime.now(timezone.utc).timestamp() * 1000)}-{len(events)}",
        "kind": kind,
        "message": message,
        "username": username,
        "created_at": _now_iso(),
    })
    del events[:-80]


def _push_chat_message(room: dict, username: str, message: str) -> dict:
    messages = room.setdefault("chat_messages", [])
    chat_message = {
        "id": f"{int(datetime.now(timezone.utc).timestamp() * 1000)}-{len(messages)}",
        "username": username,
        "message": message,
        "created_at": _now_iso(),
    }
    messages.append(chat_message)
    del messages[:-100]
    return chat_message


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
    examples = question.examples or []
    visible_count = max(1, len(examples)) if examples else min(2, len(question.test_cases or []))
    sample_cases = (question.test_cases or [])[:visible_count]

    return {
        "id": question.id,
        "title": question.title,
        "difficulty": question.difficulty,
        "description": question.description,
        "test_cases": [],
        "sample_cases": sample_cases,
        "examples": examples,
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
    await _expire_room_if_needed(room, db)
    question = await _get_question_by_id(db, room.get("question_id"))
    players = sorted(room["players"].values(), key=lambda item: item["joined_at"])
    timer = _timer_payload(room)
    return {
        "roomCode": room["room_code"],
        "host": room["host"],
        "status": room["status"],
        "all_questions_finished": room.get("all_questions_finished", False),
        "difficulty": room["difficulty"],
        "created_at": room["created_at"],
        "started_at": room.get("started_at"),
        "finished_at": room.get("finished_at"),
        "server_now": timer["server_now"],
        "ends_at": timer["ends_at"],
        "remaining_seconds": timer["remaining_seconds"],
        "time_limit_minutes": room["time_limit_minutes"],
        "question": _serialize_question(question),
        "events": room.get("events", []),
        "chat_messages": room.get("chat_messages", []),
        "players": [
            {
                "username": player["username"],
                "status": player["status"],
                "score": player["score"],
                "language": player.get("language"),
                "online": player.get("online", False),
                "typing": player.get("typing", False),
                "progress": player.get("progress", 0),
                "last_action": player.get("last_action"),
                "submitted_at": player.get("submitted_at"),
                "runtime_ms": player.get("runtime_ms"),
                "memory_kb": player.get("memory_kb"),
                "passed": player.get("passed", 0),
                "total": player.get("total", 0),
                "submissions": player.get("submissions", []),
            }
            for player in players
        ],
    }


async def _broadcast_room(room: dict, db: AsyncSession) -> dict:
    payload = await _serialize_room(room, db)
    logger.info(
        "ROOM BROADCAST room_id=%s status=%s players=%s",
        room["room_code"],
        payload["status"],
        len(payload["players"]),
    )
    await manager.broadcast(room["room_code"], {"event": "room_updated", "room": payload})
    return payload


async def _expire_room_if_needed(room: dict, db: AsyncSession) -> None:
    if room.get("status") != "active":
        return
    remaining = _timer_payload(room).get("remaining_seconds")
    if remaining == 0:
        _push_event(room, "timer", "Time is up. Battle finished.")
        await _finalize_room(room, db)


async def _finalize_room(room: dict, db: AsyncSession) -> None:
    if room.get("status") in ("round_finished", "finished"):
        return

    room["status"] = "round_finished"
    room["finished_at"] = _now_iso()
    for player in room["players"].values():
        if player["status"] != "submitted":
            player["status"] = "time_up"
            player["typing"] = False

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
                "online": False,
                "typing": False,
                "progress": 0,
                "last_action": "joined",
                "runtime_ms": None,
                "memory_kb": None,
                "passed": 0,
                "total": 0,
                "submissions": [],
            }
        },
        "events": [],
        "used_questions": [],
        "all_questions_finished": False,
        "chat_messages": [],
    }
    _push_event(room_store[room_code], "room", f"{host} created the room.", host)

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
            "online": False,
            "typing": False,
            "progress": 0,
            "last_action": "joined",
            "runtime_ms": None,
            "memory_kb": None,
            "passed": 0,
            "total": 0,
            "submissions": [],
        }
        _push_event(room, "join", f"{username} joined the room.", username)

    payload = await _broadcast_room(room, db)
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
    # track used questions to avoid repeats
    used = room.setdefault("used_questions", [])
    if question.id not in used:
        used.append(question.id)

    for player in room["players"].values():
        player["status"] = "active"
        player["typing"] = False
        player["last_action"] = "started"

    _push_event(room, "start", f"Battle started with {question.title}.", current_username)
    asyncio.create_task(_finish_room_when_timer_expires(room_code))
    payload = await _broadcast_room(room, db)
    return payload


@router.post("/{room_code}/finish")
async def finish_room(
    room_code: str,
    current_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = _get_room_or_404(room_code)
    if room["host"] != current_username:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the host can finish the room.")
    # run finalization (compute scores / update histories) if needed
    await _finalize_room(room, db)

    if room.get("status") == "finished":
        return await _broadcast_room(room, db)

    room["status"] = "finished"
    room["finished_at"] = _now_iso()
    _push_event(room, "finish", "Battle finished by host.", current_username)
    payload = await _broadcast_room(room, db)
    return payload


@router.post("/{room_code}/next")
async def next_question(
    room_code: str,
    current_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    room = _get_room_or_404(room_code)
    if room["host"] != current_username:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the host can advance the room.")
    # allow advancing only after a round has ended (round_finished)
    if room.get("status") != "round_finished" and room.get("status") != "finished":
        raise HTTPException(status_code=400, detail="Room must be finished to advance to next question.")

    result = await db.execute(
        select(CodingQuestion).where(CodingQuestion.difficulty == room["difficulty"])
    )
    questions = result.scalars().all()
    if not questions:
        raise HTTPException(status_code=404, detail="No questions available for this difficulty.")

    # choose a question not used previously in this room
    used = set(room.get("used_questions", []))
    remaining = [q for q in questions if q.id not in used]
    if not remaining:
        room["all_questions_finished"] = True
        _push_event(room, "info", "All questions in the pool have been used.", current_username)
        payload = await _broadcast_room(room, db)
        return payload

    question = random.choice(remaining)
    room["question_id"] = question.id
    room["status"] = "active"
    room["started_at"] = _now_iso()
    # mark used
    used_list = room.setdefault("used_questions", [])
    if question.id not in used_list:
        used_list.append(question.id)

    for player in room["players"].values():
        player["status"] = "active"
        player["typing"] = False
        player["last_action"] = "started"

    _push_event(room, "start", f"Next battle started with {question.title}.", current_username)
    asyncio.create_task(_finish_room_when_timer_expires(room_code))
    payload = await _broadcast_room(room, db)
    return payload


async def _finish_room_when_timer_expires(room_code: str):
    room = room_store.get(room_code)
    if not room or room.get("status") != "active":
        return
    remaining = _timer_payload(room).get("remaining_seconds") or 0
    await asyncio.sleep(max(remaining, 0) + 1)
    room = room_store.get(room_code)
    if not room or room.get("status") != "active":
        return
    async with AsyncSessionLocal() as db:
        _push_event(room, "timer", "Time is up. Battle finished.")
        await _finalize_room(room, db)
        # Auto-advance to next question if one is available
        await _auto_advance_if_questions_remain(room, db)
        await _broadcast_room(room, db)


async def _auto_advance_if_questions_remain(room: dict, db: AsyncSession) -> None:
    """Auto-advance to next question if one is available after round finalization."""
    if room.get("status") != "round_finished":
        return

    result = await db.execute(
        select(CodingQuestion).where(CodingQuestion.difficulty == room["difficulty"])
    )
    questions = result.scalars().all()
    if not questions:
        room["all_questions_finished"] = True
        return

    used = set(room.get("used_questions", []))
    remaining = [q for q in questions if q.id not in used]
    if not remaining:
        room["all_questions_finished"] = True
        _push_event(room, "info", "All questions in the pool have been used.", None)
        return

    question = random.choice(remaining)
    room["question_id"] = question.id
    room["status"] = "active"
    room["started_at"] = _now_iso()
    # mark used
    used_list = room.setdefault("used_questions", [])
    if question.id not in used_list:
        used_list.append(question.id)

    for player in room["players"].values():
        player["status"] = "active"
        player["typing"] = False
        player["last_action"] = "started"

    _push_event(room, "start", f"Auto-advancing to next question: {question.title}", None)
    asyncio.create_task(_finish_room_when_timer_expires(room["room_code"]))


async def calculate_platform_stats(room_code: str):
    """ Async analytics simulation """
    await asyncio.sleep(2)
    print(f"Analytics Update: Average XP gain is 450.2. Match {room_code} finished and metrics processed asynchronously.")


@router.post("/{room_code}/submit")
async def submit_solution(
    room_code: str,
    request: SubmissionRequest,
    current_username: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    logger.info("SUBMIT ATTEMPT room_id=%s user_id=%s language=%s", room_code, current_username, request.language)
    room = _get_room_or_404(room_code)
    await _expire_room_if_needed(room, db)
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

    lang = request.language.lower()
    try:
        if lang in ("python",):
            judge_result = evaluate_python_cases(request.code, question.test_cases or [], timeout_seconds=12)
        elif lang in ("javascript", "js"):
            from app.routers.execution import evaluate_js_cases

            judge_result = evaluate_js_cases(request.code, question.test_cases or [], timeout_seconds=12)
        elif lang in ("cpp", "c++"):
            from app.routers.execution import evaluate_cpp_cases

            judge_result = evaluate_cpp_cases(request.code, question.test_cases or [], timeout_seconds=12)
        else:
            judge_result = unsupported_language_response(request.language)
    except Exception:
        logger.exception("SUBMIT EXECUTION FAILURE room_id=%s user_id=%s", room_code, current_username)
        raise HTTPException(status_code=500, detail="Judge execution failed.")

    passed = judge_result.status == "Accepted" and judge_result.total > 0 and judge_result.passed == judge_result.total
    score = question.points if passed else 0
    status_label = judge_result.status
    submission_record = {
        "id": f"{current_username}-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "language": request.language,
        "status": status_label,
        "runtime_ms": judge_result.runtime_ms,
        "memory_kb": judge_result.memory_kb,
        "score": score,
        "passed": judge_result.passed,
        "total": judge_result.total,
        "submitted_at": _now_iso(),
    }

    player["code"] = request.code
    player["language"] = request.language
    player["submitted_at"] = _now_iso()
    player["status"] = "submitted" if passed else "active"
    player["score"] = score
    player["typing"] = False
    player["last_action"] = "submitted" if passed else "wrong_answer"
    player["progress"] = int((judge_result.passed / judge_result.total) * 100) if judge_result.total else 0
    player["runtime_ms"] = judge_result.runtime_ms
    player["memory_kb"] = judge_result.memory_kb
    player["passed"] = judge_result.passed
    player["total"] = judge_result.total
    player.setdefault("submissions", []).insert(0, submission_record)
    del player["submissions"][20:]

    if passed:
        _push_event(room, "submit", f"{current_username} submitted an accepted solution.", current_username)
    else:
        _push_event(room, "submit", f"{current_username} submitted: {status_label}.", current_username)
    logger.info(
        "SUBMIT RESULT room_id=%s user_id=%s status=%s passed=%s total=%s score=%s",
        room_code,
        current_username,
        status_label,
        judge_result.passed,
        judge_result.total,
        score,
    )

    if all(member["status"] == "submitted" for member in room["players"].values()):
        await _finalize_room(room, db)
        background_tasks.add_task(calculate_platform_stats, room_code)

    await _broadcast_room(room, db)

    return {
        "passed": passed,
        "status": status_label,
        "score": score,
        "runtime_ms": judge_result.runtime_ms,
        "memory_kb": judge_result.memory_kb,
        "passed_count": judge_result.passed,
        "total_count": judge_result.total,
        "test_results": [result.model_dump() for result in judge_result.results],
        "message": "Accepted." if passed else status_label,
    }


# Algorithmic Matchmaking state
waitlist = {"easy": [], "medium": [], "hard": []}
user_match_status = {}

@router.post("/matchmake")
async def matchmake(
    request: RoomCreateRequest,
    current_username: str = Depends(get_current_user),
):
    difficulty = request.difficulty.lower()
    
    if current_username in waitlist.get(difficulty, []):
        return {"status": "waiting"}
        
    other_users = [u for u in waitlist[difficulty] if u != current_username]
    if other_users:
        matched_username = other_users[0]
        waitlist[difficulty].remove(matched_username)
        room_code = _generate_room_code()
        while room_code in room_store:
            room_code = _generate_room_code()
            
        host = matched_username
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
                    "online": False,
                    "typing": False,
                    "progress": 0,
                    "last_action": "joined",
                    "runtime_ms": None,
                    "memory_kb": None,
                    "passed": 0,
                    "total": 0,
                    "submissions": [],
                },
                current_username: {
                    "username": current_username,
                    "status": "waiting",
                    "score": 0,
                    "joined_at": _now_iso(),
                    "submitted_at": None,
                    "code": "",
                    "language": None,
                    "online": False,
                    "typing": False,
                    "progress": 0,
                    "last_action": "joined",
                    "runtime_ms": None,
                    "memory_kb": None,
                    "passed": 0,
                    "total": 0,
                    "submissions": [],
                }
            },
            "events": [],
            "chat_messages": [],
        }
        _push_event(room_store[room_code], "match", f"{matched_username} matched with {current_username}.")
        user_match_status[matched_username] = room_code
        user_match_status[current_username] = room_code
        return {"status": "matched", "roomCode": room_code}
    else:
        waitlist[difficulty].append(current_username)
        user_match_status[current_username] = "waiting"
        
    return {"status": "waiting"}


@router.get("/matchmake/status")
async def get_matchmake_status(
    current_username: str = Depends(get_current_user),
):
    status = user_match_status.get(current_username, "idle")
    if status not in ("waiting", "idle"):
         return {"status": "matched", "roomCode": status}
    return {"status": status}


@router.post("/matchmake/cancel")
async def cancel_matchmake(
    current_username: str = Depends(get_current_user),
):
    for diff in waitlist:
        if current_username in waitlist[diff]:
            waitlist[diff].remove(current_username)
    if current_username in user_match_status:
        del user_match_status[current_username]
    return {"status": "idle"}


@router.websocket("/{room_code}/ws")
async def websocket_endpoint(websocket: WebSocket, room_code: str, token: str = None):
    room_id = room_code.strip().upper()
    username = None
    accepted = False
    print("WS CONNECT ATTEMPT", room_id)
    logger.info("WS CONNECT ATTEMPT room_id=%s client=%s", room_id, websocket.client)

    try:
        await websocket.accept()
        accepted = True
        print("WS ACCEPTED", room_id)
        logger.info("WS ACCEPTED room_id=%s client=%s state=%s", room_id, websocket.client, websocket.client_state)
    except Exception as exc:
        print("WS ACCEPT ERROR", exc)
        logger.exception("WS ACCEPT ERROR room_id=%s client=%s", room_id, websocket.client)
        return

    if not token:
        logger.warning("WS CLOSE missing token room_id=%s", room_id)
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return

    try:
        from jose import jwt
        from app.auth import SECRET_KEY, ALGORITHM
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            logger.warning("WS CLOSE invalid token subject room_id=%s", room_id)
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return
    except Exception as exc:
        logger.warning("WS CLOSE jwt decode failed room_id=%s error=%s", room_id, exc)
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    try:
        room = room_store.get(room_id)
    except Exception as exc:
        logger.exception("WS CLOSE room lookup error room_id=%s user_id=%s", room_id, username)
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Room lookup failed")
        return

    if not room:
        logger.warning("WS CLOSE room not found room_id=%s user_id=%s", room_id, username)
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Room not found")
        return

    if username not in room["players"]:
        logger.warning("WS CLOSE user not in room room_id=%s user_id=%s", room_id, username)
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Join room before connecting")
        return

    room["players"][username]["online"] = True
    room["players"][username]["last_action"] = "online"
    _push_event(room, "presence", f"{username} is online.", username)

    manager.connect(room_id, websocket, username)
    async with AsyncSessionLocal() as db:
        await _broadcast_room(room, db)

    try:
        while True:
            raw = await websocket.receive_json()
            event_type = raw.get("event")
            player = room["players"].get(username)
            if not player:
                continue

            if event_type == "ping":
                await websocket.send_json({"event": "pong", "server_now": _now_iso(), **_timer_payload(room)})
                continue

            if event_type == "typing":
                player["typing"] = bool(raw.get("typing"))
                player["last_action"] = "typing" if player["typing"] else "editing"
            elif event_type == "chat_message":
                message = str(raw.get("message") or "").strip()
                if not message:
                    continue
                if len(message) > 500:
                    await websocket.send_json({"event": "chat_error", "message": "Messages must be 500 characters or fewer."})
                    continue
                _push_chat_message(room, username, message)
                player["last_action"] = "sent a message"
            elif event_type == "run_code":
                player["last_action"] = "ran code"
                _push_event(room, "run", f"{username} ran code.", username)
            elif event_type == "focus":
                player["last_action"] = raw.get("target") or "focused"
            else:
                continue

            async with AsyncSessionLocal() as db:
                await _broadcast_room(room, db)
    except WebSocketDisconnect as exc:
        logger.info(
            "WS DISCONNECT room_id=%s user_id=%s code=%s reason=%s",
            room_id,
            username,
            getattr(exc, "code", None),
            getattr(exc, "reason", ""),
        )
        if username in room["players"]:
            room["players"][username]["online"] = False
            room["players"][username]["typing"] = False
            room["players"][username]["last_action"] = "offline"
            _push_event(room, "presence", f"{username} went offline.", username)
        manager.disconnect(room_id, websocket)
        async with AsyncSessionLocal() as db:
            await _broadcast_room(room, db)
    except Exception as e:
        logger.exception("WS ERROR room_id=%s user_id=%s accepted=%s state=%s error=%s", room_id, username, accepted, websocket.client_state, e)
        if username and username in room["players"]:
            room["players"][username]["online"] = False
            room["players"][username]["typing"] = False
        manager.disconnect(room_id, websocket)
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="WebSocket error")
        except Exception:
            pass
