"""WebSocket API for real-time collaboration."""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.orm import Session
from loguru import logger
from app.core.database import get_db
from app.services.collaboration_service import collaboration_manager
from app.services.presentation_service import get_presentation

router = APIRouter(prefix="/collab", tags=["collaboration"])


@router.websocket("/ws/{presentation_id}")
async def collaboration_websocket(
    websocket: WebSocket,
    presentation_id: str,
    name: str = Query(default="Anonymous"),
):
    """WebSocket endpoint for real-time collaboration."""
    await websocket.accept()

    # Get initial content from database
    db = next(get_db())
    try:
        presentation = get_presentation(db, presentation_id)
        initial_content = presentation.content if presentation else ""
    finally:
        db.close()

    # Join the collaboration session
    collaborator_id = await collaboration_manager.join_session(
        presentation_id=presentation_id,
        websocket=websocket,
        name=name,
        initial_content=initial_content,
    )

    try:
        while True:
            # Receive messages
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await collaboration_manager.handle_message(
                    presentation_id,
                    collaborator_id,
                    message,
                )
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from {collaborator_id}")
            except Exception as e:
                logger.error(f"Error handling message: {e}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {collaborator_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await collaboration_manager.leave_session(presentation_id, collaborator_id)


@router.get("/session/{presentation_id}")
def get_session_info(presentation_id: str):
    """Get information about a collaboration session."""
    info = collaboration_manager.get_session_info(presentation_id)
    if not info:
        return {"active": False, "collaborator_count": 0, "collaborators": []}
    return {"active": True, **info}
