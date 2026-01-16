"""Chat conversation persistence routes."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services import chat_service
from app.core.logger import logger

router = APIRouter(prefix="/conversations", tags=["conversations"])


class CreateConversationRequest(BaseModel):
    """Create conversation request."""
    presentation_id: str | None = None
    mode: str = Field(default="general")


class AddMessageRequest(BaseModel):
    """Add message to conversation request."""
    role: str = Field(..., description="user or assistant")
    content: str
    thinking: str | None = None
    extra_data: dict | None = None


class ConversationResponse(BaseModel):
    """Conversation response."""
    id: str
    presentation_id: str | None
    mode: str
    created_at: str
    updated_at: str
    messages: list[dict] | None = None


class MessageResponse(BaseModel):
    """Message response."""
    id: str
    role: str
    content: str
    thinking: str | None
    message_order: int
    extra_data: dict | None
    created_at: str


@router.post("", response_model=ConversationResponse)
def create_conversation(request: CreateConversationRequest) -> ConversationResponse:
    """Create a new chat conversation."""
    logger.info(f"Creating conversation for presentation: {request.presentation_id}")
    result = chat_service.create_conversation(
        presentation_id=request.presentation_id,
        mode=request.mode
    )
    return ConversationResponse(**result)


@router.get("", response_model=list[ConversationResponse])
def list_conversations(
    presentation_id: str | None = None,
    limit: int = 20
) -> list[ConversationResponse]:
    """List recent conversations."""
    results = chat_service.list_conversations(presentation_id, limit)
    return [ConversationResponse(**r) for r in results]


@router.get("/{conversation_id}")
def get_conversation(conversation_id: str):
    """Get a conversation with all messages."""
    result = chat_service.get_conversation(conversation_id)
    if not result:
        raise HTTPException(404, "Conversation not found")
    return result


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
def add_message(conversation_id: str, request: AddMessageRequest) -> MessageResponse:
    """Add a message to a conversation."""
    result = chat_service.add_message(
        conversation_id=conversation_id,
        role=request.role,
        content=request.content,
        thinking=request.thinking,
        extra_data=request.extra_data
    )
    if not result:
        raise HTTPException(404, "Conversation not found")
    return MessageResponse(**result)


@router.delete("/{conversation_id}")
def delete_conversation(conversation_id: str) -> dict:
    """Delete a conversation."""
    success = chat_service.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(404, "Conversation not found")
    return {"message": "Conversation deleted"}
