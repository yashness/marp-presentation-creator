"""Tests for CLI utilities."""

from pathlib import Path
import pytest
from marpify.utils import read_markdown_file, write_file, create_table


def test_read_markdown_file(tmp_path: Path):
    """Test reading markdown file."""
    test_file = tmp_path / "test.md"
    content = "# Test\nContent"
    test_file.write_text(content)
    
    result = read_markdown_file(str(test_file))
    assert result == content


def test_read_markdown_file_not_found():
    """Test reading non-existent file raises error."""
    with pytest.raises(FileNotFoundError):
        read_markdown_file("nonexistent.md")


def test_write_file_text(tmp_path: Path):
    """Test writing text file."""
    test_file = tmp_path / "output.txt"
    content = "Test content"
    
    write_file(str(test_file), content)
    assert test_file.read_text() == content


def test_write_file_bytes(tmp_path: Path):
    """Test writing bytes file."""
    test_file = tmp_path / "output.bin"
    content = b"Binary content"
    
    write_file(str(test_file), content)
    assert test_file.read_bytes() == content


def test_create_table():
    """Test creating Rich table."""
    table = create_table("Test", [("Col1", "cyan"), ("Col2", "green")])
    assert table.title == "Test"
    assert len(table.columns) == 2
