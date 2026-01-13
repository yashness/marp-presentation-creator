import subprocess
import tempfile
from pathlib import Path
from app.core.config import settings
from app.core.logger import logger

def get_marp_command() -> str:
    return settings.marp_cli_path

def validate_markdown(content: str) -> bool:
    return bool(content and content.strip())

def create_temp_file(content: str) -> Path:
    fd, temp_path = tempfile.mkstemp(suffix=".md", text=True)
    temp_file = Path(temp_path)
    temp_file.write_text(content)
    return temp_file

def build_marp_cmd(temp_file: Path, format_flag: str, output: str | None, theme_id: str | None) -> list[str]:
    cmd = [get_marp_command(), str(temp_file), format_flag]
    if output:
        cmd.extend(["-o", output])
    if theme_id:
        cmd.extend(["--theme", theme_id])
    return cmd

def run_marp_command(cmd: list[str], temp_file: Path, operation: str):
    result = subprocess.run(cmd, capture_output=True, text=True)
    temp_file.unlink(missing_ok=True)
    if result.returncode != 0:
        logger.error(f"{operation} failed: {result.stderr}")
        raise RuntimeError(f"{operation} failed: {result.stderr}")
    return result

def render_to_html(content: str, theme_id: str | None = None) -> str:
    if not validate_markdown(content):
        raise ValueError("Invalid markdown content")
    temp_file = create_temp_file(content)
    cmd = build_marp_cmd(temp_file, "--html", None, theme_id)
    result = run_marp_command(cmd, temp_file, "Marp render")
    return result.stdout

def render_to_pdf(content: str, output_path: Path, theme_id: str | None = None):
    if not validate_markdown(content):
        raise ValueError("Invalid markdown content")
    temp_file = create_temp_file(content)
    cmd = build_marp_cmd(temp_file, "--pdf", str(output_path), theme_id)
    run_marp_command(cmd, temp_file, "PDF export")
    logger.info(f"PDF exported: {output_path}")

def render_to_html_file(content: str, output_path: Path, theme_id: str | None = None):
    if not validate_markdown(content):
        raise ValueError("Invalid markdown content")
    temp_file = create_temp_file(content)
    cmd = build_marp_cmd(temp_file, "--html", str(output_path), theme_id)
    run_marp_command(cmd, temp_file, "HTML export")
    logger.info(f"HTML exported: {output_path}")

def render_to_pptx(content: str, output_path: Path, theme_id: str | None = None):
    if not validate_markdown(content):
        raise ValueError("Invalid markdown content")
    temp_file = create_temp_file(content)
    cmd = build_marp_cmd(temp_file, "--pptx", str(output_path), theme_id)
    run_marp_command(cmd, temp_file, "PPTX export")
    logger.info(f"PPTX exported: {output_path}")
