import os
import subprocess
import tempfile
import shlex
from pathlib import Path
from app.core.config import settings
from app.core.logger import logger
from app.core.cache import render_cache, generate_cache_key
from app.core.database import SessionLocal
from app.services import theme_service

BASE_DIR = Path(__file__).resolve().parent.parent.parent
THEMES_DIR = BASE_DIR / "themes"
THEME_CACHE_DIR = BASE_DIR / "data" / "theme_cache"
MARP_CONFIG_PATH = BASE_DIR / "marp.config.js"

THEME_CACHE_DIR.mkdir(parents=True, exist_ok=True)

def get_marp_command_parts() -> list[str]:
    return shlex.split(settings.marp_cli_path)

def validate_markdown(content: str) -> bool:
    return bool(content and content.strip())

def ensure_theme_css(theme_id: str) -> None:
    """Make sure the Marp CLI can resolve the selected theme."""
    builtin_path = THEMES_DIR / f"{theme_id}.css"
    if builtin_path.exists():
        return

    cached_path = THEME_CACHE_DIR / f"{theme_id}.css"
    with SessionLocal() as session:
        css = theme_service.get_theme_css(session, theme_id)

    if not css:
        logger.warning(f"Theme {theme_id} not found; falling back to default styles")
        return

    if not cached_path.exists() or cached_path.read_text() != css:
        cached_path.write_text(css)

def create_temp_file(content: str) -> Path:
    fd, temp_path = tempfile.mkstemp(suffix=".md", text=True)
    os.close(fd)
    temp_file = Path(temp_path)
    temp_file.write_text(content)
    return temp_file

def build_marp_cmd(temp_file: Path, format_flag: str, output: str | None, theme_id: str | None) -> list[str]:
    if not MARP_CONFIG_PATH.exists():
        logger.warning(f"Marp config missing at {MARP_CONFIG_PATH}; diagram support may be degraded")

    cmd = (
        get_marp_command_parts()
        + [
            str(temp_file),
            format_flag,
            "--allow-local-files",
            "--config",
            str(MARP_CONFIG_PATH),
        ]
    )
    if output:
        cmd.extend(["-o", output])
    if theme_id:
        ensure_theme_css(theme_id)
        cmd.extend(["--theme", theme_id])
    return cmd

def run_marp_command(cmd: list[str], temp_file: Path, operation: str) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(cmd, capture_output=True, text=True)
    temp_file.unlink(missing_ok=True)
    if result.returncode != 0:
        logger.error(f"{operation} failed: {result.stderr}")
        raise RuntimeError(f"{operation} failed: {result.stderr}")
    return result

def check_cache(content: str, theme_id: str | None) -> str | None:
    cache_key = generate_cache_key(content, theme_id)
    if cache_key in render_cache:
        logger.debug(f"Cache hit for render: {cache_key[:8]}")
        return render_cache[cache_key]
    return None

def create_html_temp_file() -> Path:
    html_fd, html_path = tempfile.mkstemp(suffix=".html", text=True)
    os.close(html_fd)
    html_file = Path(html_path)
    html_file.unlink(missing_ok=True)
    return html_file

def inject_mermaid_support(html: str) -> str:
    """Inject Mermaid.js support into HTML."""
    mermaid_script = """
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: true, theme: 'default' });
</script>
"""
    if "</head>" in html:
        return html.replace("</head>", f"{mermaid_script}</head>")
    return mermaid_script + html

def render_and_cache(content: str, theme_id: str | None, html_file: Path) -> str:
    html = html_file.read_text()
    html = inject_mermaid_support(html)
    cache_key = generate_cache_key(content, theme_id)
    render_cache[cache_key] = html
    return html

def execute_html_render(content: str, theme_id: str | None) -> str:
    temp_file = create_temp_file(content)
    html_file = create_html_temp_file()
    cmd = build_marp_cmd(temp_file, "--html", str(html_file), theme_id)
    try:
        run_marp_command(cmd, temp_file, "Marp render")
        return render_and_cache(content, theme_id, html_file)
    finally:
        html_file.unlink(missing_ok=True)

def render_to_html(content: str, theme_id: str | None = None) -> str:
    if not validate_markdown(content):
        raise ValueError("Invalid markdown content")
    cached = check_cache(content, theme_id)
    if cached:
        return cached
    return execute_html_render(content, theme_id)

def render_export(content: str, output_path: Path, format_flag: str, format_name: str, theme_id: str | None = None) -> None:
    if not validate_markdown(content):
        raise ValueError("Invalid markdown content")
    temp_file = create_temp_file(content)
    cmd = build_marp_cmd(temp_file, format_flag, str(output_path), theme_id)
    run_marp_command(cmd, temp_file, f"{format_name} export")
    logger.info(f"{format_name} exported: {output_path}")

def render_to_pdf(content: str, output_path: Path, theme_id: str | None = None) -> None:
    render_export(content, output_path, "--pdf", "PDF", theme_id)

def render_to_html_file(content: str, output_path: Path, theme_id: str | None = None) -> None:
    render_export(content, output_path, "--html", "HTML", theme_id)

def render_to_pptx(content: str, output_path: Path, theme_id: str | None = None) -> None:
    render_export(content, output_path, "--pptx", "PPTX", theme_id)
