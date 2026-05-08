from __future__ import annotations

import logging
from dataclasses import dataclass

from fastapi import WebSocket

logger = logging.getLogger(__name__)


@dataclass
class Connection:
    websocket: WebSocket
    username: str | None = None


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[Connection]] = {}

    async def connect(self, room_code: str, websocket: WebSocket, username: str | None = None):
        await websocket.accept()
        room_key = room_code.strip().upper()
        logger.info("WebSocket connected: room=%s user=%s client=%s", room_key, username, websocket.client)
        self.active_connections.setdefault(room_key, []).append(Connection(websocket, username))

    def disconnect(self, room_code: str, websocket: WebSocket):
        room_key = room_code.strip().upper()
        connections = self.active_connections.get(room_key)
        if not connections:
            return
        self.active_connections[room_key] = [
            connection for connection in connections if connection.websocket is not websocket
        ]
        if not self.active_connections[room_key]:
            del self.active_connections[room_key]

    async def broadcast(self, room_code: str, message: dict):
        room_key = room_code.strip().upper()
        connections = list(self.active_connections.get(room_key, []))
        stale: list[WebSocket] = []
        for connection in connections:
            try:
                await connection.websocket.send_json(message)
            except Exception as exc:
                logger.warning("Dropping stale WebSocket: room=%s user=%s error=%s", room_key, connection.username, exc)
                stale.append(connection.websocket)
        for websocket in stale:
            self.disconnect(room_key, websocket)


manager = ConnectionManager()
