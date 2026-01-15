"""Database models for presentations."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship

class Base(DeclarativeBase):
    """Base class for all database models."""
    pass

class Presentation(Base):
    """Presentation database model."""

    __tablename__ = "presentations"

    id = Column(String(36), primary_key=True)
    title = Column(String(200), nullable=False, index=True)
    content = Column(Text, nullable=False)
    theme_id = Column(String(50), nullable=True, index=True)
    folder_id = Column(String(36), ForeignKey("folders.id"), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    folder = relationship("Folder", back_populates="presentations")
