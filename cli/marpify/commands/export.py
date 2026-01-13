import typer
from pathlib import Path
import subprocess
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()

def export_presentation(
    file: Path = typer.Argument(..., help="Presentation file to export"),
    format: str = typer.Option("pdf", "--format", "-f", help="Export format (pdf, html, pptx)"),
    output: Path = typer.Option(None, "--output", "-o", help="Output file path")
):
    """
    Export presentation to various formats.

    Examples:
        marpify export slides.md
        marpify export slides.md -f html
        marpify export slides.md --format pptx -o output.pptx
    """
    if not file.exists():
        console.print(f"[red]Error: File '{file}' not found[/red]")
        raise typer.Exit(1)

    output_path = determine_output_path(file, format, output)
    export_file(file, format, output_path)

def determine_output_path(input_file: Path, fmt: str, output: Path | None) -> Path:
    if output:
        return output
    return input_file.with_suffix(f".{fmt}")

def export_file(input_file: Path, fmt: str, output_path: Path):
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task(f"Exporting to {fmt.upper()}...", total=None)

        cmd = ["npx", "@marp-team/marp-cli", str(input_file), f"--{fmt}", "-o", str(output_path)]
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            console.print(f"[red]Export failed: {result.stderr}[/red]")
            raise typer.Exit(1)

        progress.update(task, completed=True)
        console.print(f"[green]✓[/green] Exported to: {output_path}")
