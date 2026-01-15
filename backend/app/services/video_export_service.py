"""Service for exporting presentations as videos."""

import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Optional
from loguru import logger

from app.services.tts_service import TTSService


class VideoExportService:
    """Service for creating video exports of presentations."""

    def __init__(
        self,
        video_dir: str = "data/videos",
        temp_dir: str = "data/temp_video"
    ):
        """Initialize video export service."""
        self.video_dir = Path(video_dir)
        self.temp_dir = Path(temp_dir)
        self.video_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.tts_service = TTSService()

    def _check_dependencies(self) -> tuple[bool, str]:
        """Check if required tools are installed."""
        if not shutil.which("ffmpeg"):
            return False, "ffmpeg not installed"
        try:
            from app.services.marp_service import get_marp_command_parts
            marp_cmd = get_marp_command_parts()[0]
            if not shutil.which(marp_cmd) and not Path(marp_cmd).exists():
                return False, f"marp CLI not found: {marp_cmd}"
        except Exception as e:
            return False, f"marp CLI check failed: {e}"
        return True, "OK"

    def _parse_slides(self, content: str) -> list[dict]:
        """Parse markdown content into individual slides."""
        slides = []
        frontmatter_match = re.match(r"^---\n[\s\S]*?\n---\s*", content)
        body = content[frontmatter_match.end():] if frontmatter_match else content
        normalized_body = body.lstrip("\n")
        slide_parts = re.split(r"\n---\s*\n", normalized_body) if normalized_body else []

        for idx, part in enumerate(slide_parts):
            if not part.strip():
                continue

            comment_match = re.search(r"<!--\s*(?:slide-comment:)?\s*([\s\S]*?)\s*-->\s*\n?", part, re.IGNORECASE)
            comment = comment_match.group(1).strip() if comment_match else ""
            content_only = part
            if comment_match:
                content_only = part[:comment_match.start()] + part[comment_match.end():]

            slides.append({
                "index": len(slides),
                "content": content_only.strip(),
                "comment": comment
            })

        return slides

    def _render_slide_to_image(
        self,
        slide_content: str,
        output_path: Path,
        theme_id: Optional[str] = None
    ) -> bool:
        """Render markdown slide to image using Marp CLI."""
        try:
            import tempfile

            # Create temp markdown file
            fd, temp_md = tempfile.mkstemp(suffix=".md", text=True)
            os.close(fd)
            temp_md_path = Path(temp_md)
            temp_md_path.write_text(slide_content)

            # Use Marp CLI to convert markdown to image
            from app.services.marp_service import get_marp_command_parts, ensure_theme_css, MARP_CONFIG_PATH

            # Marp with --images png creates files with numbered extensions
            # We specify the output file without extension, Marp adds -001.png, -002.png, etc
            output_prefix = output_path.with_suffix('')

            cmd = get_marp_command_parts() + [
                str(temp_md_path),
                "--images", "png",
                "--allow-local-files",
                "-o", str(output_prefix)
            ]

            if MARP_CONFIG_PATH.exists():
                cmd.extend(["--config", str(MARP_CONFIG_PATH)])

            if theme_id:
                ensure_theme_css(theme_id)
                cmd.extend(["--theme", theme_id])

            logger.info(f"Running Marp command: {' '.join(cmd)}")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )

            logger.info(f"Marp command completed with return code: {result.returncode}")
            if result.stdout:
                logger.info(f"Marp stdout: {result.stdout}")
            if result.stderr:
                logger.info(f"Marp stderr: {result.stderr}")

            temp_md_path.unlink(missing_ok=True)

            if result.returncode != 0:
                logger.error(f"Marp image export failed (code {result.returncode}): {result.stderr}")
                logger.error(f"Marp cmd: {' '.join(cmd)}")
                logger.error(f"Slide markdown size: {len(slide_content)} chars")
                logger.error(f"Slide markdown head: {slide_content[:240]}")
                return False

            # Marp creates files like output.001 (PNG without .png extension) when using --images png
            # We need to find and rename to add the .png extension
            output_prefix = output_path.with_suffix('')
            marp_output = Path(str(output_prefix) + ".001")

            logger.info(f"Looking for Marp output at: {marp_output}")

            if marp_output.exists():
                logger.info(f"Renaming {marp_output} to {output_path}")
                marp_output.rename(output_path)
                return True

            logger.error(f"Marp output not found. Expected: {marp_output}")
            logger.error(f"Output directory contents: {list(output_path.parent.glob('*'))}")
            return False

        except Exception as e:
            logger.error(f"Failed to render slide to image: {e}")
            return False

    def _create_slide_images(
        self,
        content: str,
        theme_id: Optional[str],
        presentation_id: str
    ) -> list[Path]:
        """Create images for all slides."""
        slides = self._parse_slides(content)
        image_paths = []

        slides_dir = self.temp_dir / presentation_id / "slides"
        slides_dir.mkdir(parents=True, exist_ok=True)

        for slide in slides:
            # Render individual slide
            slide_md = f"---\nmarp: true\n---\n\n{slide['content']}"

            # Save as image
            img_path = slides_dir / f"slide_{slide['index']:03d}.png"
            if self._render_slide_to_image(slide_md, img_path, theme_id):
                image_paths.append(img_path)
                logger.info(f"Created image for slide {slide['index']}")
            else:
                logger.error(f"Failed to create image for slide {slide['index']}")

        return image_paths

    def _generate_slide_audio(
        self,
        slides: list[dict],
        presentation_id: str,
        voice: str,
        speed: float
    ) -> list[Optional[Path]]:
        """Generate audio for slide comments."""
        audio_paths = []

        for slide in slides:
            if not slide["comment"]:
                audio_paths.append(None)
                continue

            audio_path = self.tts_service.generate_audio(
                text=slide["comment"],
                presentation_id=presentation_id,
                slide_index=slide["index"],
                voice=voice,
                speed=speed
            )

            if audio_path:
                audio_paths.append(Path(audio_path))
            else:
                audio_paths.append(None)

        return audio_paths

    def _get_audio_duration(self, audio_path: Path) -> float:
        """Get duration of audio file in seconds."""
        try:
            cmd = [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(audio_path)
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            return float(result.stdout.strip())
        except Exception as e:
            logger.error(f"Failed to get audio duration: {e}")
            return 5.0  # Default 5 seconds

    def _create_video_segment(
        self,
        image_path: Path,
        audio_path: Optional[Path],
        output_path: Path,
        default_duration: float = 5.0
    ) -> bool:
        """Create video segment from image and audio."""
        try:
            duration = self._get_audio_duration(audio_path) if audio_path else default_duration

            # Build FFmpeg command with correct argument order:
            # 1. Global options
            # 2. Input files (with their options before each -i)
            # 3. Output options (filters, codecs, etc.)
            # 4. Output file

            cmd = [
                "ffmpeg", "-y",
                "-loop", "1",
                "-i", str(image_path)
            ]

            # Add audio input
            if audio_path:
                cmd.extend(["-i", str(audio_path)])
            else:
                cmd.extend(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"])

            # Add output options AFTER all inputs
            cmd.extend([
                "-t", str(duration),
                "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-r", "30",
                "-c:a", "aac"
            ])

            if audio_path:
                cmd.append("-shortest")

            cmd.append(str(output_path))

            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode != 0:
                logger.error(f"FFmpeg failed: {result.stderr}")
                return False

            return output_path.exists()

        except Exception as e:
            logger.error(f"Failed to create video segment: {e}")
            return False

    def _concatenate_videos(self, video_paths: list[Path], output_path: Path) -> bool:
        """Concatenate video segments into final video."""
        try:
            # Create concat file
            concat_file = self.temp_dir / "concat.txt"
            with open(concat_file, "w") as f:
                for path in video_paths:
                    f.write(f"file '{path.absolute()}'\n")

            cmd = [
                "ffmpeg", "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_file),
                "-c", "copy",
                str(output_path)
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            concat_file.unlink(missing_ok=True)

            if result.returncode != 0:
                logger.error(f"FFmpeg concat failed: {result.stderr}")
                return False

            return output_path.exists()

        except Exception as e:
            logger.error(f"Failed to concatenate videos: {e}")
            return False

    def _prepare_presentation(self, content: str) -> Optional[list]:
        """Parse and validate presentation slides."""
        slides = self._parse_slides(content)
        if not slides:
            logger.error("No slides found in presentation")
            return None
        logger.info(f"Found {len(slides)} slides")
        return slides

    def _generate_video_segments(
        self,
        slides: list,
        image_paths: list[Path],
        audio_paths: list[Optional[Path]],
        presentation_id: str,
        slide_duration: float
    ) -> Optional[list[Path]]:
        """Create individual video segments from slides."""
        segments_dir = self.temp_dir / presentation_id / "segments"
        segments_dir.mkdir(parents=True, exist_ok=True)

        segment_paths = []
        for idx, (img_path, audio_path) in enumerate(zip(image_paths, audio_paths)):
            segment_path = segments_dir / f"segment_{idx:03d}.mp4"
            if self._create_video_segment(img_path, audio_path, segment_path, slide_duration):
                segment_paths.append(segment_path)
                logger.info(f"Created segment {idx + 1}/{len(slides)}")

        if len(segment_paths) != len(slides):
            logger.error("Failed to create all video segments")
            return None

        return segment_paths

    def _finalize_export(self, segment_paths: list[Path], presentation_id: str) -> Optional[Path]:
        """Concatenate segments and cleanup temporary files."""
        output_path = self.video_dir / f"{presentation_id}.mp4"

        if not self._concatenate_videos(segment_paths, output_path):
            logger.error("Failed to concatenate video segments")
            return None

        logger.info(f"Video exported successfully: {output_path}")

        # Cleanup temp files
        temp_pres_dir = self.temp_dir / presentation_id
        if temp_pres_dir.exists():
            shutil.rmtree(temp_pres_dir)

        return output_path

    def export_video(
        self,
        presentation_id: str,
        content: str,
        theme_id: Optional[str] = None,
        voice: str = "af_bella",
        speed: float = 1.0,
        slide_duration: float = 5.0
    ) -> Optional[Path]:
        """Export presentation as video."""
        # Check dependencies
        available, msg = self._check_dependencies()
        if not available:
            logger.error(f"Missing dependency: {msg}")
            return None

        try:
            logger.info(f"Starting video export for presentation {presentation_id}")

            # Stage 1: Prepare presentation
            slides = self._prepare_presentation(content)
            if not slides:
                return None

            # Stage 2: Generate assets
            logger.info("Generating audio for slide comments...")
            audio_paths = self._generate_slide_audio(slides, presentation_id, voice, speed)

            logger.info("Rendering slides to images...")
            image_paths = self._create_slide_images(content, theme_id, presentation_id)

            if len(image_paths) != len(slides):
                logger.error("Failed to create all slide images")
                return None

            # Stage 3: Create video segments
            logger.info("Creating video segments...")
            segment_paths = self._generate_video_segments(
                slides, image_paths, audio_paths, presentation_id, slide_duration
            )
            if not segment_paths:
                return None

            # Stage 4: Finalize export
            logger.info("Concatenating video segments...")
            return self._finalize_export(segment_paths, presentation_id)

        except Exception as e:
            logger.error(f"Video export failed: {e}")
            return None

    def delete_video(self, presentation_id: str) -> bool:
        """Delete video file for presentation."""
        try:
            video_path = self.video_dir / f"{presentation_id}.mp4"
            if video_path.exists():
                video_path.unlink()
                logger.info(f"Deleted video for presentation {presentation_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete video: {e}")
            return False

    def get_video_path(self, presentation_id: str) -> Optional[Path]:
        """Get path to video file."""
        video_path = self.video_dir / f"{presentation_id}.mp4"
        return video_path if video_path.exists() else None
