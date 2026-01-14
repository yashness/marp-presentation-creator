"""Edge case tests for CLI commands."""

import pytest
from pathlib import Path
from marpify.commands.init import validate_project_name, validate_template
from marpify.commands.export import validate_format, validate_file_exists

def test_validate_project_name_empty():
    """Test project name validation rejects empty string."""
    with pytest.raises(ValueError, match="cannot be empty"):
        validate_project_name("")

def test_validate_project_name_whitespace():
    """Test project name validation rejects whitespace only."""
    with pytest.raises(ValueError, match="cannot be empty"):
        validate_project_name("   ")

def test_validate_project_name_invalid_chars():
    """Test project name validation rejects invalid characters."""
    invalid_names = ["test/project", "test\\file", "test:project", "test*file", "test?name"]
    for name in invalid_names:
        with pytest.raises(ValueError, match="invalid characters"):
            validate_project_name(name)

def test_validate_project_name_valid():
    """Test project name validation accepts valid names."""
    validate_project_name("my-project")
    validate_project_name("project_123")
    validate_project_name("Project Name")

def test_validate_template_invalid():
    """Test template validation rejects invalid template."""
    with pytest.raises(ValueError, match="Invalid template"):
        validate_template("nonexistent")

def test_validate_template_valid():
    """Test template validation accepts valid templates."""
    validate_template("default")
    validate_template("corporate")
    validate_template("academic")

def test_validate_format_invalid():
    """Test export format validation rejects invalid format."""
    with pytest.raises(ValueError, match="Invalid format"):
        validate_format("docx")

def test_validate_format_valid():
    """Test export format validation accepts valid formats."""
    validate_format("pdf")
    validate_format("html")
    validate_format("pptx")

def test_validate_file_exists_missing(tmp_path):
    """Test file validation detects missing files."""
    missing_file = tmp_path / "nonexistent.md"
    with pytest.raises(FileNotFoundError, match="not found"):
        validate_file_exists(str(missing_file))

def test_validate_file_exists_directory(tmp_path):
    """Test file validation rejects directories."""
    dir_path = tmp_path / "testdir"
    dir_path.mkdir()
    with pytest.raises(ValueError, match="Not a file"):
        validate_file_exists(str(dir_path))

def test_validate_file_exists_valid(tmp_path):
    """Test file validation accepts valid files."""
    test_file = tmp_path / "test.md"
    test_file.write_text("# Test")
    validate_file_exists(str(test_file))
