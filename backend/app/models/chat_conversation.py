"""Database models for chat conversations."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from .presentation import Base


class ChatConversation(Base):
    """Chat conversation model for multi-turn memory."""

    __tablename__ = "chat_conversations"

    id = Column(String(36), primary_key=True)
    presentation_id = Column(String(36), ForeignKey("presentations.id"), nullable=True)
    mode = Column(String(20), nullable=False, default="general")
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Individual chat message model."""

    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True)
    conversation_id = Column(String(36), ForeignKey("chat_conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user or assistant
    content = Column(Text, nullable=False)
    thinking = Column(Text, nullable=True)
    message_order = Column(Integer, nullable=False, default=0)
    extra_data = Column(JSON, nullable=True)  # For parsed outlines, context info, etc.
    created_at = Column(DateTime, nullable=False, default=datetime.now)

    conversation = relationship("ChatConversation", back_populates="messages")
