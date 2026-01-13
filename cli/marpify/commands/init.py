import typer
from pathlib import Path
from rich.console import Console

console = Console()

def init_project(
    name: str = typer.Argument(..., help="Project name"),
    template: str = typer.Option("default", "--template", "-t", help="Template to use (default, corporate, academic)")
):
    """
    Initialize a new presentation project.

    Examples:
        marpify init my-presentation
        marpify init slides --template corporate
        marpify init -t academic lecture
    """
    project_path = Path(name)
    if project_path.exists():
        console.print(f"[red]Error: Directory '{name}' already exists[/red]")
        raise typer.Exit(1)

    create_project_structure(project_path, template)
    console.print(f"[green]✓[/green] Created project: {name}")
    console.print(f"[cyan]Template:[/cyan] {template}")

def create_project_structure(path: Path, template: str):
    path.mkdir(parents=True)
    (path / "slides.md").write_text(get_template_content(template))
    (path / "assets").mkdir()

def get_template_content(template: str) -> str:
    templates = {
        "default": "---\nmarp: true\n---\n\n# My Presentation\n\n---\n\n## Slide 2\n\nContent here\n",
        "corporate": "---\nmarp: true\ntheme: corporate\n---\n\n# Corporate Presentation\n\n---\n\n## Agenda\n\n- Topic 1\n- Topic 2\n",
        "academic": "---\nmarp: true\ntheme: academic\n---\n\n# Academic Presentation\n\n---\n\n## Introduction\n\nContent\n"
    }
    return templates.get(template, templates["default"])
