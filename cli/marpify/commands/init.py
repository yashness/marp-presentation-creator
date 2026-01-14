"""Init command - Initialize a new presentation project."""

from pathlib import Path
import typer
from marpify.config import DEFAULT_THEME, AVAILABLE_THEMES
from marpify.utils import console, print_success, print_error


def create_project_dir(name: str) -> Path:
    """Create project directory."""
    project_dir = Path(name)
    project_dir.mkdir(exist_ok=True)
    return project_dir


def get_template_content(template: str) -> str:
    """Get template content based on theme."""
    templates = {
        "default": "---\nmarp: true\n---\n\n# Welcome\n\nYour presentation starts here\n\n---\n\n## Slide 2\n\nAdd your content\n",
        "corporate": "---\nmarp: true\ntheme: corporate\n---\n\n# Business Presentation\n\n## Your Company Name\n\n---\n\n## Agenda\n\n- Topic 1\n- Topic 2\n- Topic 3\n",
        "academic": "---\nmarp: true\ntheme: academic\n---\n\n# Research Presentation\n\n**Author Name**\n\n---\n\n## Abstract\n\nYour research summary\n"
    }
    return templates.get(template, templates["default"])


def create_presentation_file(project_dir: Path, template: str) -> None:
    """Create presentation markdown file."""
    content = get_template_content(template)
    slides_file = project_dir / "slides.md"
    slides_file.write_text(content)


def init_command(
    name: str = typer.Argument(..., help="Project name"),
    template: str = typer.Option(DEFAULT_THEME, "--template", "-t", help=f"Template: {', '.join(AVAILABLE_THEMES)}")
) -> None:
    """Initialize a new presentation project."""
    try:
        validate_template(template)
        project_dir = create_project_dir(name)
        create_presentation_file(project_dir, template)
        print_success(f"Created project: {name}")
        console.print(f"  Template: [cyan]{template}[/cyan]")
        console.print(f"  File: [yellow]{project_dir / 'slides.md'}[/yellow]")
    except Exception as e:
        print_error(str(e))
        raise typer.Exit(1)


def validate_template(template: str) -> None:
    """Validate template choice."""
    if template not in AVAILABLE_THEMES:
        raise ValueError(f"Invalid template. Choose from: {', '.join(AVAILABLE_THEMES)}")
