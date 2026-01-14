"""Tests for CLI commands."""

from pathlib import Path
import pytest
from typer.testing import CliRunner
from marpify.main import app
from marpify.commands.init import validate_template, get_template_content
from marpify.commands.export import validate_format, extract_title

runner = CliRunner()


def test_init_command(tmp_path: Path, monkeypatch):
    """Test init command creates project."""
    monkeypatch.chdir(tmp_path)
    result = runner.invoke(app, ["init", "test-project"])
    assert result.exit_code == 0
    assert (tmp_path / "test-project" / "slides.md").exists()


def test_init_command_with_template(tmp_path: Path, monkeypatch):
    """Test init command with template."""
    monkeypatch.chdir(tmp_path)
    result = runner.invoke(app, ["init", "test-project", "-t", "corporate"])
    assert result.exit_code == 0


def test_validate_template_valid():
    """Test template validation with valid template."""
    validate_template("default")
    validate_template("corporate")


def test_validate_template_invalid():
    """Test template validation with invalid template."""
    with pytest.raises(ValueError):
        validate_template("invalid")


def test_get_template_content():
    """Test getting template content."""
    content = get_template_content("default")
    assert "marp: true" in content
    assert "# Welcome" in content


def test_validate_format_valid():
    """Test format validation with valid formats."""
    validate_format("pdf")
    validate_format("html")
    validate_format("pptx")


def test_validate_format_invalid():
    """Test format validation with invalid format."""
    with pytest.raises(ValueError):
        validate_format("invalid")


def test_extract_title():
    """Test extracting title from markdown."""
    content = "---\nmarp: true\n---\n\n# My Title\n\nContent"
    assert extract_title(content) == "My Title"


def test_extract_title_no_title():
    """Test extracting title when no title present."""
    content = "No title here"
    assert extract_title(content) == "Untitled Presentation"


def test_help_command():
    """Test help command."""
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "Marp Presentation Builder CLI" in result.stdout
