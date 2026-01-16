"""Real-time collaboration service using WebSockets."""

import json
import uuid
from datetime import datetime
from dataclasses import dataclass, field
from typing import Any
from fastapi import WebSocket
from loguru import logger


@dataclass
class Collaborator:
    """A user connected to a collaboration session."""

    id: str
    websocket: WebSocket
    name: str
    color: str
    cursor_position: int = 0
    selection_start: int | None = None
    selection_end: int | None = None
    joined_at: datetime = field(default_factory=datetime.now)


@dataclass
class CollaborationSession:
    """A real-time editing session for a presentation."""

    presentation_id: str
    collaborators: dict[str, Collaborator] = field(default_factory=dict)
    content: str = ""
    last_update: datetime = field(default_factory=datetime.now)


# Predefined colors for collaborators
COLLABORATOR_COLORS = [
    "#ef4444",  # red
    "#f97316",  # orange
    "#eab308",  # yellow
    "#22c55e",  # green
    "#06b6d4",  # cyan
    "#3b82f6",  # blue
    "#8b5cf6",  # violet
    "#ec4899",  # pink
]


class CollaborationManager:
    """Manages real-time collaboration sessions."""

    def __init__(self):
        self.sessions: dict[str, CollaborationSession] = {}
        self._color_index = 0

    def _get_next_color(self) -> str:
        """Get the next collaborator color."""
        color = COLLABORATOR_COLORS[self._color_index % len(COLLABORATOR_COLORS)]
        self._color_index += 1
        return color

    async def join_session(
        self,
        presentation_id: str,
        websocket: WebSocket,
        name: str,
        initial_content: str = "",
    ) -> str:
        """Join a collaboration session, creating it if needed."""
        if presentation_id not in self.sessions:
            self.sessions[presentation_id] = CollaborationSession(
                presentation_id=presentation_id,
                content=initial_content,
            )

        session = self.sessions[presentation_id]
        collaborator_id = str(uuid.uuid4())[:8]

        collaborator = Collaborator(
            id=collaborator_id,
            websocket=websocket,
            name=name,
            color=self._get_next_color(),
        )

        session.collaborators[collaborator_id] = collaborator

        # Notify others about new collaborator
        await self._broadcast(
            session,
            {
                "type": "user_joined",
                "user": {
                    "id": collaborator_id,
                    "name": name,
                    "color": collaborator.color,
                },
            },
            exclude=collaborator_id,
        )

        # Send session state to new collaborator
        await self._send(
            collaborator,
            {
                "type": "session_state",
                "collaborator_id": collaborator_id,
                "content": session.content,
                "users": [
                    {
                        "id": c.id,
                        "name": c.name,
                        "color": c.color,
                        "cursor_position": c.cursor_position,
                    }
                    for c in session.collaborators.values()
                ],
            },
        )

        logger.info(f"User {name} joined session {presentation_id}")
        return collaborator_id

    async def leave_session(self, presentation_id: str, collaborator_id: str) -> None:
        """Leave a collaboration session."""
        session = self.sessions.get(presentation_id)
        if not session:
            return

        collaborator = session.collaborators.pop(collaborator_id, None)
        if not collaborator:
            return

        # Notify others
        await self._broadcast(
            session,
            {
                "type": "user_left",
                "user_id": collaborator_id,
            },
        )

        # Clean up empty sessions
        if not session.collaborators:
            del self.sessions[presentation_id]
            logger.info(f"Session {presentation_id} closed (no collaborators)")

        logger.info(f"User {collaborator.name} left session {presentation_id}")

    async def handle_message(
        self,
        presentation_id: str,
        collaborator_id: str,
        message: dict[str, Any],
    ) -> None:
        """Handle an incoming message from a collaborator."""
        session = self.sessions.get(presentation_id)
        if not session:
            return

        collaborator = session.collaborators.get(collaborator_id)
        if not collaborator:
            return

        msg_type = message.get("type")

        if msg_type == "content_change":
            await self._handle_content_change(session, collaborator_id, message)
        elif msg_type == "cursor_move":
            await self._handle_cursor_move(session, collaborator_id, message)
        elif msg_type == "selection_change":
            await self._handle_selection_change(session, collaborator_id, message)

    async def _handle_content_change(
        self,
        session: CollaborationSession,
        collaborator_id: str,
        message: dict[str, Any],
    ) -> None:
        """Handle content change from a collaborator."""
        new_content = message.get("content", "")
        version = message.get("version", 0)

        session.content = new_content
        session.last_update = datetime.now()

        # Broadcast to all other collaborators
        await self._broadcast(
            session,
            {
                "type": "content_update",
                "content": new_content,
                "version": version,
                "from_user": collaborator_id,
            },
            exclude=collaborator_id,
        )

    async def _handle_cursor_move(
        self,
        session: CollaborationSession,
        collaborator_id: str,
        message: dict[str, Any],
    ) -> None:
        """Handle cursor position update."""
        position = message.get("position", 0)

        collaborator = session.collaborators.get(collaborator_id)
        if collaborator:
            collaborator.cursor_position = position

        await self._broadcast(
            session,
            {
                "type": "cursor_update",
                "user_id": collaborator_id,
                "position": position,
            },
            exclude=collaborator_id,
        )

    async def _handle_selection_change(
        self,
        session: CollaborationSession,
        collaborator_id: str,
        message: dict[str, Any],
    ) -> None:
        """Handle selection change."""
        start = message.get("start")
        end = message.get("end")

        collaborator = session.collaborators.get(collaborator_id)
        if collaborator:
            collaborator.selection_start = start
            collaborator.selection_end = end

        await self._broadcast(
            session,
            {
                "type": "selection_update",
                "user_id": collaborator_id,
                "start": start,
                "end": end,
            },
            exclude=collaborator_id,
        )

    async def _broadcast(
        self,
        session: CollaborationSession,
        message: dict[str, Any],
        exclude: str | None = None,
    ) -> None:
        """Broadcast message to all collaborators in session."""
        data = json.dumps(message)
        disconnected = []

        for cid, collaborator in session.collaborators.items():
            if cid == exclude:
                continue
            try:
                await collaborator.websocket.send_text(data)
            except Exception:
                disconnected.append(cid)

        # Clean up disconnected users
        for cid in disconnected:
            session.collaborators.pop(cid, None)

    async def _send(self, collaborator: Collaborator, message: dict[str, Any]) -> None:
        """Send message to a specific collaborator."""
        try:
            await collaborator.websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send to {collaborator.id}: {e}")

    def get_session_info(self, presentation_id: str) -> dict | None:
        """Get information about a session."""
        session = self.sessions.get(presentation_id)
        if not session:
            return None

        return {
            "presentation_id": presentation_id,
            "collaborator_count": len(session.collaborators),
            "collaborators": [
                {"id": c.id, "name": c.name, "color": c.color}
                for c in session.collaborators.values()
            ],
        }


# Global collaboration manager instance
collaboration_manager = CollaborationManager()
