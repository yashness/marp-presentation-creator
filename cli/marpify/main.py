import typer
from rich.console import Console
from marpify.commands import init, serve, export

app = typer.Typer(
    help="Marp Presentation Builder CLI - Create beautiful presentations with Markdown",
    add_completion=False
)
console = Console()

app.command(name="init")(init.init_project)
app.command(name="serve")(serve.serve_app)
app.command(name="export")(export.export_presentation)

if __name__ == "__main__":
    app()
