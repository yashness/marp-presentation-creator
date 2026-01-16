"""Database model for slide audio files."""

from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.models.presentation import Base


class SlideAudio(Base):
    """Tracks generated audio files with content-hash for reliable mapping.

    Audio files are keyed by the hash of the slide comment content,
    so reordering slides doesn't break audio associations.
    """

    __tablename__ = "slide_audio"

    id = Column(String(36), primary_key=True)
    presentation_id = Column(
        String(36),
        ForeignKey("presentations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    content_hash = Column(String(64), nullable=False, index=True)
    slide_index = Column(Integer, nullable=False)
    comment_text = Column(Text, nullable=False)
    voice = Column(String(50), nullable=False, default="af_bella")
    speed = Column(String(10), nullable=False, default="1.0")
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    # Relationship to presentation
    presentation = relationship("Presentation", backref="audio_files")

    def __repr__(self) -> str:
        return f"<SlideAudio {self.id} hash={self.content_hash[:8]}...>"
