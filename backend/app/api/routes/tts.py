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
    voice: str = Field(default="af_bella", description="Voice ID to use")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="Speech speed (0.5-2.0)")


class TTSResponse(BaseModel):
    """Response model for TTS generation."""
    success: bool
    audio_url: str | None = None
    message: str | None = None


class VoicesResponse(BaseModel):
    """Response model for available voices."""
    voices: list[str]


class AudioFileInfo(BaseModel):
    """Audio file information."""
    slide_index: int
    audio_url: str
    file_size: int


class HashAudioInfo(BaseModel):
    """Audio file info keyed by content hash."""
    content_hash: str
    audio_url: str
    file_size: int


class AudioListResponse(BaseModel):
    """Response for listing audio files."""
    presentation_id: str
    audio_files: list[AudioFileInfo]
    total: int


class HashAudioListResponse(BaseModel):
    """Response for hash-based audio listing."""
    presentation_id: str
    audio_files: list[HashAudioInfo]
    total: int


class HashTTSRequest(BaseModel):
    """Request for hash-based TTS generation."""
    text: str = Field(..., description="Text to convert to speech")
    content_hash: str = Field(..., description="Hash of the content for stable file naming")
    voice: str = Field(default="af_bella", description="Voice ID to use")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="Speech speed")


class HashTTSResponse(BaseModel):
    """Response for hash-based TTS generation."""
    success: bool
    content_hash: str | None = None
    audio_url: str | None = None
    message: str | None = None


@router.get("/{presentation_id}/audio", response_model=AudioListResponse)
async def list_presentation_audio(
    presentation_id: str,
    db: Session = Depends(get_db)
) -> AudioListResponse:
    """List all audio files for a presentation.

    Args:
        presentation_id: ID of the presentation
        db: Database session

    Returns:
        List of audio files with their metadata

    Raises:
        HTTPException: If presentation not found
    """
    # Verify presentation exists
    presentation = db.query(Presentation).filter(
        Presentation.id == presentation_id
    ).first()

    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    audio_files = []
    audio_dir = tts_service.audio_dir / presentation_id

    if audio_dir.exists():
        for audio_file in sorted(audio_dir.glob("slide_*_comment.wav")):
            # Extract slide index from filename
            import re
            match = re.match(r"slide_(\d+)_comment\.wav", audio_file.name)
            if match:
                slide_index = int(match.group(1))
                audio_files.append(AudioFileInfo(
                    slide_index=slide_index,
                    audio_url=f"/api/tts/{presentation_id}/slides/{slide_index}/audio",
                    file_size=audio_file.stat().st_size
                ))

    return AudioListResponse(
        presentation_id=presentation_id,
        audio_files=audio_files,
        total=len(audio_files)
    )


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


@router.head("/{presentation_id}/slides/{slide_index}/audio")
async def check_slide_audio_exists(
    presentation_id: str,
    slide_index: int
) -> None:
    """Check if audio file exists for a slide (HEAD request).

    Args:
        presentation_id: ID of the presentation
        slide_index: Index of the slide

    Raises:
        HTTPException: 404 if audio file not found, 204 if exists
    """
    audio_path = tts_service.get_audio_path(presentation_id, slide_index)

    if not audio_path or not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    # Return empty response with 200 (HEAD requests don't have body)
    return None


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


@router.get("/preview/{voice_id}")
async def preview_voice(voice_id: str) -> FileResponse:
    """Preview a voice with a sample phrase.

    Args:
        voice_id: Voice ID to preview

    Returns:
        Audio file with sample phrase

    Raises:
        HTTPException: If voice preview generation fails
    """
    if not tts_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="TTS service is not available."
        )

    # Generate preview audio with a sample phrase
    sample_text = "Hello! This is a sample of how this voice sounds. Perfect for presentations."
    audio_path = tts_service.generate_voice_preview(voice_id, sample_text)

    if not audio_path or not audio_path.exists():
        raise HTTPException(
            status_code=500,
            detail="Failed to generate voice preview"
        )

    return FileResponse(
        path=str(audio_path),
        media_type="audio/wav",
        filename=f"voice_preview_{voice_id}.wav"
    )


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


# ============================================================================
# Content-hash based endpoints (stable across slide reordering)
# ============================================================================


@router.get("/{presentation_id}/audio/by-hash", response_model=HashAudioListResponse)
async def list_audio_by_hash(
    presentation_id: str,
    db: Session = Depends(get_db)
) -> HashAudioListResponse:
    """List all audio files for a presentation by content hash.

    This endpoint returns audio keyed by content hash, which is stable
    across slide reordering operations.

    Args:
        presentation_id: ID of the presentation
        db: Database session

    Returns:
        List of audio files with their content hashes
    """
    presentation = db.query(Presentation).filter(
        Presentation.id == presentation_id
    ).first()

    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    audio_files = tts_service.list_audio_by_hash(presentation_id)

    return HashAudioListResponse(
        presentation_id=presentation_id,
        audio_files=[
            HashAudioInfo(
                content_hash=f["content_hash"],
                audio_url=f"/api/tts/{presentation_id}/audio/hash/{f['content_hash']}",
                file_size=f["file_size"]
            )
            for f in audio_files
        ],
        total=len(audio_files)
    )


