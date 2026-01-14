"""Utility functions for CLI."""

from pathlib import Path
from rich.console import Console
from rich.table import Table


console = Console()


def read_markdown_file(file_path: str) -> str:
    """Read markdown file content."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    return path.read_text()


def write_file(file_path: str, content: bytes | str) -> None:
    """Write content to file."""
    path = Path(file_path)
    mode = "wb" if isinstance(content, bytes) else "w"
    with path.open(mode) as f:
        f.write(content)


def create_table(title: str, columns: list[tuple[str, str]]) -> Table:
    """Create a Rich table with given columns."""
    table = Table(title=title)
    for name, style in columns:
        table.add_column(name, style=style)
    return table


def print_success(message: str) -> None:
    """Print success message."""
    console.print(f"[green]✓[/green] {message}")


def print_error(message: str) -> None:
    """Print error message."""
    console.print(f"[red]✗[/red] {message}")


def print_info(message: str) -> None:
    """Print info message."""
    console.print(f"[blue]ℹ[/blue] {message}")
