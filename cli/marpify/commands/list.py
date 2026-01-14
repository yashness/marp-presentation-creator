"""List command - List all presentations."""

import typer
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


def display_presentations(presentations: list) -> None:
    """Display presentations in a table."""
    if not presentations:
        console.print("[yellow]No presentations found[/yellow]")
        return
    
    table = create_table("Presentations", [
        ("ID", "cyan"),
        ("Title", "green"),
        ("Created", "blue")
    ])
    
    for p in presentations:
        table.add_row(p["id"], p["title"], format_date(p.get("created_at", "")))
    
    console.print(table)
