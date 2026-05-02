from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import random
import string

router = APIRouter(prefix="/rooms", tags=["Rooms"])

class RoomCreateRequest(BaseModel):
    host: str | None = None

class RoomJoinRequest(BaseModel):
    roomCode: str

class RoomResponse(BaseModel):
    roomCode: str

_room_store: dict[str, dict] = {}


def _generate_room_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choices(alphabet, k=length))


@router.post("/create", response_model=RoomResponse)
async def create_room(request: RoomCreateRequest):
    room_code = _generate_room_code()
    while room_code in _room_store:
        room_code = _generate_room_code()

    _room_store[room_code] = {
        "host": request.host or "guest",
        "players": [request.host or "guest"],
        "created_at": datetime.utcnow().isoformat() + "Z",
    }

    return {"roomCode": room_code}


@router.post("/join", response_model=RoomResponse)
async def join_room(request: RoomJoinRequest):
    room_code = request.roomCode.strip().upper()
    room = _room_store.get(room_code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    if request.roomCode not in room["players"]:
        room["players"].append(request.roomCode)

    return {"roomCode": room_code}


@router.get("/{room_code}", response_model=RoomResponse)
async def get_room(room_code: str):
    code = room_code.strip().upper()
    if code not in _room_store:
        raise HTTPException(status_code=404, detail="Room not found.")
    return {"roomCode": code}
