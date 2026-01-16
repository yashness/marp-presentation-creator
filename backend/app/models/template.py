"""Database models for presentation templates."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Boolean
from app.models.presentation import Base


class Template(Base):
    """Presentation template database model."""

    __tablename__ = "templates"

    id = Column(String(36), primary_key=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, index=True)
    content = Column(Text, nullable=False)
    theme_id = Column(String(50), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    is_builtin = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