@router.post("/{presentation_id}/audio/generate", response_model=HashTTSResponse)
async def generate_audio_by_hash(
    presentation_id: str,
    request: HashTTSRequest,
    db: Session = Depends(get_db)
) -> HashTTSResponse:
    """Generate audio using content hash for stable file naming.

    Audio files are named by their content hash, so reordering slides
    won't break audio associations. If audio for this content already
    exists, it returns the existing file without regeneration.

    Args:
        presentation_id: ID of the presentation
        request: TTS request with content hash
        db: Database session

    Returns:
        TTS response with content hash and audio URL
    """
    if not tts_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="TTS service is not available."
        )

    presentation = db.query(Presentation).filter(
        Presentation.id == presentation_id
    ).first()

    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    audio_path = tts_service.generate_audio_with_hash(
        text=request.text,
        presentation_id=presentation_id,
        content_hash=request.content_hash,
        voice=request.voice,
        speed=request.speed
    )

    if not audio_path:
        return HashTTSResponse(
            success=False,
            message="Failed to generate audio. Check logs for details."
        )

    audio_url = f"/api/tts/{presentation_id}/audio/hash/{request.content_hash}"

    return HashTTSResponse(
        success=True,
        content_hash=request.content_hash,
        audio_url=audio_url,
        message="Audio generated successfully"
    )


@router.head("/{presentation_id}/audio/hash/{content_hash}")
async def check_audio_exists_by_hash(
    presentation_id: str,
    content_hash: str
) -> None:
    """Check if audio exists for a given content hash.

    Args:
        presentation_id: ID of the presentation
        content_hash: Hash of the content

    Raises:
        HTTPException: 404 if not found
    """
    audio_path = tts_service.get_audio_by_hash(presentation_id, content_hash)

    if not audio_path:
        raise HTTPException(status_code=404, detail="Audio file not found")

    return None


@router.get("/{presentation_id}/audio/hash/{content_hash}")
async def get_audio_by_hash(
    presentation_id: str,
    content_hash: str
) -> FileResponse:
    """Get audio file by content hash.

    Args:
        presentation_id: ID of the presentation
        content_hash: Hash of the content

    Returns:
        Audio file

    Raises:
        HTTPException: If audio file not found
    """
    audio_path = tts_service.get_audio_by_hash(presentation_id, content_hash)

    if not audio_path:
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        path=str(audio_path),
        media_type="audio/wav",
        filename=f"audio_{content_hash}.wav"
    )


@router.get("/hash/{text}")
async def compute_content_hash(text: str) -> dict:
    """Compute content hash for text.

    Utility endpoint for frontend to compute hash client-side
    validation or pre-checking.

    Args:
        text: Text to hash

    Returns:
        The computed hash
    """
    content_hash = tts_service.compute_content_hash(text)
    return {"content_hash": content_hash}


# ============================================================================
# Cleanup endpoints for orphaned assets
# ============================================================================


class CleanupRequest(BaseModel):
    """Request for cleanup with valid hashes."""
    valid_hashes: list[str] = Field(
        default_factory=list,
        description="List of content hashes still in use"
    )


@router.post("/cleanup/orphaned-presentations")
async def cleanup_orphaned_presentations(
    db: Session = Depends(get_db)
) -> dict:
    """Clean up audio files for presentations that no longer exist.

    This removes all audio directories for presentations that have
    been deleted from the database.

    Returns:
        Cleanup statistics
    """
    # Get all valid presentation IDs
    valid_ids = [p.id for p in db.query(Presentation.id).all()]

    stats = tts_service.cleanup_orphaned_audio(valid_ids)

    return {
        "success": True,
        "message": f"Cleaned up {stats['dirs_removed']} orphaned directories",
        **stats
    }


@router.post("/{presentation_id}/cleanup/stale-audio")
async def cleanup_stale_audio(
    presentation_id: str,
    request: CleanupRequest,
    db: Session = Depends(get_db)
) -> dict:
    """Clean up audio files with hashes no longer in use.

    Call this after restructuring slides to remove audio files
    that are no longer associated with any slide comment.

    Args:
        presentation_id: ID of the presentation
        request: List of valid content hashes

    Returns:
        Cleanup statistics
    """
    presentation = db.query(Presentation).filter(
        Presentation.id == presentation_id
    ).first()

    if not presentation:
        raise HTTPException(status_code=404, detail="Presentation not found")

    stats = tts_service.cleanup_stale_audio_for_presentation(
        presentation_id,
        request.valid_hashes
    )

    return {
        "success": True,
        "message": f"Cleaned up {stats['files_removed']} stale audio files",
        **stats
    }
