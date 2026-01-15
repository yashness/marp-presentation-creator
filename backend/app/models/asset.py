"""Database model for assets."""

from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.sql import func
from app.models.presentation import Base


class Asset(Base):
    """Asset model for storing uploaded files (logos, images, etc)."""

    __tablename__ = "assets"

    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
