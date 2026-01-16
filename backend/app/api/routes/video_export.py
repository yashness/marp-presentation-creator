"""Video export API routes."""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from loguru import logger

from app.core.database import get_db
from app.services.video_export_service import VideoExportService, JobStatus
from app.models.presentation import Presentation

router = APIRouter(prefix="/video", tags=["video"])
video_service = VideoExportService()


class VideoExportRequest(BaseModel):
    """Request model for video export."""
    voice: str = Field(default="af_bella", description="Voice ID for TTS")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="Speech speed")
    slide_duration: float = Field(default=5.0, ge=1.0, le=30.0, description="Duration for slides without audio (seconds)")


class VideoExportResponse(BaseModel):
    """Response model for video export."""
    success: bool
    video_url: str | None = None
    message: str


class VideoStatusResponse(BaseModel):
    """Response model for video status."""
    available: bool
    message: str


class VideoInfo(BaseModel):
    """Video file information."""
    presentation_id: str
    presentation_title: str
    video_url: str
    file_size: int
    created_at: str


class VideoListResponse(BaseModel):
    """Response for listing available videos."""
    videos: list[VideoInfo]
    total: int


class VideoExistsResponse(BaseModel):
    """Response for checking if video exists."""
    exists: bool
    video_url: str | None = None
    file_size: int | None = None
    active_job_id: str | None = None


class VideoExportStartResponse(BaseModel):
    """Response for starting async video export."""
    job_id: str
    message: str


class VideoJobProgressResponse(BaseModel):
    """Response for video job progress."""
    job_id: str
    status: str
    progress: int
    current_stage: str
    total_slides: int
    processed_slides: int
    error: str | None = None
    video_url: str | None = None


@router.get("/list", response_model=VideoListResponse)
async def list_available_videos(
    db: Session = Depends(get_db)
) -> VideoListResponse:
    """List all available exported videos.

    Returns:
        List of videos with their metadata
    """
    from datetime import datetime
    import os

    videos = []
    video_dir = video_service.video_dir

    if video_dir.exists():
        for video_file in video_dir.glob("*.mp4"):
            presentation_id = video_file.stem

            # Get presentation title
            presentation = db.query(Presentation).filter(
                Presentation.id == presentation_id
            ).first()

            if presentation:
                stat = video_file.stat()
                videos.append(VideoInfo(
                    presentation_id=presentation_id,
                    presentation_title=presentation.title,
                    video_url=f"/api/video/{presentation_id}/download",
                    file_size=stat.st_size,
                    created_at=datetime.fromtimestamp(stat.st_mtime).isoformat()
                ))

    # Sort by creation date (newest first)
    videos.sort(key=lambda v: v.created_at, reverse=True)

    return VideoListResponse(videos=videos, total=len(videos))


@router.get("/{presentation_id}/exists", response_model=VideoExistsResponse)
async def check_video_exists(
    presentation_id: str
) -> VideoExistsResponse:
    """Check if a video exists for a presentation.

    Args:
        presentation_id: ID of the presentation

    Returns:
        Whether video exists, its URL, and any active export job
    """
    active_job = video_service.get_active_job_for_presentation(presentation_id)
    active_job_id = active_job.job_id if active_job else None

    video_path = video_service.get_video_path(presentation_id)

    if video_path and video_path.exists():
        return VideoExistsResponse(
            exists=True,
            video_url=f"/api/video/{presentation_id}/download",
            file_size=video_path.stat().st_size,
            active_job_id=active_job_id
        )

    return VideoExistsResponse(exists=False, active_job_id=active_job_id)


@router.post("/{presentation_id}/export", response_model=VideoExportResponse)
async def export_presentation_as_video(
    presentation_id: str,
    request: VideoExportRequest,
    db: Session = Depends(get_db)
) -> VideoExportResponse:
    """Export presentation as video.

    Creates a video by:
    1. Rendering each slide as an image
    2. Generating TTS audio for slide comments
    3. Combining images and audio into video segments
    4. Concatenating all segments into final video

    Args:
        presentation_id: ID of the presentation
        request: Video export configuration
        db: Database session

    Returns:
        Video export response with download URL

    Raises:
        HTTPException: If presentation not found or export fails
    """
    # Verify presentation exists
    presentation = db.query(Presentation).filter(
        Presentation.id == presentation_id
    ).first()

    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    logger.info(f"Starting video export for presentation {presentation_id}")

    # Export video
    video_path = video_service.export_video(
        presentation_id=presentation_id,
        content=presentation.content,
        theme_id=presentation.theme_id,
        voice=request.voice,
        speed=request.speed,
        slide_duration=request.slide_duration
    )

    if not video_path:
        return VideoExportResponse(
            success=False,
            message="Failed to export video. Check server logs for details."
        )

    video_url = f"/api/video/{presentation_id}/download"

    return VideoExportResponse(
        success=True,
        video_url=video_url,
        message="Video exported successfully"
    )


