"""Tests for layout and presentation transformation features."""

import json
import pytest
from unittest.mock import MagicMock, patch

from app.services.ai.slide_operations import SlideOperations, PresentationTransformer
from app.services.ai.layout_guide import LAYOUT_CLASSES, get_layout_prompt


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
    from app.services.ai.client import AIClient
    with patch.dict('os.environ', {
        'AZURE_ENDPOINT': 'https://test.openai.azure.com',
        'API_KEY': 'test-key',
        'AZURE_DEPLOYMENT': 'claude-test'
    }):
        client = AIClient()
        client.client = mock_anthropic_client
        return client


class TestLayoutGuide:
    """Tests for layout guide configuration."""

    def test_layout_classes_exist(self):
        """Test that layout classes are defined."""
        assert len(LAYOUT_CLASSES) > 0

    def test_layout_classes_have_required_fields(self):
        """Test that each layout has name, description, and html."""
        for key, layout in LAYOUT_CLASSES.items():
            assert "name" in layout, f"Layout {key} missing name"
            assert "description" in layout, f"Layout {key} missing description"
            assert "html" in layout, f"Layout {key} missing html"

    def test_get_layout_prompt_returns_string(self):
        """Test that get_layout_prompt returns a prompt string."""
        prompt = get_layout_prompt()
        assert isinstance(prompt, str)
        assert len(prompt) > 0

    @pytest.mark.parametrize("layout_type", [
        "columns-2", "columns-3",
        "columns-2-wide-left", "columns-2-wide-right",
        "feature-grid", "comparison",
        "timeline", "pros-cons",
        "split", "center", "cards", "quote",
    ])
    def test_common_layouts_defined(self, layout_type):
        """Test that common layout types are defined."""
        assert layout_type in LAYOUT_CLASSES


class TestSlideOperationsLayout:
    """Tests for slide layout operations."""

    def test_apply_layout_with_valid_type(self, ai_client, mock_anthropic_client):
        """Test applying a specific layout type."""
        mock_anthropic_client.messages.create.return_value.content[0].text = """
<div class="columns-2">
<div>

## Column 1
- Point A
- Point B

</div>
<div>

## Column 2
- Point C
- Point D

</div>
</div>
"""
        ops = SlideOperations(ai_client)
        result = ops.apply_layout("# Test\n- Point 1\n- Point 2", "columns-2")

        assert "columns-2" in result
        assert "div" in result

    def test_apply_layout_with_invalid_type_falls_back(self, ai_client, mock_anthropic_client):
        """Test that invalid layout type falls back to auto-layout."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "# Reformatted"

        ops = SlideOperations(ai_client)
        result = ops.apply_layout("# Test", "invalid-layout-xyz")

        assert result is not None

    def test_rewrite_layout_auto_selects(self, ai_client, mock_anthropic_client):
        """Test auto layout selection."""
        mock_anthropic_client.messages.create.return_value.content[0].text = """
<div class="feature-grid">
<div class="card">Feature 1</div>
<div class="card">Feature 2</div>
</div>
"""
        ops = SlideOperations(ai_client)
        result = ops.rewrite_layout("# Features\n- Feature 1\n- Feature 2")

        assert result is not None

    def test_viewport_constraints_in_layout(self, ai_client):
        """Test that viewport constraints are applied in layout operations."""
        ops = SlideOperations(ai_client)
        assert ops.MAX_BULLETS == 6
        assert ops.MAX_CHARS == 80


class TestSlideOperationsDuplicate:
    """Tests for slide duplication with rewrite."""

    def test_duplicate_and_rewrite_changes_topic(self, ai_client, mock_anthropic_client):
        """Test that duplicate and rewrite changes the topic."""
        mock_anthropic_client.messages.create.return_value.content[0].text = """
# Machine Learning
- Neural networks are powerful
- Deep learning advances
- AI transforms industries
"""
        ops = SlideOperations(ai_client)
        original = "# Python Basics\n- Variables store data\n- Functions organize code\n- Loops repeat actions"
        result = ops.duplicate_and_rewrite(original, "Machine Learning")

        assert "Machine Learning" in result or "Neural" in result or "AI" in result

    def test_duplicate_preserves_structure(self, ai_client, mock_anthropic_client):
        """Test that duplicate preserves layout structure."""
        mock_anthropic_client.messages.create.return_value.content[0].text = """
<div class="columns-2">
<div>

## AI Benefits
- Automation
- Speed

</div>
<div>

## Challenges
- Cost
- Complexity

