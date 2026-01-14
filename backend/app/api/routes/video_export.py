"""Video export API routes."""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from loguru import logger

from app.core.database import get_db
from app.services.video_export_service import VideoExportService
from app.models.presentation import Presentation

router = APIRouter(prefix="/video", tags=["video"])
video_service = VideoExportService()


class VideoExportRequest(BaseModel):
    """Request model for video export."""
    voice: str = Field(default="af", description="Voice ID for TTS")
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
