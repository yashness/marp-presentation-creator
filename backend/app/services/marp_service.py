import subprocess
from pathlib import Path
from app.core.config import settings
from app.core.logger import logger

def get_marp_command() -> str:
    return settings.marp_cli_path

def validate_markdown(content: str) -> bool:
    return bool(content and content.strip())

def render_to_html(content: str, theme_id: str | None = None) -> str:
    if not validate_markdown(content):
        raise ValueError("Invalid markdown content")

    temp_file = Path("/tmp/temp_presentation.md")
    temp_file.write_text(content)

    cmd = [get_marp_command(), temp_file, "--html"]
    if theme_id:
        cmd.extend(["--theme", theme_id])

    result = subprocess.run(cmd, capture_output=True, text=True)
    temp_file.unlink(missing_ok=True)

    if result.returncode != 0:
        logger.error(f"Marp render failed: {result.stderr}")
        raise RuntimeError(f"Marp failed: {result.stderr}")

    return result.stdout

def render_to_pdf(content: str, output_path: Path, theme_id: str | None = None):
    if not validate_markdown(content):
        raise ValueError("Invalid markdown content")

    temp_file = Path("/tmp/temp_presentation.md")
    temp_file.write_text(content)

    cmd = [get_marp_command(), temp_file, "--pdf", "-o", str(output_path)]
    if theme_id:
        cmd.extend(["--theme", theme_id])

    result = subprocess.run(cmd, capture_output=True, text=True)
    temp_file.unlink(missing_ok=True)

    if result.returncode != 0:
        logger.error(f"PDF export failed: {result.stderr}")
        raise RuntimeError(f"PDF export failed: {result.stderr}")

    logger.info(f"PDF exported: {output_path}")
