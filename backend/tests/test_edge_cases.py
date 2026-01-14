"""Edge case tests for file errors, security, and error handling."""

import pytest
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
from app.services import presentation_service, marp_service
from app.core.validators import sanitize_filename

def test_sanitize_filename_unicode():
    """Test filename sanitization with unicode characters."""
    result = sanitize_filename("презентация")
    assert result == "презентация"

def test_sanitize_filename_null_byte():
    """Test filename sanitization removes null bytes."""
    result = sanitize_filename("file\x00name")
    assert "\x00" not in result

def test_sanitize_filename_special_chars():
    """Test removal of all unsafe characters."""
    result = sanitize_filename('test<>:"|?*file')
    assert all(c not in result for c in '<>:"|?*')

def test_metadata_file_corruption(tmp_path):
    """Test handling of corrupted metadata JSON."""
    pres_dir = tmp_path / "test-id"
    pres_dir.mkdir()
    metadata_file = pres_dir / "metadata.json"
    metadata_file.write_text("{invalid json")

    with patch("app.services.presentation_service.PRESENTATIONS_DIR", tmp_path):
        result = presentation_service.get_presentation("test-id")
        assert result is None

def test_metadata_missing_required_fields(tmp_path):
    """Test metadata with missing required fields."""
    pres_dir = tmp_path / "test-id"
    pres_dir.mkdir()
    metadata_file = pres_dir / "metadata.json"
    metadata_file.write_text('{"id": "test-id"}')

    with patch("app.services.presentation_service.PRESENTATIONS_DIR", tmp_path):
        result = presentation_service.get_presentation("test-id")
        assert result is None

def test_large_markdown_content():
    """Test handling of very large markdown content."""
    large_content = "# Slide\n" * 10000
    assert marp_service.validate_markdown(large_content)

def test_empty_content_validation():
    """Test validation rejects empty content."""
    assert not marp_service.validate_markdown("")
    assert not marp_service.validate_markdown("   ")

def test_whitespace_only_validation():
    """Test validation rejects whitespace-only content."""
    assert not marp_service.validate_markdown("\n\n\n")
    assert not marp_service.validate_markdown("\t\t")

def test_presentation_path_traversal_prevention():
    """Test path traversal attack is prevented."""
    with pytest.raises(ValueError, match="Invalid presentation ID"):
        presentation_service.validate_presentation_id("../../etc/passwd")

def test_presentation_null_byte_injection():
    """Test null byte injection is prevented."""
    with pytest.raises(ValueError, match="Invalid presentation ID"):
        presentation_service.validate_presentation_id("test\x00")

def test_batch_export_empty_list_validation():
    """Test batch export request validates minimum length."""
    from app.schemas.batch import BatchExportRequest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        BatchExportRequest(presentation_ids=[], format="pdf")

def test_search_with_special_regex_chars(tmp_path):
    """Test search handles regex special characters safely."""
    pres_dir = tmp_path / "test-id"
    pres_dir.mkdir()
    (pres_dir / "content.md").write_text("# Test [regex]")
    metadata = {
        "id": "test-id",
        "title": "Test (regex)",
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00"
    }
    (pres_dir / "metadata.json").write_text(json.dumps(metadata))

    with patch("app.services.presentation_service.PRESENTATIONS_DIR", tmp_path):
        results = presentation_service.search_presentations("[regex]")
        assert len(results) == 1

def test_marp_subprocess_error_handling():
    """Test marp command failure is handled properly."""
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stderr="Marp error")

        with pytest.raises(RuntimeError, match="Marp render failed"):
            marp_service.render_to_html("# Test")

def test_concurrent_file_access_safety(tmp_path):
    """Test concurrent access doesn't cause file corruption."""
    from concurrent.futures import ThreadPoolExecutor

    pres_dir = tmp_path / "test-id"
    pres_dir.mkdir()
    content_file = pres_dir / "content.md"
    content_file.write_text("# Original")

    def read_content():
        with patch("app.services.presentation_service.PRESENTATIONS_DIR", tmp_path):
            pres = presentation_service.get_presentation("test-id")
            return pres.content if pres else None

    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(lambda _: read_content(), range(10)))
        assert all(r is not None for r in results)