@router.get("/{presentation_id}/download")
async def download_video(
    presentation_id: str,
    db: Session = Depends(get_db)
) -> FileResponse:
    """Download exported video file.

    Args:
        presentation_id: ID of the presentation
        db: Database session

    Returns:
        Video file

    Raises:
        HTTPException: If presentation or video not found
    """
    # Verify presentation exists
    presentation = db.query(Presentation).filter(
        Presentation.id == presentation_id
    ).first()

    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    # Get video path
    video_path = video_service.get_video_path(presentation_id)

    if not video_path or not video_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Video not found. Please export the video first."
        )

    return FileResponse(
        path=str(video_path),
        media_type="video/mp4",
        filename=f"{presentation.title}.mp4"
    )


@router.delete("/{presentation_id}")
async def delete_video(
    presentation_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Delete exported video file.

    Args:
        presentation_id: ID of the presentation
        db: Database session

    Returns:
        Success status

    Raises:
        HTTPException: If presentation not found
    """
    # Verify presentation exists
    presentation = db.query(Presentation).filter(
        Presentation.id == presentation_id
    ).first()

    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    success = video_service.delete_video(presentation_id)

    return {
        "success": success,
        "message": "Video deleted" if success else "Video not found"
    }


@router.get("/status", response_model=VideoStatusResponse)
async def get_video_export_status() -> VideoStatusResponse:
    """Get video export service status.

    Checks if required dependencies (ffmpeg, npx) are available.

    Returns:
        Service status
    """
    available, msg = video_service._check_dependencies()

    return VideoStatusResponse(
        available=available,
        message="Video export service is ready" if available else f"Missing dependency: {msg}"
    )


@router.post("/{presentation_id}/export-async", response_model=VideoExportStartResponse)
async def start_async_video_export(
    presentation_id: str,
    request: VideoExportRequest,
    db: Session = Depends(get_db)
) -> VideoExportStartResponse:
    """Start async video export and return job ID for polling.

    Args:
        presentation_id: ID of the presentation
        request: Video export configuration
        db: Database session

    Returns:
        Job ID to use for polling progress

    Raises:
        HTTPException: If presentation not found or export already in progress
    """
    presentation = db.query(Presentation).filter(
        Presentation.id == presentation_id
    ).first()

    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    # Check if export already in progress
    active_job = video_service.get_active_job_for_presentation(presentation_id)
    if active_job:
        raise HTTPException(
            status_code=409,
            detail=f"Export already in progress (job: {active_job.job_id})"
        )

    logger.info(f"Starting async video export for presentation {presentation_id}")

    job_id = video_service.start_background_export(
        presentation_id=presentation_id,
        content=presentation.content,
        theme_id=presentation.theme_id,
        voice=request.voice,
        speed=request.speed,
        slide_duration=request.slide_duration
    )

    return VideoExportStartResponse(
        job_id=job_id,
        message="Video export started"
    )


@router.get("/job/{job_id}/progress", response_model=VideoJobProgressResponse)
async def get_job_progress(job_id: str) -> VideoJobProgressResponse:
    """Get progress of a video export job.

    Args:
        job_id: The job ID returned from export-async

    Returns:
        Current job progress and status

    Raises:
        HTTPException: If job not found
    """
    job = video_service.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return VideoJobProgressResponse(
        job_id=job.job_id,
        status=job.status.value,
        progress=job.progress,
        current_stage=job.current_stage,
        total_slides=job.total_slides,
        processed_slides=job.processed_slides,
        error=job.error,
        video_url=job.video_url
    )


@router.post("/job/{job_id}/cancel")
async def cancel_job(job_id: str) -> dict:
    """Cancel a running video export job.

    Args:
        job_id: The job ID to cancel

    Returns:
        Success status

    Raises:
        HTTPException: If job not found or cannot be cancelled
    """
    job = video_service.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.RUNNING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel job with status: {job.status.value}"
        )

    success = video_service.cancel_job(job_id)

    return {
        "success": success,
        "message": "Cancellation requested" if success else "Failed to cancel job"
    }
