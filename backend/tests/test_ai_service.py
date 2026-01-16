"""Comprehensive tests for AI service modules."""

import json
import pytest
from unittest.mock import MagicMock, patch

from app.services.ai import AIService, SlideOutline, PresentationOutline
from app.services.ai.client import AIClient
from app.services.ai.text_utils import (
    extract_json,
    extract_json_array,
    strip_code_fence,
    strip_frontmatter,
    sanitize_markdown,
    fix_broken_comments,
    parse_slide_blocks,
    format_for_audio,
)
from app.services.ai.outline_generator import OutlineGenerator
from app.services.ai.content_generator import ContentGenerator
from app.services.ai.commentary_generator import CommentaryGenerator
from app.services.ai.slide_operations import SlideOperations


@pytest.fixture
def mock_anthropic_client():
    """Create a mock Anthropic client."""
    client = MagicMock()
    response = MagicMock()
    content = MagicMock()
    content.text = "Test response"
    response.content = [content]
    client.messages.create.return_value = response
    return client


@pytest.fixture
def ai_client(mock_anthropic_client):
    """Create AIClient with mocked Anthropic client."""
    with patch.dict('os.environ', {
        'AZURE_ENDPOINT': 'https://test.openai.azure.com',
        'API_KEY': 'test-key',
        'AZURE_DEPLOYMENT': 'claude-test'
    }):
        client = AIClient()
        client.client = mock_anthropic_client
        return client


@pytest.fixture
def ai_service(ai_client):
    """Create full AI service with mocked client."""
    with patch.dict('os.environ', {
        'AZURE_ENDPOINT': 'https://test.openai.azure.com',
        'API_KEY': 'test-key',
    }):
        service = AIService()
        service.client = ai_client
        return service


@pytest.fixture
def sample_outline():
    """Create sample presentation outline."""
    return PresentationOutline(
        title="Test Presentation",
        slides=[
            SlideOutline(title="Introduction", content_points=["Point 1", "Point 2"], notes=""),
            SlideOutline(title="Main Topic", content_points=["Detail A", "Detail B"], notes=""),
            SlideOutline(title="Conclusion", content_points=["Summary"], notes=""),
        ]
    )


class TestTextUtils:
    """Tests for text utility functions."""

    @pytest.mark.parametrize("input_json,expected", [
        ('{"title": "Test"}', {"title": "Test"}),
        ('```json\n{"title": "Test"}\n```', {"title": "Test"}),
        ('  {"title": "Test"}  ', {"title": "Test"}),
    ])
    def test_extract_json_success(self, input_json, expected):
        """Test successful JSON extraction."""
        result = extract_json(input_json)
        assert result == expected

    @pytest.mark.parametrize("invalid_input", [
        "",
        "Not JSON",
        "{ invalid }",
    ])
    def test_extract_json_failure(self, invalid_input):
        """Test JSON extraction failure."""
        result = extract_json(invalid_input)
        assert result is None

    def test_extract_json_none_input(self):
        """Test JSON extraction with None."""
        result = extract_json(None)
        assert result is None

    @pytest.mark.parametrize("input_text,expected", [
        ("```markdown\n# Title\n```", "# Title"),
        ("```md\nContent\n```", "Content"),
        ("No fence", "No fence"),
        ("", ""),
    ])
    def test_strip_code_fence(self, input_text, expected):
        """Test code fence stripping."""
        result = strip_code_fence(input_text)
        assert result == expected

    @pytest.mark.parametrize("input_text,expected", [
        ("---\nmarp: true\n---\n# Title", "# Title"),
        ("# No Frontmatter", "# No Frontmatter"),
        ("", ""),
    ])
    def test_strip_frontmatter(self, input_text, expected):
        """Test frontmatter stripping."""
        result = strip_frontmatter(input_text)
        assert result == expected

    def test_parse_slide_blocks(self):
        """Test slide block parsing."""
        content = "# Slide 1\n\n---\n\n# Slide 2\n\n---\n\n# Slide 3"
        result = parse_slide_blocks(content)
        assert len(result) == 3
        assert result[0] == "# Slide 1"

    def test_parse_slide_blocks_empty(self):
        """Test empty slide block parsing."""
        assert parse_slide_blocks("") == []

    @pytest.mark.parametrize("input_text,expected", [
        ("**bold** text", "bold text"),
        ("*italic*", "italic"),
        ("`code`", "code"),
        ("NARRATION: text", "text"),
        ("", ""),
    ])
    def test_format_for_audio(self, input_text, expected):
        """Test audio formatting."""
        result = format_for_audio(input_text)
        assert result == expected


