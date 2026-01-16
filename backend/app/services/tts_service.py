"""Text-to-Speech service using Kokoro TTS."""

import hashlib
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
            # lang_code 'a' uses American dictionary; repo provides default voice set.
            self._pipeline = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
            logger.info("Kokoro TTS initialized successfully")
            return True
        except SystemExit as exc:
            # Some kokoro dependencies attempt to sys.exit when spaCy model download fails.
            logger.error(f"Kokoro TTS initialization aborted (dependency missing). Details: {exc}")
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
        voice: str = "af_bella",
        speed: float = 1.0,
    ) -> Optional[str]:
        """Generate audio from text.

        Args:
            text: Text to convert to speech
            presentation_id: ID of the presentation
            slide_index: Index of the slide
            voice: Voice to use (default: 'af_bella' - American Female)
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
            # Return absolute path for use in FFmpeg and other tools
            return str(filepath)

        except Exception as e:
            # Fallback if default voice asset is missing on HF
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

    @staticmethod
    def compute_content_hash(text: str) -> str:
        """Compute a stable hash for content.

        Args:
            text: The content text to hash

        Returns:
            A 16-character hex hash
        """
        return hashlib.sha256(text.encode('utf-8')).hexdigest()[:16]

    def get_audio_by_hash(self, presentation_id: str, content_hash: str) -> Optional[Path]:
        """Get audio file by content hash.

        Args:
            presentation_id: ID of the presentation
            content_hash: Hash of the slide comment content

        Returns:
            Path to audio file if it exists, None otherwise
        """
        pres_dir = self.audio_dir / presentation_id
        if not pres_dir.exists():
            return None

        # Look for audio file with this hash
        filepath = pres_dir / f"audio_{content_hash}.wav"
        return filepath if filepath.exists() else None

    def generate_audio_with_hash(
        self,
        text: str,
        presentation_id: str,
        content_hash: str,
        voice: str = "af_bella",
        speed: float = 1.0,
    ) -> Optional[str]:
        """Generate audio with content-hash based filename.

        Args:
            text: Text to convert to speech
            presentation_id: ID of the presentation
            content_hash: Hash of the content (for stable file naming)
            voice: Voice to use
            speed: Speech speed

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

            # Generate filename based on content hash
            filename = f"audio_{content_hash}.wav"
            filepath = pres_audio_dir / filename

            # Check if already exists (content hasn't changed)
            if filepath.exists():
                logger.info(f"Audio already exists for hash {content_hash}")
                return str(filepath)

            # Generate audio using Kokoro
            logger.info(f"Generating audio for hash {content_hash}")

            generator = self._pipeline(
                text,
                voice=voice,
                speed=speed,
                split_pattern=r'\n+'
            )

            audio_chunks = []
            for i, (gs, ps, audio) in enumerate(generator):
                audio_chunks.append(audio)

            if len(audio_chunks) == 1:
                audio_data = audio_chunks[0]
            else:
                import numpy as np
                audio_data = np.concatenate(audio_chunks)

            sf.write(str(filepath), audio_data, 24000)

            logger.info(f"Audio generated successfully: {filepath}")
            return str(filepath)

        except Exception as e:
            logger.error(f"Failed to generate audio: {e}")
            return None

    def list_audio_by_hash(self, presentation_id: str) -> list[dict]:
        """List all audio files for a presentation with their hashes.

        Args:
            presentation_id: ID of the presentation

        Returns:
            List of dicts with content_hash, file_path, file_size
        """
        pres_dir = self.audio_dir / presentation_id
        if not pres_dir.exists():
            return []

        audio_files = []
        for audio_file in pres_dir.glob("audio_*.wav"):
            # Extract hash from filename
            hash_part = audio_file.stem.replace("audio_", "")
            audio_files.append({
                "content_hash": hash_part,
                "file_path": str(audio_file),
                "file_size": audio_file.stat().st_size,
            })

        return audio_files

    def cleanup_orphaned_audio(self, valid_presentation_ids: list[str]) -> dict:
        """Clean up audio files for presentations that no longer exist.

        Args:
            valid_presentation_ids: List of presentation IDs that still exist

        Returns:
            Dict with cleanup stats
        """
        import shutil

        cleaned_dirs = 0
        cleaned_files = 0
        total_bytes_freed = 0

        if not self.audio_dir.exists():
            return {"dirs_removed": 0, "files_removed": 0, "bytes_freed": 0}

        for pres_dir in self.audio_dir.iterdir():
            if pres_dir.is_dir() and pres_dir.name.startswith("_"):
                # Skip special dirs like _previews
                continue

            if pres_dir.is_dir() and pres_dir.name not in valid_presentation_ids:
                # Count files before removal
                for audio_file in pres_dir.glob("*.wav"):
                    cleaned_files += 1
                    total_bytes_freed += audio_file.stat().st_size

                shutil.rmtree(pres_dir)
                cleaned_dirs += 1
                logger.info(f"Cleaned up orphaned audio dir: {pres_dir.name}")

        return {
            "dirs_removed": cleaned_dirs,
            "files_removed": cleaned_files,
            "bytes_freed": total_bytes_freed,
        }

    def cleanup_stale_audio_for_presentation(
        self,
        presentation_id: str,
        valid_hashes: list[str]
    ) -> dict:
        """Clean up audio files with hashes that are no longer used.

        Args:
            presentation_id: ID of the presentation
            valid_hashes: List of content hashes that are still in use

        Returns:
            Dict with cleanup stats
        """
        pres_dir = self.audio_dir / presentation_id
        if not pres_dir.exists():
            return {"files_removed": 0, "bytes_freed": 0}

        cleaned_files = 0
        total_bytes_freed = 0

        # Clean up hash-based audio files
        for audio_file in pres_dir.glob("audio_*.wav"):
            hash_part = audio_file.stem.replace("audio_", "")
            if hash_part not in valid_hashes:
                file_size = audio_file.stat().st_size
                audio_file.unlink()
                cleaned_files += 1
                total_bytes_freed += file_size
                logger.info(f"Cleaned up stale audio: {audio_file.name}")

        return {
            "files_removed": cleaned_files,
            "bytes_freed": total_bytes_freed,
        }

    def list_available_voices(self) -> list[str]:
        """List all available voices.

        Returns:
            List of available voice IDs
        """
        # Kokoro TTS voices - actual available voices from the model
        return [
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

    def generate_voice_preview(
        self,
        voice: str,
        sample_text: str
    ) -> Optional[Path]:
        """Generate a preview audio sample for a voice.

        Args:
            voice: Voice ID to preview
            sample_text: Sample text to speak

        Returns:
            Path to generated preview audio file
        """
        if not self.is_available():
            logger.error("TTS service is not available for voice preview")
            return None

        try:
            # Create previews directory
            previews_dir = self.audio_dir / "_previews"
            previews_dir.mkdir(parents=True, exist_ok=True)

            # Check if preview already exists (cache it)
            filepath = previews_dir / f"preview_{voice}.wav"
            if filepath.exists():
                return filepath

            # Generate audio using Kokoro
            logger.info(f"Generating voice preview for '{voice}'")

            generator = self._pipeline(
                sample_text,
                voice=voice,
                speed=1.0,
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

            # Save to file with 24kHz sample rate
            sf.write(str(filepath), audio_data, 24000)

            logger.info(f"Voice preview generated: {filepath}")
            return filepath

        except Exception as e:
            logger.error(f"Failed to generate voice preview: {e}")
            return None
