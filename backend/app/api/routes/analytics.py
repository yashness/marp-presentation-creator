"""API routes for presentation analytics."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import analytics_service
from app.schemas.analytics import (
    TrackViewRequest, PresentationStats, AnalyticsResponse, TopPresentationStats
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/track-view")
async def track_view(
    request: Request,
    data: TrackViewRequest,
    db: Session = Depends(get_db)
):
    """Track a presentation view."""
    viewer_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    referrer = request.headers.get("referer")

    success = analytics_service.track_view(
        db=db,
        presentation_id=data.presentation_id,
        viewer_ip=viewer_ip,
        user_agent=user_agent,
        referrer=referrer,
        view_duration_seconds=data.view_duration_seconds,
        slides_viewed=data.slides_viewed,
        is_shared_view=data.is_shared_view
    )

    return {"success": success}


@router.post("/track-export/{presentation_id}")
async def track_export(
    presentation_id: str,
    db: Session = Depends(get_db)
):
    """Track a presentation export."""
    success = analytics_service.track_export(db, presentation_id)
    return {"success": success}


@router.get("/stats/{presentation_id}", response_model=PresentationStats)
def get_stats(
    presentation_id: str,
    db: Session = Depends(get_db)
):
    """Get presentation statistics."""
    return analytics_service.get_presentation_stats(db, presentation_id)


@router.get("/{presentation_id}", response_model=AnalyticsResponse)
def get_analytics(
    presentation_id: str,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get full analytics for a presentation."""
    return analytics_service.get_analytics(db, presentation_id, days)


@router.get("/top/presentations", response_model=list[TopPresentationStats])
def get_top_presentations(
    limit: int = 10,
    days: int = 7,
    db: Session = Depends(get_db)
):
    """Get top viewed presentations."""
    return analytics_service.get_top_presentations(db, limit, days)
