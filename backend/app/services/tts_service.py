"""Text-to-Speech service using Kokoro TTS."""

import os
from pathlib import Path
from typing import Optional
from loguru import logger

try:
    from kokoro import KPipeline
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
        self._pipeline = None
        self._initialized = False

    def _ensure_pipeline(self) -> bool:
        """Ensure pipeline is initialized (lazy loading).

        Returns:
            True if pipeline is ready, False otherwise
        """
        if self._initialized:
            return self._pipeline is not None

        self._initialized = True

        if not KOKORO_AVAILABLE:
            logger.error("Kokoro TTS is not available. Audio generation will be disabled.")
            return False

        try:
            logger.info("Initializing Kokoro TTS pipeline...")
            self._pipeline = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
            logger.info("Kokoro TTS initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Kokoro TTS: {e}")
            self._pipeline = None
            return False

    def is_available(self) -> bool:
        """Check if TTS service is available."""
        return KOKORO_AVAILABLE and self._ensure_pipeline()

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

            # Generate speech - pipeline returns a generator
            generator = self._pipeline(
                text,
                voice=voice,
                speed=speed,
                split_pattern=r'\n+'
            )

            # Collect all audio chunks
            audio_chunks = []
            for i, (gs, ps, audio) in enumerate(generator):
                audio_chunks.append(audio)

            # Concatenate all audio chunks if multiple
            if len(audio_chunks) == 1:
                audio_data = audio_chunks[0]
            else:
                import numpy as np
                audio_data = np.concatenate(audio_chunks)

            # Save to file with 24kHz sample rate (Kokoro's output rate)
            sf.write(str(filepath), audio_data, 24000)

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
        # Kokoro TTS voices - actual available voices from the model
        return [
            "af",           # American Female
            "af_bella",     # American Female - Bella
            "af_heart",     # American Female - Heart
            "af_nicole",    # American Female - Nicole
            "af_sarah",     # American Female - Sarah
            "af_sky",       # American Female - Sky
            "am_adam",      # American Male - Adam
            "am_michael",   # American Male - Michael
            "bf_emma",      # British Female - Emma
            "bf_isabella",  # British Female - Isabella
            "bm_george",    # British Male - George
            "bm_lewis",     # British Male - Lewis
        ]
