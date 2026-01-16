"""Service for tracking and retrieving presentation analytics."""

import uuid
import hashlib
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from loguru import logger

from app.models.analytics import PresentationView, DailyAnalytics
from app.models.presentation import Presentation
from app.schemas.analytics import (
    PresentationStats, DailyStatsPoint, AnalyticsResponse, TopPresentationStats
)


def _hash_ip(ip: str | None) -> str | None:
    """Hash IP for privacy."""
    if not ip:
        return None
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


def track_view(
    db: Session,
    presentation_id: str,
    viewer_ip: str | None = None,
    user_agent: str | None = None,
    referrer: str | None = None,
    view_duration_seconds: int | None = None,
    slides_viewed: int | None = None,
    is_shared_view: bool = False
) -> bool:
    """Track a presentation view."""
    try:
        view = PresentationView(
            id=str(uuid.uuid4()),
            presentation_id=presentation_id,
            viewer_ip=_hash_ip(viewer_ip),
            user_agent=user_agent[:255] if user_agent else None,
            referrer=referrer[:255] if referrer else None,
            view_duration_seconds=view_duration_seconds,
            slides_viewed=slides_viewed,
            is_shared_view=1 if is_shared_view else 0
        )
        db.add(view)

        # Update daily aggregates
        _update_daily_aggregate(db, presentation_id, is_shared_view)

        db.commit()
        logger.debug(f"Tracked view for presentation {presentation_id}")
        return True

    except Exception as e:
        logger.error(f"Failed to track view: {e}")
        db.rollback()
        return False


def _update_daily_aggregate(
    db: Session,
    presentation_id: str,
    is_shared_view: bool
) -> None:
    """Update or create daily aggregate record."""
    today = date.today()
    daily_id = f"{presentation_id}:{today.isoformat()}"

    existing = db.query(DailyAnalytics).filter(
        DailyAnalytics.id == daily_id
    ).first()

    if existing:
        existing.view_count += 1
        if is_shared_view:
            existing.share_views += 1
    else:
        daily = DailyAnalytics(
            id=daily_id,
            presentation_id=presentation_id,
            date=today,
            view_count=1,
            unique_viewers=1,
            share_views=1 if is_shared_view else 0
        )
        db.add(daily)


def track_export(db: Session, presentation_id: str) -> bool:
    """Track a presentation export."""
    try:
        today = date.today()
        daily_id = f"{presentation_id}:{today.isoformat()}"

        existing = db.query(DailyAnalytics).filter(
            DailyAnalytics.id == daily_id
        ).first()

        if existing:
            existing.export_count += 1
        else:
            daily = DailyAnalytics(
                id=daily_id,
                presentation_id=presentation_id,
                date=today,
                view_count=0,
                unique_viewers=0,
                export_count=1
            )
            db.add(daily)

        db.commit()
        return True

    except Exception as e:
        logger.error(f"Failed to track export: {e}")
        db.rollback()
        return False


def get_presentation_stats(db: Session, presentation_id: str) -> PresentationStats:
    """Get overall stats for a presentation."""
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Total views
    total_views = db.query(func.count(PresentationView.id)).filter(
        PresentationView.presentation_id == presentation_id
    ).scalar() or 0

    # Unique viewers (by hashed IP)
    unique_viewers = db.query(func.count(func.distinct(PresentationView.viewer_ip))).filter(
        PresentationView.presentation_id == presentation_id
    ).scalar() or 0

    # Average duration
    avg_duration = db.query(func.avg(PresentationView.view_duration_seconds)).filter(
        and_(
            PresentationView.presentation_id == presentation_id,
            PresentationView.view_duration_seconds.isnot(None)
        )
    ).scalar()

    # Share views
    share_views = db.query(func.count(PresentationView.id)).filter(
        and_(
            PresentationView.presentation_id == presentation_id,
            PresentationView.is_shared_view == 1
        )
    ).scalar() or 0

    # Total exports
    total_exports = db.query(func.sum(DailyAnalytics.export_count)).filter(
        DailyAnalytics.presentation_id == presentation_id
    ).scalar() or 0

    # Views today
    views_today = db.query(func.count(PresentationView.id)).filter(
        and_(
            PresentationView.presentation_id == presentation_id,
            func.date(PresentationView.viewed_at) == today
        )
    ).scalar() or 0

    # Views this week
    views_this_week = db.query(func.count(PresentationView.id)).filter(
        and_(
            PresentationView.presentation_id == presentation_id,
            func.date(PresentationView.viewed_at) >= week_ago
        )
    ).scalar() or 0

    # Views this month
    views_this_month = db.query(func.count(PresentationView.id)).filter(
        and_(
            PresentationView.presentation_id == presentation_id,
            func.date(PresentationView.viewed_at) >= month_ago
        )
    ).scalar() or 0

    return PresentationStats(
        presentation_id=presentation_id,
        total_views=total_views,
        unique_viewers=unique_viewers,
        avg_duration_seconds=int(avg_duration) if avg_duration else None,
        total_exports=total_exports,
        share_views=share_views,
        views_today=views_today,
        views_this_week=views_this_week,
        views_this_month=views_this_month
    )


def get_daily_stats(
    db: Session,
    presentation_id: str,
    days: int = 30
) -> list[DailyStatsPoint]:
    """Get daily stats for the last N days."""
    start_date = date.today() - timedelta(days=days)

    results = db.query(DailyAnalytics).filter(
        and_(
            DailyAnalytics.presentation_id == presentation_id,
            DailyAnalytics.date >= start_date
        )
    ).order_by(DailyAnalytics.date).all()

    return [
        DailyStatsPoint(
            date=r.date,
            views=r.view_count,
            unique_viewers=r.unique_viewers,
            exports=r.export_count or 0
        )
        for r in results
    ]


def get_analytics(
    db: Session,
    presentation_id: str,
    days: int = 30
) -> AnalyticsResponse:
    """Get full analytics for a presentation."""
    stats = get_presentation_stats(db, presentation_id)
    daily_data = get_daily_stats(db, presentation_id, days)

    return AnalyticsResponse(stats=stats, daily_data=daily_data)


def get_top_presentations(
    db: Session,
    limit: int = 10,
    days: int = 7
) -> list[TopPresentationStats]:
    """Get top viewed presentations."""
    start_date = date.today() - timedelta(days=days)

    # Subquery for weekly views
    weekly_views = db.query(
        PresentationView.presentation_id,
        func.count(PresentationView.id).label('weekly_count'),
        func.max(PresentationView.viewed_at).label('last_viewed')
    ).filter(
        func.date(PresentationView.viewed_at) >= start_date
    ).group_by(
        PresentationView.presentation_id
    ).subquery()

    # Total views
    total_views = db.query(
        PresentationView.presentation_id,
        func.count(PresentationView.id).label('total_count')
    ).group_by(
        PresentationView.presentation_id
    ).subquery()

    # Join with presentations
    results = db.query(
        Presentation.id,
        Presentation.title,
        total_views.c.total_count,
        weekly_views.c.weekly_count,
        weekly_views.c.last_viewed
    ).join(
        total_views, Presentation.id == total_views.c.presentation_id
    ).outerjoin(
        weekly_views, Presentation.id == weekly_views.c.presentation_id
    ).order_by(
        weekly_views.c.weekly_count.desc().nullslast()
    ).limit(limit).all()

    return [
        TopPresentationStats(
            presentation_id=r[0],
            title=r[1] or 'Untitled',
            total_views=r[2] or 0,
            views_this_week=r[3] or 0,
            last_viewed=r[4]
        )
        for r in results
    ]
