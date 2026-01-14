"""Text-to-Speech service using Kokoro TTS."""

import os
from pathlib import Path
from typing import Optional
from loguru import logger

try:
    import kokoro
    import soundfile as sf
    KOKORO_AVAILABLE = True
except ImportError:
    KOKORO_AVAILABLE = False
    logger.warning("Kokoro TTS not available. Install with: pip install kokoro soundfile")


class TTSService:
    """Service for generating audio from text using Kokoro TTS."""

    def __init__(self, audio_dir: str = "data/audio"):
        """Initialize TTS service.

        Args:
            audio_dir: Directory to store generated audio files
        """
        self.audio_dir = Path(audio_dir)
        self.audio_dir.mkdir(parents=True, exist_ok=True)

        if not KOKORO_AVAILABLE:
            logger.error("Kokoro TTS is not available. Audio generation will be disabled.")
            return

        try:
            self.pipeline = kokoro.Pipeline()
            logger.info("Kokoro TTS initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Kokoro TTS: {e}")
            self.pipeline = None

    def is_available(self) -> bool:
        """Check if TTS service is available."""
        return KOKORO_AVAILABLE and self.pipeline is not None

    def generate_audio(
        self,
        text: str,
        presentation_id: str,
        slide_index: int,
        voice: str = "af",
        speed: float = 1.0
    ) -> Optional[str]:
        """Generate audio from text.

        Args:
            text: Text to convert to speech
            presentation_id: ID of the presentation
            slide_index: Index of the slide
            voice: Voice to use (default: 'af' - American Female)
            speed: Speech speed (default: 1.0)

        Returns:
            Path to generated audio file, or None if generation failed
        """
        if not self.is_available():
            logger.error("TTS service is not available")
            return None

        if not text or not text.strip():
            logger.warning("Empty text provided for TTS generation")
            return None

        try:
            # Create subdirectory for this presentation
            pres_audio_dir = self.audio_dir / presentation_id
            pres_audio_dir.mkdir(parents=True, exist_ok=True)

            # Generate filename
            filename = f"slide_{slide_index}_comment.wav"
            filepath = pres_audio_dir / filename

            # Generate audio using Kokoro
            logger.info(f"Generating audio for slide {slide_index} with voice '{voice}' and speed {speed}")

            # Generate speech
            audio_data, sample_rate = self.pipeline(
                text,
                voice=voice,
                speed=speed
            )

            # Save to file
            sf.write(str(filepath), audio_data, sample_rate)

            logger.info(f"Audio generated successfully: {filepath}")
            return str(filepath.relative_to(self.audio_dir.parent))

        except Exception as e:
            logger.error(f"Failed to generate audio: {e}")
            return None

    def delete_presentation_audio(self, presentation_id: str) -> bool:
        """Delete all audio files for a presentation.

        Args:
            presentation_id: ID of the presentation

        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            pres_audio_dir = self.audio_dir / presentation_id
            if pres_audio_dir.exists():
                import shutil
                shutil.rmtree(pres_audio_dir)
                logger.info(f"Deleted audio directory for presentation {presentation_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete audio directory: {e}")
            return False

    def get_audio_path(self, presentation_id: str, slide_index: int) -> Optional[Path]:
        """Get path to audio file for a specific slide.

        Args:
            presentation_id: ID of the presentation
            slide_index: Index of the slide

        Returns:
            Path to audio file if it exists, None otherwise
        """
        filepath = self.audio_dir / presentation_id / f"slide_{slide_index}_comment.wav"
        return filepath if filepath.exists() else None

    def list_available_voices(self) -> list[str]:
        """List all available voices.

        Returns:
            List of available voice IDs
        """
        # Kokoro TTS supports multiple voices across different languages
        # These are the common voices, but the actual list may vary
        return [
            "af",      # American Female
            "am",      # American Male
            "bf",      # British Female
            "bm",      # British Male
            "af_sarah",  # American Female - Sarah
            "am_adam",   # American Male - Adam
            "bf_emma",   # British Female - Emma
            "bm_george", # British Male - George
        ]
