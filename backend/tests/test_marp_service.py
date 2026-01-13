from pathlib import Path
from app.services import marp_service
import pytest

def get_valid_markdown() -> str:
    return "---\nmarp: true\n---\n\n# Test Slide"

def test_validate_markdown_valid():
    assert marp_service.validate_markdown(get_valid_markdown()) is True

def test_validate_markdown_empty():
    assert marp_service.validate_markdown("") is False
    assert marp_service.validate_markdown("   ") is False

def test_create_temp_file():
    content = "test content"
    temp_file = marp_service.create_temp_file(content)
    assert temp_file.exists()
    assert temp_file.read_text() == content
    temp_file.unlink(missing_ok=True)

def test_build_marp_cmd_basic():
    temp_file = Path("/tmp/test.md")
    cmd = marp_service.build_marp_cmd(temp_file, "--pdf", None, None)
    assert "--pdf" in cmd
    assert str(temp_file) in cmd

def test_build_marp_cmd_with_output():
    temp_file = Path("/tmp/test.md")
    cmd = marp_service.build_marp_cmd(temp_file, "--pdf", "/output/file.pdf", None)
    assert "-o" in cmd
    assert "/output/file.pdf" in cmd

def test_build_marp_cmd_with_theme():
    temp_file = Path("/tmp/test.md")
    cmd = marp_service.build_marp_cmd(temp_file, "--html", None, "default")
    assert "--theme" in cmd
    assert "default" in cmd

def test_render_to_html_invalid_content():
    with pytest.raises(ValueError):
        marp_service.render_to_html("")
