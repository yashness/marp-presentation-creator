"""Database models for presentation versioning/checkpoints."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from .presentation import Base


class PresentationVersion(Base):
    """Presentation version for undo/checkpointing."""

    __tablename__ = "presentation_versions"

    id = Column(String(36), primary_key=True)
    presentation_id = Column(String(36), ForeignKey("presentations.id"), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    theme_id = Column(String(50), nullable=True)
    checkpoint_name = Column(String(100), nullable=True)  # Optional label
    created_at = Column(DateTime, nullable=False, default=datetime.now)

    presentation = relationship("Presentation", backref="versions")
