"""API integration tests for AI endpoints."""

import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_ai_service():
    """Mock the AI service for API tests."""
    with patch('app.api.routes.ai_generation.ai_service') as mock:
        mock.is_available = True
        yield mock


# =============================================================================
# GENERATE OUTLINE ENDPOINT
# =============================================================================

class TestGenerateOutlineEndpoint:
    """Tests for /api/ai/generate-outline endpoint."""

    def test_generate_outline_success(self, client, mock_ai_service):
        """Test successful outline generation."""
        from app.services.ai import PresentationOutline, SlideOutline

        mock_ai_service.generate_outline.return_value = PresentationOutline(
            title="Test Presentation",
            slides=[SlideOutline(title="Intro", content_points=["Point 1"], notes="")]
        )

        response = client.post("/api/ai/generate-outline", json={
            "description": "Create a presentation about Python programming"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["outline"]["title"] == "Test Presentation"

    def test_generate_outline_with_options(self, client, mock_ai_service):
        """Test outline generation with optional parameters."""
        from app.services.ai import PresentationOutline, SlideOutline

        mock_ai_service.generate_outline.return_value = PresentationOutline(
            title="Custom",
            slides=[SlideOutline(title="S1", content_points=["P1"], notes="")]
        )

        response = client.post("/api/ai/generate-outline", json={
            "description": "Test presentation",
            "slide_count": 10,
            "audience": "developers",
            "flavor": "technical"
        })

        assert response.status_code == 200
        mock_ai_service.generate_outline.assert_called_once()

    def test_generate_outline_failure(self, client, mock_ai_service):
        """Test outline generation failure."""
        mock_ai_service.generate_outline.return_value = None

        response = client.post("/api/ai/generate-outline", json={
            "description": "Test presentation"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False

    def test_generate_outline_validation_error(self, client, mock_ai_service):
        """Test outline generation with invalid input."""
        response = client.post("/api/ai/generate-outline", json={
            "description": "short"  # Too short (min 10 chars)
        })

        assert response.status_code == 422  # Validation error

    @pytest.mark.parametrize("slide_count", [1, 10, 50])
    def test_generate_outline_slide_count_range(self, client, mock_ai_service, slide_count):
        """Test slide count within valid range."""
        from app.services.ai import PresentationOutline, SlideOutline

        mock_ai_service.generate_outline.return_value = PresentationOutline(
            title="Test",
            slides=[SlideOutline(title="S1", content_points=["P1"], notes="")]
        )

        response = client.post("/api/ai/generate-outline", json={
            "description": "Test presentation topic",
            "slide_count": slide_count
        })

        assert response.status_code == 200


# =============================================================================
# GENERATE CONTENT ENDPOINT
# =============================================================================

class TestGenerateContentEndpoint:
    """Tests for /api/ai/generate-content endpoint."""

    def test_generate_content_success(self, client, mock_ai_service):
        """Test successful content generation."""
        mock_ai_service.generate_full_presentation.return_value = "---\nmarp: true\n---\n\n# Title"

        response = client.post("/api/ai/generate-content", json={
            "outline": {
                "title": "Test",
                "slides": [
                    {"title": "Intro", "content_points": ["Point 1"], "notes": ""}
                ]
            },
            "theme": "professional"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "marp: true" in data["content"]

    def test_generate_content_failure(self, client, mock_ai_service):
        """Test content generation failure."""
        mock_ai_service.generate_full_presentation.return_value = None

        response = client.post("/api/ai/generate-content", json={
            "outline": {
                "title": "Test",
                "slides": [{"title": "S1", "content_points": ["P1"], "notes": ""}]
            }
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False


# =============================================================================
# GENERATE COMMENTARY ENDPOINT
# =============================================================================

class TestGenerateCommentaryEndpoint:
    """Tests for /api/ai/generate-commentary endpoint."""

    def test_generate_commentary_success(self, client, mock_ai_service):
        """Test successful commentary generation."""
        mock_ai_service.generate_commentary.return_value = ["Comment 1", "Comment 2"]

        response = client.post("/api/ai/generate-commentary", json={
            "slides": [
                {"content": "# Slide 1"},
                {"content": "# Slide 2"}
            ],
            "style": "professional"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["comments"]) == 2

    def test_generate_commentary_empty_slides(self, client, mock_ai_service):
        """Test commentary with empty slides."""
        mock_ai_service.generate_commentary.return_value = []

        response = client.post("/api/ai/generate-commentary", json={
            "slides": [],
            "style": "professional"
        })

        assert response.status_code == 200


# =============================================================================
# SLIDE OPERATION ENDPOINT
# =============================================================================

class TestSlideOperationEndpoint:
    """Tests for /api/ai/slide-operation endpoint."""

    @pytest.mark.parametrize("operation", ["layout", "restyle", "simplify", "expand"])
    def test_slide_operation_content_result(self, client, mock_ai_service, operation):
        """Test operations that return content."""
        mock_ai_service.rewrite_layout.return_value = "# Result"
        mock_ai_service.restyle_slide.return_value = "# Result"
        mock_ai_service.simplify_slide.return_value = "# Result"
        mock_ai_service.expand_slide.return_value = "# Result"

        response = client.post("/api/ai/slide-operation", json={
            "content": "# Original",
            "operation": operation
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_slide_operation_split(self, client, mock_ai_service):
        """Test split operation returns slides array."""
        mock_ai_service.split_slide.return_value = ["# Part 1", "# Part 2"]

        response = client.post("/api/ai/slide-operation", json={
            "content": "# Overloaded",
            "operation": "split"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["slides"]) == 2

    def test_slide_operation_unknown(self, client, mock_ai_service):
        """Test unknown operation."""
        response = client.post("/api/ai/slide-operation", json={
            "content": "# Test",
            "operation": "unknown_operation"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False


# =============================================================================
# REWRITE SLIDE ENDPOINT
# =============================================================================

class TestRewriteSlideEndpoint:
    """Tests for /api/ai/rewrite-slide endpoint."""

    def test_rewrite_slide_success(self, client, mock_ai_service):
        """Test successful slide rewrite."""
        mock_ai_service.rewrite_slide.return_value = "# Rewritten content"

        response = client.post("/api/ai/rewrite-slide", json={
            "current_content": "# Original",
            "instruction": "Make it more concise"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Rewritten" in data["content"]

    @pytest.mark.parametrize("length", ["short", "medium", "long"])
    def test_rewrite_slide_lengths(self, client, mock_ai_service, length):
        """Test rewrite with different lengths."""
        mock_ai_service.rewrite_slide.return_value = "# Result"

        response = client.post("/api/ai/rewrite-slide", json={
            "current_content": "# Original",
            "instruction": "Improve this",
            "length": length
        })

        assert response.status_code == 200


# =============================================================================
# REGENERATE COMMENT ENDPOINTS
# =============================================================================

class TestRegenerateCommentEndpoints:
    """Tests for comment regeneration endpoints."""

    def test_regenerate_single_comment(self, client, mock_ai_service):
        """Test single comment regeneration."""
        mock_ai_service.regenerate_comment.return_value = "New comment"

        response = client.post("/api/ai/regenerate-comment", json={
            "slide_content": "# Test Slide"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["comment"] == "New comment"

    def test_regenerate_all_comments(self, client, mock_ai_service):
        """Test all comments regeneration."""
        mock_ai_service.regenerate_all_comments.return_value = ["C1", "C2"]

        response = client.post("/api/ai/regenerate-all-comments", json={
            "slides": [
                {"content": "# S1", "comment": "old1"},
                {"content": "# S2", "comment": "old2"}
            ]
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["comments"]) == 2


# =============================================================================
# AI STATUS ENDPOINT
# =============================================================================

class TestAIStatusEndpoint:
    """Tests for /api/ai/status endpoint."""

    def test_status_available(self, client, mock_ai_service):
        """Test status when AI is available."""
        mock_ai_service.is_available = True

        response = client.get("/api/ai/status")

        assert response.status_code == 200
        data = response.json()
        assert data["available"] is True

    def test_status_unavailable(self, client, mock_ai_service):
        """Test status when AI is unavailable."""
        mock_ai_service.is_available = False

        response = client.get("/api/ai/status")

        assert response.status_code == 200
        data = response.json()
        assert data["available"] is False
