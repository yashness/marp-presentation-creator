"""List command - List all presentations."""

import typer
from rich.table import Table
from marpify.api_client import list_presentations
from marpify.utils import create_table, console, print_error


def format_date(date_str: str) -> str:
    """Format date string for display."""
    return date_str.split("T")[0] if "T" in date_str else date_str


def list_command() -> None:
    """List all presentations from the server."""
    try:
        presentations = list_presentations()
        display_presentations(presentations)
    except Exception as e:
        print_error(str(e))
        raise typer.Exit(1)


def create_presentations_table() -> Table:
    """Create table structure for presentations."""
    return create_table("Presentations", [
        ("ID", "cyan"), ("Title", "green"), ("Created", "blue")
    ])

def add_presentation_rows(table: Table, presentations: list[dict]) -> None:
    """Add presentation data to table."""
    for p in presentations:
        table.add_row(p["id"], p["title"], format_date(p.get("created_at", "")))

def display_presentations(presentations: list[dict]) -> None:
    """Display presentations in a table."""
    if not presentations:
        console.print("[yellow]No presentations found[/yellow]")
        return
    table = create_presentations_table()
    add_presentation_rows(table, presentations)
    console.print(table)
