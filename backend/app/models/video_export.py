"""Database model for video exports."""

from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.models.presentation import Base


class VideoExport(Base):
    """Tracks exported videos with content-hash for version tracking.

    Videos are keyed by a hash of the presentation content + audio config,
    so we know if a video is stale when content changes.
    """

    __tablename__ = "video_exports"

    id = Column(String(36), primary_key=True)
    presentation_id = Column(
        String(36),
        ForeignKey("presentations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    content_hash = Column(String(64), nullable=False, index=True)
    voice = Column(String(50), nullable=False, default="af_bella")
    speed = Column(String(10), nullable=False, default="1.0")
    slide_duration = Column(String(10), nullable=False, default="5.0")
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    slide_count = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False, default="completed")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    # Relationship to presentation
    presentation = relationship("Presentation", backref="video_exports")

    def __repr__(self) -> str:
        return f"<VideoExport {self.id} status={self.status}>"
