"""Database model for custom themes."""

from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, JSON
from app.models.presentation import Base

class Theme(Base):
    """Custom theme database model."""

    __tablename__ = "themes"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_builtin = Column(Boolean, default=False, nullable=False)

    colors = Column(JSON, nullable=False)
    typography = Column(JSON, nullable=False)
    spacing = Column(JSON, nullable=False)

    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
