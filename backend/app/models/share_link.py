"""Database model for presentation share links."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.presentation import Base


class ShareLink(Base):
    """Share link for public presentation access."""

    __tablename__ = "share_links"

    id = Column(String(36), primary_key=True)
    presentation_id = Column(String(36), ForeignKey("presentations.id"), nullable=False, index=True)
    token = Column(String(64), unique=True, nullable=False, index=True)
    is_public = Column(Boolean, default=True, nullable=False)
    password_hash = Column(String(128), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    view_count = Column(String(20), default="0", nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    presentation = relationship("Presentation", backref="share_links")
