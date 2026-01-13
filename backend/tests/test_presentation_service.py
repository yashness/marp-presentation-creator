import pytest
from app.services import presentation_service

def test_validate_presentation_id_valid():
    assert presentation_service.validate_presentation_id("123-456") is None

def test_validate_presentation_id_with_slash():
    with pytest.raises(ValueError, match="Invalid presentation ID"):
        presentation_service.validate_presentation_id("../etc/passwd")

def test_validate_presentation_id_with_backslash():
    with pytest.raises(ValueError, match="Invalid presentation ID"):
        presentation_service.validate_presentation_id("foo\\bar")

def test_validate_presentation_id_with_dots():
    with pytest.raises(ValueError, match="Invalid presentation ID"):
        presentation_service.validate_presentation_id("foo..bar")
