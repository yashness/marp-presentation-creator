"""Database models for presentations."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Presentation(Base):
    """Presentation database model."""

    __tablename__ = "presentations"

    id = Column(String(36), primary_key=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    theme_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
