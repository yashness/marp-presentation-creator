"""Database models for folders."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .presentation import Base

class Folder(Base):
    """Folder database model for organizing presentations."""

    __tablename__ = "folders"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    parent_id = Column(String(36), ForeignKey("folders.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    parent = relationship("Folder", remote_side=[id], backref="children")
    presentations = relationship("Presentation", back_populates="folder")
