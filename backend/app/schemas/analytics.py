"""Pydantic schemas for analytics API."""

from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class TrackViewRequest(BaseModel):
    """Request to track a view."""
    presentation_id: str
    view_duration_seconds: int | None = None
    slides_viewed: int | None = None
    is_shared_view: bool = False


class PresentationStats(BaseModel):
    """Overall statistics for a presentation."""

    model_config = ConfigDict(from_attributes=True)

    presentation_id: str
    total_views: int
    unique_viewers: int
    avg_duration_seconds: int | None
    total_exports: int
    share_views: int
    views_today: int
    views_this_week: int
    views_this_month: int


class DailyStatsPoint(BaseModel):
    """Single data point for daily stats."""
    date: date
    views: int
    unique_viewers: int
    exports: int


class AnalyticsResponse(BaseModel):
    """Full analytics response for a presentation."""

    model_config = ConfigDict(from_attributes=True)

    stats: PresentationStats
    daily_data: list[DailyStatsPoint]


class TopPresentationStats(BaseModel):
    """Stats for top presentations list."""
    presentation_id: str
    title: str
    total_views: int
    views_this_week: int
    last_viewed: datetime | None
