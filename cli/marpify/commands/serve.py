"""Serve command - Launch the web UI."""

import subprocess
import webbrowser
import typer
from marpify.config import DEFAULT_PORT
from marpify.utils import print_success, print_info, print_error


def open_browser(port: int) -> None:
    """Open browser to the application URL."""
    url = f"http://localhost:{port}"
    webbrowser.open(url)


def start_server(port: int) -> None:
    """Start the development server."""
    try:
        subprocess.run(["npm", "run", "dev", "--", f"--port={port}"], cwd="../frontend")
    except KeyboardInterrupt:
        print_info("\nServer stopped")

def handle_serve(port: int, no_open: bool) -> None:
    """Handle server startup."""
    print_success(f"Starting server on port {port}")
    if not no_open:
        open_browser(port)
    start_server(port)

def serve_command(
    port: int = typer.Option(DEFAULT_PORT, "--port", "-p", help="Port to run on"),
    no_open: bool = typer.Option(False, "--no-open", help="Don't open browser")
) -> None:
    """Launch the web UI in development mode."""
    try:
        handle_serve(port, no_open)
    except Exception as e:
        print_error(str(e))
        raise typer.Exit(1)
