import os
import subprocess
import tempfile
import shlex
import shutil
import html as html_lib
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


def is_marp_available() -> bool:
    """Check if Marp CLI is available on the system."""
    cmd_parts = get_marp_command_parts()
    return shutil.which(cmd_parts[0]) is not None

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
    """Build Marp CLI command.

    Args:
        temp_file: Path to temp markdown file
        format_flag: Format flag (e.g., "--pdf", "--pptx", "--html")
        output: Output file path
        theme_id: Theme identifier
    """
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


def fallback_render_to_html(content: str, theme_id: str | None = None) -> str:
    """Render Marp markdown to HTML without Marp CLI (fallback mode).
    
    This provides a basic HTML preview when Marp CLI is not available.
    It parses Marp markdown syntax and generates styled HTML slides.
    """
    import re
    
    # Parse Marp front matter
    front_matter = {}
    content_body = content
    if content.strip().startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            yaml_content = parts[1].strip()
            content_body = parts[2]
            for line in yaml_content.split("\n"):
                if ":" in line:
                    key, val = line.split(":", 1)
                    front_matter[key.strip()] = val.strip()
    
    # Split into slides (Marp uses --- as slide separator)
    slides = re.split(r'\n---\n', content_body)
    
    # Generate HTML for each slide
    slide_html_parts = []
    for i, slide_content in enumerate(slides):
        if not slide_content.strip():
            continue
        
        # Convert basic markdown to HTML
        slide_html = html_lib.escape(slide_content)
        
        # Headers
        slide_html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', slide_html, flags=re.MULTILINE)
        slide_html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', slide_html, flags=re.MULTILINE)
        slide_html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', slide_html, flags=re.MULTILINE)
        
        # Bold and italic
        slide_html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', slide_html)
        slide_html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', slide_html)
        
        # Lists
        slide_html = re.sub(r'^- (.+)$', r'<li>\1</li>', slide_html, flags=re.MULTILINE)
        slide_html = re.sub(r'(<li>.*</li>\n?)+', r'<ul>\g<0></ul>', slide_html)
        
        # Code blocks
        slide_html = re.sub(r'```(\w*)\n(.*?)```', r'<pre><code class="\1">\2</code></pre>', slide_html, flags=re.DOTALL)
        slide_html = re.sub(r'`(.+?)`', r'<code>\1</code>', slide_html)
        
        # Line breaks (preserve newlines)
        slide_html = slide_html.replace('\n\n', '</p><p>')
        
        slide_html_parts.append(f'''
        <section class="slide" data-slide="{i + 1}">
            <div class="slide-content">
                <p>{slide_html}</p>
            </div>
        </section>
        ''')
    
    # Build full HTML document with Marp-like styling
    theme_color = "#0366d6"  # Default blue
    bg_color = "#ffffff"
    
    html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Presentation Preview</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }}
        .slide {{
            background: {bg_color};
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            padding: 60px;
            min-height: 400px;
            position: relative;
        }}
        .slide::after {{
            content: attr(data-slide);
            position: absolute;
            bottom: 10px;
            right: 20px;
            color: #999;
            font-size: 14px;
        }}
        .slide-content {{ max-width: 900px; margin: 0 auto; }}
        h1 {{
            color: {theme_color};
            font-size: 2.5em;
            margin-bottom: 0.5em;
            border-bottom: 3px solid {theme_color};
            padding-bottom: 0.3em;
        }}
        h2 {{ color: #333; font-size: 1.8em; margin: 0.8em 0 0.4em; }}
        h3 {{ color: #555; font-size: 1.4em; margin: 0.6em 0 0.3em; }}
        p {{ line-height: 1.6; margin: 0.5em 0; color: #333; font-size: 1.1em; }}
        ul {{ margin: 0.5em 0 0.5em 1.5em; }}
        li {{ margin: 0.3em 0; line-height: 1.5; }}
        code {{
            background: #f0f0f0;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'SF Mono', Consolas, monospace;
        }}
        pre {{
            background: #282c34;
            color: #abb2bf;
            padding: 20px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 1em 0;
        }}
        pre code {{ background: none; padding: 0; color: inherit; }}
        strong {{ color: {theme_color}; }}
        .mermaid {{ background: #fff; padding: 20px; border-radius: 4px; }}
        .warning-banner {{
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 10px 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="warning-banner">
        ⚠️ Fallback preview mode - Marp CLI not available. For full rendering, install Marp CLI.
    </div>
    {"".join(slide_html_parts)}
</body>
</html>'''
    
    html = inject_mermaid_support(html)
    return html

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
    
    # Use fallback renderer if Marp CLI is not available
    if not is_marp_available():
        logger.warning("Marp CLI not available, using fallback HTML renderer")
        html = fallback_render_to_html(content, theme_id)
        cache_key = generate_cache_key(content, theme_id)
        render_cache[cache_key] = html
        return html
    
    return execute_html_render(content, theme_id)

def render_export(content: str, output_path: Path, format_flag: str, format_name: str, theme_id: str | None = None) -> None:
    if not validate_markdown(content):
        raise ValueError("Invalid markdown content")
    
    if not is_marp_available():
        raise RuntimeError(
            f"{format_name} export requires Marp CLI which is not installed. "
            "Please install @marp-team/marp-cli or use Docker deployment."
        )
    
    temp_file = create_temp_file(content)
    cmd = build_marp_cmd(temp_file, format_flag, str(output_path), theme_id)
    run_marp_command(cmd, temp_file, f"{format_name} export")
    logger.info(f"{format_name} exported: {output_path}")

def render_to_pdf(content: str, output_path: Path, theme_id: str | None = None) -> None:
    render_export(content, output_path, "--pdf", "PDF", theme_id)

def render_to_html_file(content: str, output_path: Path, theme_id: str | None = None) -> None:
    render_export(content, output_path, "--html", "HTML", theme_id)

def render_to_pptx(content: str, output_path: Path, theme_id: str | None = None) -> None:
    """Create an editable PPTX file.

    Note: The --pptx-editable flag is set in marp.config.js (pptxEditable: true).
    This requires LibreOffice to be installed in the container.
    """
    render_export(content, output_path, "--pptx", "PPTX", theme_id)
