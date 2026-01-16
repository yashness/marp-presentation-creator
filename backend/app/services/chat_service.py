"""Chat conversation persistence service."""

from datetime import datetime
import uuid
from sqlalchemy.orm import Session
from app.models.chat_conversation import ChatConversation, ChatMessage
from app.core.database import get_db_session
from app.core.logger import logger


def generate_id() -> str:
    return str(uuid.uuid4())


def create_conversation(
    presentation_id: str | None = None,
    mode: str = "general"
) -> ChatConversation:
    """Create a new chat conversation."""
    with get_db_session() as session:
        conversation = ChatConversation(
            id=generate_id(),
            presentation_id=presentation_id,
            mode=mode,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        session.add(conversation)
        session.flush()
        session.refresh(conversation)
        logger.info(f"Created conversation: {conversation.id}")
        return _to_dict(conversation)


def get_conversation(conversation_id: str) -> dict | None:
    """Get a conversation with all messages."""
    with get_db_session() as session:
        conv = session.query(ChatConversation).filter(
            ChatConversation.id == conversation_id
        ).first()
        if not conv:
            return None
        return _to_dict_with_messages(conv)


def list_conversations(
    presentation_id: str | None = None,
    limit: int = 20
) -> list[dict]:
    """List recent conversations."""
    with get_db_session() as session:
        query = session.query(ChatConversation)
        if presentation_id:
            query = query.filter(ChatConversation.presentation_id == presentation_id)
        conversations = query.order_by(
            ChatConversation.updated_at.desc()
        ).limit(limit).all()
        return [_to_dict(c) for c in conversations]


def add_message(
    conversation_id: str,
    role: str,
    content: str,
    thinking: str | None = None,
    extra_data: dict | None = None
) -> dict | None:
    """Add a message to a conversation."""
    with get_db_session() as session:
        conv = session.query(ChatConversation).filter(
            ChatConversation.id == conversation_id
        ).first()
        if not conv:
            return None

        # Get next message order
        max_order = session.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id
        ).count()

        message = ChatMessage(
            id=generate_id(),
            conversation_id=conversation_id,
            role=role,
            content=content,
            thinking=thinking,
            message_order=max_order,
            extra_data=extra_data,
            created_at=datetime.now()
        )
        session.add(message)

        # Update conversation timestamp
        conv.updated_at = datetime.now()
        session.flush()
        session.refresh(message)

        logger.info(f"Added message to conversation {conversation_id}")
        return _message_to_dict(message)


def delete_conversation(conversation_id: str) -> bool:
    """Delete a conversation and all its messages."""
    with get_db_session() as session:
        conv = session.query(ChatConversation).filter(
            ChatConversation.id == conversation_id
        ).first()
        if not conv:
            return False
        session.delete(conv)
        logger.info(f"Deleted conversation: {conversation_id}")
        return True


def _to_dict(conv: ChatConversation) -> dict:
    return {
        "id": conv.id,
        "presentation_id": conv.presentation_id,
        "mode": conv.mode,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat(),
    }


def _to_dict_with_messages(conv: ChatConversation) -> dict:
    result = _to_dict(conv)
    result["messages"] = sorted(
        [_message_to_dict(m) for m in conv.messages],
        key=lambda x: x["message_order"]
    )
    return result


def _message_to_dict(msg: ChatMessage) -> dict:
    return {
        "id": msg.id,
        "role": msg.role,
        "content": msg.content,
        "thinking": msg.thinking,
        "message_order": msg.message_order,
        "extra_data": msg.extra_data,
        "created_at": msg.created_at.isoformat(),
    }
