"""Database model for custom fonts."""

from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.sql import func
from app.models.presentation import Base


class Font(Base):
    """Font model for storing uploaded font files."""

    __tablename__ = "fonts"

    id = Column(String, primary_key=True)
    family_name = Column(String, nullable=False, index=True)
    style = Column(String, default="normal")  # normal, italic
    weight = Column(String, default="400")  # 100-900 or descriptive
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
