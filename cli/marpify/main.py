import typer
from rich.console import Console
from marpify.commands import init, serve, export

app = typer.Typer(
    help="Marp Presentation Builder CLI - Create beautiful presentations with Markdown",
    add_completion=False
)
console = Console()

app.command()(init.init_project)
app.command()(serve.serve_app)
app.command()(export.export_presentation)

if __name__ == "__main__":
    app()
