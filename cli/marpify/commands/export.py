"""Export command - Export presentations to various formats."""

from pathlib import Path
import typer
from marpify.api_client import create_presentation, export_presentation
from marpify.config import EXPORT_FORMATS
from marpify.utils import read_markdown_file, write_file, print_success, print_error


def validate_format(format: str) -> None:
    """Validate export format."""
    if format not in EXPORT_FORMATS:
        raise ValueError(f"Invalid format. Choose from: {', '.join(EXPORT_FORMATS)}")


def get_output_path(input_file: str, format: str, output: str | None) -> str:
    """Determine output file path."""
    if output:
        return output
    return str(Path(input_file).with_suffix(f".{format}"))


def validate_file_exists(file_path: str) -> None:
    """Validate input file exists and is readable."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    if not path.is_file():
        raise ValueError(f"Not a file: {file_path}")

def prepare_export(file: str, format: str) -> tuple[str, str]:
    """Prepare content and title for export."""
    validate_format(format)
    validate_file_exists(file)
    content = read_markdown_file(file)
    title = extract_title(content)
    return title, content

def execute_export(title: str, content: str, format: str, file: str, output: str | None) -> None:
    """Execute the export operation."""
    presentation = create_presentation(title, content)
    exported_data = export_presentation(presentation["id"], format)
    output_path = get_output_path(file, format, output)
    write_file(output_path, exported_data)
    print_success(f"Exported to {output_path}")

def handle_export(file: str, format: str, output: str | None) -> None:
    """Handle export command execution."""
    title, content = prepare_export(file, format)
    execute_export(title, content, format, file, output)

def export_command(
    file: str = typer.Argument(..., help="Presentation markdown file"),
    format: str = typer.Option("pdf", "--format", "-f", help=f"Format: {', '.join(EXPORT_FORMATS)}"),
    output: str | None = typer.Option(None, "--output", "-o", help="Output file path")
) -> None:
    """Export presentation to PDF, HTML, or PPTX."""
    try:
        handle_export(file, format, output)
    except Exception as e:
        print_error(str(e))
        raise typer.Exit(1)


def extract_title(content: str) -> str:
    """Extract title from markdown content."""
    for line in content.split("\n"):
        if line.startswith("# "):
            return line[2:].strip()
    return "Untitled Presentation"
