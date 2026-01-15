"""Tests for AI service refactored methods."""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.ai_service import AIService, SlideOutline, PresentationOutline


class TestAIService:
    """Test suite for AI service."""

    @pytest.fixture
    def mock_client(self):
        """Create a mock Anthropic client."""
        client = MagicMock()
        response = MagicMock()
        content = MagicMock()
        content.text = "Test response"
        response.content = [content]
        client.messages.create.return_value = response
        return client

    @pytest.fixture
    def ai_service(self, mock_client):
        """Create AI service with mocked client."""
        with patch.dict('os.environ', {
            'AZURE_ENDPOINT': 'https://test.openai.azure.com',
            'API_KEY': 'test-key',
            'AZURE_DEPLOYMENT': 'claude-test'
        }):
            service = AIService()
            service.client = mock_client
            return service

    def test_call_ai_success(self, ai_service, mock_client):
        """Test successful AI call."""
        result = ai_service._call_ai("Test prompt", max_tokens=100, context="Test")

        assert result == "Test response"
        mock_client.messages.create.assert_called_once()
        call_args = mock_client.messages.create.call_args
        assert call_args.kwargs['max_tokens'] == 100
        assert call_args.kwargs['messages'][0]['content'] == "Test prompt"

    def test_call_ai_no_client(self):
        """Test AI call with no client initialized."""
        with patch.dict('os.environ', {}, clear=True):
            service = AIService()
            result = service._call_ai("Test prompt", context="Test")
            assert result is None

    def test_call_ai_empty_response(self, ai_service, mock_client):
        """Test AI call with empty response."""
        mock_client.messages.create.return_value.content = []
        result = ai_service._call_ai("Test prompt", context="Test")
        assert result is None

    def test_call_ai_exception(self, ai_service, mock_client):
        """Test AI call with exception."""
        mock_client.messages.create.side_effect = Exception("API Error")
        result = ai_service._call_ai("Test prompt", context="Test")
        assert result is None

    def test_extract_outline_json_success(self, ai_service):
        """Test successful JSON extraction."""
        outline_data = {
            "title": "Test Presentation",
            "slides": [
                {"title": "Slide 1", "content_points": ["Point 1"], "notes": ""}
            ]
        }
        raw_content = json.dumps(outline_data)

        result = ai_service._extract_outline_json(raw_content)
        assert result == outline_data

    def test_extract_outline_json_with_code_fence(self, ai_service):
        """Test JSON extraction from code fence."""
        outline_data = {
            "title": "Test Presentation",
            "slides": [
                {"title": "Slide 1", "content_points": ["Point 1"], "notes": ""}
            ]
        }
        raw_content = f"```json\n{json.dumps(outline_data)}\n```"

        result = ai_service._extract_outline_json(raw_content)
        assert result == outline_data

    def test_extract_outline_json_empty(self, ai_service):
        """Test JSON extraction with empty content."""
        result = ai_service._extract_outline_json("")
        assert result is None

    def test_extract_outline_json_invalid(self, ai_service):
        """Test JSON extraction with invalid JSON."""
        result = ai_service._extract_outline_json("Not valid JSON at all")
        assert result is None

    def test_strip_outer_code_fence(self):
        """Test code fence stripping."""
        content = "```markdown\n# Title\nContent\n```"
        result = AIService._strip_outer_code_fence(content)
        assert result == "# Title\nContent"

    def test_strip_outer_code_fence_no_fence(self):
        """Test code fence stripping with no fence."""
        content = "# Title\nContent"
        result = AIService._strip_outer_code_fence(content)
        assert result == "# Title\nContent"

    def test_generate_outline_success(self, ai_service, mock_client):
        """Test successful outline generation."""
        outline_data = {
            "title": "Test Presentation",
            "slides": [
                {"title": "Slide 1", "content_points": ["Point 1"], "notes": "Note 1"}
            ]
        }
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=json.dumps(outline_data))]
        mock_client.messages.create.return_value = mock_response

        result = ai_service.generate_outline("Create a presentation about testing")

        assert result is not None
        assert isinstance(result, PresentationOutline)
        assert result.title == "Test Presentation"
        assert len(result.slides) == 1

    def test_generate_outline_invalid_response(self, ai_service, mock_client):
        """Test outline generation with invalid response."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Invalid JSON")]
        mock_client.messages.create.return_value = mock_response

        result = ai_service.generate_outline("Create a presentation")
        assert result is None

    def test_generate_slide_content_success(self, ai_service, mock_client):
        """Test successful slide content generation."""
        slide_outline = SlideOutline(
            title="Test Slide",
            content_points=["Point 1", "Point 2"],
            notes="Notes"
        )

        result = ai_service.generate_slide_content(slide_outline)

        assert result is not None
        assert isinstance(result, str)
        mock_client.messages.create.assert_called_once()

    def test_generate_slide_content_fallback(self, ai_service, mock_client):
        """Test slide content generation with fallback."""
        mock_client.messages.create.side_effect = Exception("API Error")
        slide_outline = SlideOutline(
            title="Test Slide",
            content_points=["Point 1", "Point 2"],
            notes="Notes"
        )

        result = ai_service.generate_slide_content(slide_outline)

        assert "# Test Slide" in result
        assert "- Point 1" in result
        assert "- Point 2" in result
