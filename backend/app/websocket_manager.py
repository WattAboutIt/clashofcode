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

    def connect(self, room_code: str, websocket: WebSocket, username: str | None = None):
        room_key = room_code.strip().upper()
        self.disconnect_user(room_key, username)
        logger.info("WebSocket connected: room=%s user=%s client=%s", room_key, username, websocket.client)
        self.active_connections.setdefault(room_key, []).append(Connection(websocket, username))

    def disconnect_user(self, room_code: str, username: str | None):
        if not username:
            return
        room_key = room_code.strip().upper()
        connections = self.active_connections.get(room_key)
        if not connections:
            return
        self.active_connections[room_key] = [
            connection for connection in connections if connection.username != username
        ]
        if not self.active_connections[room_key]:
            del self.active_connections[room_key]

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

    def snapshot(self) -> dict:
        return {
            room_code: [
                {
                    "username": connection.username,
                    "client": str(connection.websocket.client),
                    "state": getattr(connection.websocket, "client_state", None).name
                    if getattr(connection.websocket, "client_state", None)
                    else "unknown",
                }
                for connection in connections
            ]
            for room_code, connections in self.active_connections.items()
        }


manager = ConnectionManager()
