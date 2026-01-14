"""TTS API routes."""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from loguru import logger

from app.core.database import get_db
from app.services.tts_service import TTSService
from app.models.presentation import Presentation

router = APIRouter(prefix="/tts", tags=["tts"])
tts_service = TTSService()


class TTSRequest(BaseModel):
    """Request model for TTS generation."""
    text: str = Field(..., description="Text to convert to speech")
    voice: str = Field(default="af", description="Voice ID to use")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="Speech speed (0.5-2.0)")


class TTSResponse(BaseModel):
    """Response model for TTS generation."""
    success: bool
    audio_url: str | None = None
    message: str | None = None


class VoicesResponse(BaseModel):
    """Response model for available voices."""
    voices: list[str]


@router.post("/{presentation_id}/slides/{slide_index}", response_model=TTSResponse)
async def generate_audio_for_slide(
    presentation_id: str,
    slide_index: int,
    request: TTSRequest,
    db: Session = Depends(get_db)
) -> TTSResponse:
    """Generate audio for a slide comment.

    Args:
        presentation_id: ID of the presentation
        slide_index: Index of the slide (0-based)
        request: TTS generation request
        db: Database session

    Returns:
        TTS response with audio URL

    Raises:
        HTTPException: If presentation not found or TTS generation fails
    """
    if not tts_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="TTS service is not available. Please ensure Kokoro TTS is installed."
        )

    # Verify presentation exists
    presentation = db.query(Presentation).filter(Presentation.id == presentation_id).first()
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    # Generate audio
    audio_path = tts_service.generate_audio(
        text=request.text,
        presentation_id=presentation_id,
        slide_index=slide_index,
        voice=request.voice,
        speed=request.speed
    )

    if not audio_path:
        return TTSResponse(
            success=False,
            message="Failed to generate audio. Check logs for details."
        )

    # Return relative URL for the audio file
    audio_url = f"/api/tts/{presentation_id}/slides/{slide_index}/audio"

    return TTSResponse(
        success=True,
        audio_url=audio_url,
        message="Audio generated successfully"
    )


@router.get("/{presentation_id}/slides/{slide_index}/audio")
async def get_slide_audio(
    presentation_id: str,
    slide_index: int
) -> FileResponse:
    """Get audio file for a slide.

    Args:
        presentation_id: ID of the presentation
        slide_index: Index of the slide

    Returns:
        Audio file

    Raises:
        HTTPException: If audio file not found
    """
    audio_path = tts_service.get_audio_path(presentation_id, slide_index)

    if not audio_path or not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        path=str(audio_path),
        media_type="audio/wav",
        filename=f"slide_{slide_index}_comment.wav"
    )


@router.delete("/{presentation_id}/audio")
async def delete_presentation_audio(
    presentation_id: str,
    db: Session = Depends(get_db)
) -> dict:
    """Delete all audio files for a presentation.

    Args:
        presentation_id: ID of the presentation
        db: Database session

    Returns:
        Success status

    Raises:
        HTTPException: If presentation not found
    """
    # Verify presentation exists
    presentation = db.query(Presentation).filter(Presentation.id == presentation_id).first()
    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    success = tts_service.delete_presentation_audio(presentation_id)

    return {
        "success": success,
        "message": "Audio files deleted" if success else "No audio files found"
    }


@router.get("/voices", response_model=VoicesResponse)
async def list_voices() -> VoicesResponse:
    """List available TTS voices.

    Returns:
        List of available voice IDs
    """
    voices = tts_service.list_available_voices()
    return VoicesResponse(voices=voices)


@router.get("/status")
async def get_tts_status() -> dict:
    """Get TTS service status.

    Returns:
        TTS service status information
    """
    return {
        "available": tts_service.is_available(),
        "message": "TTS service is ready" if tts_service.is_available() else "TTS service is not available"
    }
