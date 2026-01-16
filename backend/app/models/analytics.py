"""Database model for presentation analytics."""

from sqlalchemy import Column, String, Integer, DateTime, Date, ForeignKey
from sqlalchemy.sql import func
from app.models.presentation import Base


class PresentationView(Base):
    """Track individual presentation views."""

    __tablename__ = "presentation_views"

    id = Column(String, primary_key=True)
    presentation_id = Column(String, ForeignKey("presentations.id"), nullable=False, index=True)
    viewer_ip = Column(String, nullable=True)  # Anonymized/hashed for privacy
    user_agent = Column(String, nullable=True)
    referrer = Column(String, nullable=True)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())
    view_duration_seconds = Column(Integer, nullable=True)
    slides_viewed = Column(Integer, nullable=True)
    is_shared_view = Column(Integer, default=0)  # 1 if via share link


class DailyAnalytics(Base):
    """Aggregated daily analytics for presentations."""

    __tablename__ = "daily_analytics"

    id = Column(String, primary_key=True)
    presentation_id = Column(String, ForeignKey("presentations.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    view_count = Column(Integer, default=0)
    unique_viewers = Column(Integer, default=0)
    avg_duration_seconds = Column(Integer, nullable=True)
    total_slides_viewed = Column(Integer, default=0)
    share_views = Column(Integer, default=0)
    export_count = Column(Integer, default=0)

    __table_args__ = (
        # Unique constraint on presentation + date
        {'sqlite_autoincrement': True},
    )