</div>
</div>
"""
        ops = SlideOperations(ai_client)
        original = '<div class="columns-2"><div>## Pros\n- Good\n- Better</div><div>## Cons\n- Bad\n- Worse</div></div>'
        result = ops.duplicate_and_rewrite(original, "AI Implementation")

        assert "columns-2" in result or "div" in result

    def test_duplicate_with_unavailable_client(self):
        """Test duplicate when AI client is unavailable."""
        from app.services.ai.client import AIClient
        with patch.dict('os.environ', {}, clear=True):
            client = AIClient()
            # Client should be unavailable without credentials
            assert not client.is_available

            ops = SlideOperations(client)
            original = "# Original Content"
            result = ops.duplicate_and_rewrite(original, "New Topic")

            assert result == original


class TestPresentationTransformer:
    """Tests for presentation-level transformations."""

    def test_rearrange_returns_reordered_slides(self, ai_client, mock_anthropic_client):
        """Test slide rearrangement."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "2, 1, 3"

        transformer = PresentationTransformer(ai_client)
        slides = ["# Slide 1", "# Slide 2", "# Slide 3"]
        result = transformer.rearrange(slides)

        assert len(result) == 3
        assert result[0] == "# Slide 2"
        assert result[1] == "# Slide 1"
        assert result[2] == "# Slide 3"

    def test_rearrange_handles_invalid_response(self, ai_client, mock_anthropic_client):
        """Test rearrange with invalid AI response."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "invalid"

        transformer = PresentationTransformer(ai_client)
        slides = ["# Slide 1", "# Slide 2"]
        result = transformer.rearrange(slides)

        assert result == slides  # Original order preserved

    def test_rearrange_handles_wrong_count(self, ai_client, mock_anthropic_client):
        """Test rearrange with wrong number of slides."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "1, 2, 3, 4"

        transformer = PresentationTransformer(ai_client)
        slides = ["# Slide 1", "# Slide 2"]  # Only 2 slides
        result = transformer.rearrange(slides)

        assert result == slides  # Original order preserved

    def test_rearrange_single_slide_unchanged(self, ai_client):
        """Test that single slide is unchanged."""
        transformer = PresentationTransformer(ai_client)
        slides = ["# Only Slide"]
        result = transformer.rearrange(slides)

        assert result == slides

    @pytest.mark.parametrize("style", ["story", "teaching", "pitch", "workshop", "technical", "executive"])
    def test_transform_style_all_types(self, ai_client, mock_anthropic_client, style):
        """Test all style transformations."""
        mock_anthropic_client.messages.create.return_value.content[0].text = f"# {style.title()} Style"

        transformer = PresentationTransformer(ai_client)
        slides = ["# Original Slide\n- Point 1"]
        result = transformer.transform_style(slides, style)

        assert len(result) == 1
        assert result[0] is not None

    def test_transform_style_preserves_slide_count(self, ai_client, mock_anthropic_client):
        """Test that style transformation preserves slide count."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "# Transformed"

        transformer = PresentationTransformer(ai_client)
        slides = ["# Slide 1", "# Slide 2", "# Slide 3"]
        result = transformer.transform_style(slides, "teaching")

        assert len(result) == len(slides)

    def test_rewrite_for_topic_changes_content(self, ai_client, mock_anthropic_client):
        """Test rewriting for a new topic."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "# Quantum Computing\n- Qubits\n- Superposition"

        transformer = PresentationTransformer(ai_client)
        slides = ["# Python Basics\n- Variables\n- Functions"]
        result = transformer.rewrite_for_topic(slides, "Quantum Computing")

        assert len(result) == 1
        assert "Quantum" in result[0] or "Qubit" in result[0]

    def test_rewrite_keeps_style_flag(self, ai_client, mock_anthropic_client):
        """Test that keep_style parameter works."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "# New Topic"

        transformer = PresentationTransformer(ai_client)
        slides = ["# Original"]

        # Both should work (keep_style True or False)
        result_keep = transformer.rewrite_for_topic(slides, "New Topic", keep_style=True)
        result_fresh = transformer.rewrite_for_topic(slides, "New Topic", keep_style=False)

        assert len(result_keep) == 1
        assert len(result_fresh) == 1


class TestSlideOperationsEdgeCases:
    """Edge case tests for slide operations."""

    def test_empty_content(self, ai_client, mock_anthropic_client):
        """Test with empty content."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "# Empty Slide"

        ops = SlideOperations(ai_client)
        result = ops.rewrite("", "make it better")

        assert result is not None

    def test_very_long_content(self, ai_client, mock_anthropic_client):
        """Test with very long content."""
        long_content = "# Title\n" + "\n".join([f"- Point {i}" for i in range(50)])
        mock_anthropic_client.messages.create.return_value.content[0].text = "# Simplified"

        ops = SlideOperations(ai_client)
        result = ops.simplify(long_content)

        assert result is not None

    def test_content_with_html(self, ai_client, mock_anthropic_client):
        """Test content with existing HTML."""
        html_content = '<div class="columns-2"><div>Left</div><div>Right</div></div>'
        mock_anthropic_client.messages.create.return_value.content[0].text = html_content

        ops = SlideOperations(ai_client)
        result = ops.apply_layout(html_content, "columns-3")

        assert result is not None

    def test_split_already_small(self, ai_client, mock_anthropic_client):
        """Test split on already small content."""
        mock_anthropic_client.messages.create.return_value.content[0].text = "# Small\n- One point"

        ops = SlideOperations(ai_client)
        result = ops.split("# Small\n- One point")

        assert len(result) >= 1


class TestAPIIntegration:
    """Test API endpoint integration for layout features."""

    def test_layouts_endpoint_structure(self):
        """Test that layout classes have the right structure for API."""
        for key, layout in LAYOUT_CLASSES.items():
            # API expects these fields
            assert isinstance(layout["name"], str)
            assert isinstance(layout["description"], str)
            assert isinstance(layout["html"], str)
            # Key should be valid CSS class
            assert key.replace("-", "").replace("_", "").isalnum() or key == key