class TestAIClient:
    """Tests for AI client."""

    def test_client_initialization_with_credentials(self, ai_client):
        """Test client initializes with credentials."""
        assert ai_client.is_available is True

    def test_client_initialization_without_credentials(self):
        """Test client without credentials."""
        with patch.dict('os.environ', {}, clear=True):
            client = AIClient()
            assert client.is_available is False

    def test_call_success(self, ai_client, mock_anthropic_client):
        """Test successful AI call."""
        result = ai_client.call("Test prompt", max_tokens=100)
        assert result == "Test response"

    def test_call_empty_response(self, ai_client, mock_anthropic_client):
        """Test call with empty response."""
        mock_anthropic_client.messages.create.return_value.content = []
        result = ai_client.call("Test prompt")
        assert result is None

    def test_call_exception(self, ai_client, mock_anthropic_client):
        """Test call with exception."""
        mock_anthropic_client.messages.create.side_effect = Exception("Error")
        result = ai_client.call("Test prompt")
        assert result is None


class TestOutlineGenerator:
    """Tests for outline generation."""

    def test_generate_outline_success(self, ai_client, mock_anthropic_client):
        """Test successful outline generation."""
        outline_data = {
            "title": "Test Presentation",
            "slides": [{"title": "Intro", "content_points": ["Point 1"], "notes": ""}]
        }
        mock_anthropic_client.messages.create.return_value.content[0].text = json.dumps(outline_data)

        generator = OutlineGenerator(ai_client)
        result = generator.generate("Create a presentation about testing")

        assert result is not None
        assert result.title == "Test Presentation"

    def test_generate_outline_invalid_json(self, ai_client, mock_anthropic_client):
        """Test with invalid JSON response."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "Invalid"

        generator = OutlineGenerator(ai_client)
        result = generator.generate("Test topic")
        assert result is None


class TestContentGenerator:
    """Tests for content generation."""

    def test_generate_presentation(self, ai_client, mock_anthropic_client, sample_outline):
        """Test full presentation generation."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "# Generated"

        generator = ContentGenerator(ai_client)
        result = generator.generate(sample_outline)

        assert "marp: true" in result
        assert "Test Presentation" in result

    def test_viewport_constraints_defined(self, ai_client):
        """Test viewport constraints are set."""
        generator = ContentGenerator(ai_client)
        assert generator.MAX_BULLETS == 6
        assert generator.MAX_CHAR_PER_BULLET == 80
        assert generator.MAX_LINES == 12


class TestCommentaryGenerator:
    """Tests for commentary generation."""

    def test_generate_all_commentary(self, ai_client, mock_anthropic_client):
        """Test batch commentary generation."""
        mock_anthropic_client.messages.create.return_value.content[0].text = '["Comment 1", "Comment 2"]'

        generator = CommentaryGenerator(ai_client)
        slides = [{"content": "# Slide 1"}, {"content": "# Slide 2"}]
        result = generator.generate_all(slides)

        assert len(result) == 2

    def test_generate_single_commentary(self, ai_client, mock_anthropic_client):
        """Test single slide commentary."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "This explains the content."

        generator = CommentaryGenerator(ai_client)
        result = generator.generate_single("# Test Slide")

        assert "explains" in result


class TestSlideOperations:
    """Tests for slide operations."""

    def test_rewrite_slide(self, ai_client, mock_anthropic_client):
        """Test slide rewriting."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "# Rewritten"

        ops = SlideOperations(ai_client)
        result = ops.rewrite("# Original", "Make it better")

        assert "Rewritten" in result

    def test_simplify(self, ai_client, mock_anthropic_client):
        """Test slide simplification."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "# Simple"

        ops = SlideOperations(ai_client)
        result = ops.simplify("# Complex content")

        assert result == "# Simple"

    def test_split(self, ai_client, mock_anthropic_client):
        """Test slide splitting."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "# Part 1\n\n---\n\n# Part 2"

        ops = SlideOperations(ai_client)
        result = ops.split("# Overloaded slide")

        assert isinstance(result, list)
        assert len(result) == 2


class TestAIServiceIntegration:
    """Integration tests for full AI service."""

    def test_service_initialization(self, ai_service):
        """Test service initializes."""
        assert ai_service.is_available

    def test_generate_outline_through_service(self, ai_client, mock_anthropic_client):
        """Test outline via main service."""
        mock_anthropic_client.messages.create.return_value.content[0].text = json.dumps({
            "title": "Test",
            "slides": [{"title": "S1", "content_points": ["P1"], "notes": ""}]
        })

        with patch.dict('os.environ', {
            'AZURE_ENDPOINT': 'https://test.openai.azure.com',
            'API_KEY': 'test-key',
        }):
            service = AIService()
            service.client = ai_client
            service._outline = OutlineGenerator(ai_client)

            result = service.generate_outline("Test topic")
            assert result is not None
            assert result.title == "Test"

    def test_slide_operations_through_service(self, ai_client, mock_anthropic_client):
        """Test slide operations via main service."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "# Result"

        with patch.dict('os.environ', {
            'AZURE_ENDPOINT': 'https://test.openai.azure.com',
            'API_KEY': 'test-key',
        }):
            service = AIService()
            service.client = ai_client
            service._slides = SlideOperations(ai_client)

            assert service.rewrite_slide("# Test", "improve") is not None
            assert service.simplify_slide("# Test") is not None
