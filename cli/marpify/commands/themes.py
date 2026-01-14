"""Themes command - List available themes."""

import typer
from marpify.api_client import list_themes
from marpify.utils import create_table, console, print_error


def themes_command() -> None:
    """List all available themes."""
    try:
        themes = list_themes()
        display_themes(themes)
    except Exception as e:
        print_error(str(e))
        raise typer.Exit(1)


def display_themes(themes: list) -> None:
    """Display themes in a table."""
    table = create_table("Available Themes", [
        ("Name", "cyan"),
        ("Description", "green")
    ])
    
    for theme in themes:
        table.add_row(theme["name"], theme.get("description", ""))
    
    console.print(table)
