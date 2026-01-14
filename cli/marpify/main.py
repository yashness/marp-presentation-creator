"""Marpify CLI - Main entry point."""

import typer
from marpify.commands.init import init_command
from marpify.commands.export import export_command
from marpify.commands.list import list_command
from marpify.commands.serve import serve_command
from marpify.commands.themes import themes_command

app = typer.Typer(
    help="Marp Presentation Builder CLI",
    add_completion=False,
    no_args_is_help=True
)

app.command(name="init", help="Initialize a new presentation project")(init_command)
app.command(name="export", help="Export presentation to PDF/HTML/PPTX")(export_command)
app.command(name="list", help="List all presentations")(list_command)
app.command(name="serve", help="Launch the web UI")(serve_command)
app.command(name="themes", help="List available themes")(themes_command)


if __name__ == "__main__":
    app()
