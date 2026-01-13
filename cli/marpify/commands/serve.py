import typer
import webbrowser
from rich.console import Console

console = Console()

def serve_app(
    port: int = typer.Option(8000, "--port", "-p", help="Port to run server on"),
    host: str = typer.Option("0.0.0.0", "--host", "-h", help="Host to bind to"),
    open_browser: bool = typer.Option(True, "--open/--no-open", "-o/-no", help="Open browser")
):
    """
    Launch the Marp Builder web UI server.

    Examples:
        marpify serve
        marpify serve --port 3000
        marpify serve -p 8080 --no-open
    """
    url = f"http://{host}:{port}"
    console.print(f"[green]Starting server at {url}[/green]")

    if open_browser:
        open_browser_window(url)

    console.print("[yellow]Note: Backend must be running separately[/yellow]")
    console.print(f"[cyan]Server will be available at:[/cyan] {url}")

def open_browser_window(url: str):
    try:
        webbrowser.open(url)
    except Exception:
        pass
