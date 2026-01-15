"""Tests for video export service type safety."""

import pytest
from app.services.video_export_service import VideoExportService, SlideData


class TestVideoExportService:
    """Test suite for video export service."""

    @pytest.fixture
    def video_service(self, tmp_path):
        """Create video export service with temp directories."""
        video_dir = tmp_path / "videos"
        temp_dir = tmp_path / "temp"
        return VideoExportService(str(video_dir), str(temp_dir))

    def test_parse_slides_basic(self, video_service):
        """Test basic slide parsing."""
        content = """---
marp: true
---

# Slide 1

Content here

<!-- Comment 1 -->

---

# Slide 2

More content

<!-- Comment 2 -->"""

        slides = video_service._parse_slides(content)

        assert isinstance(slides, list)
        assert len(slides) == 2
        assert all(isinstance(slide, dict) for slide in slides)

        # Check first slide
        assert slides[0]['index'] == 0
        assert 'Slide 1' in slides[0]['content']
        assert slides[0]['comment'] == 'Comment 1'

        # Check second slide
        assert slides[1]['index'] == 1
        assert 'Slide 2' in slides[1]['content']
        assert slides[1]['comment'] == 'Comment 2'

    def test_parse_slides_no_comments(self, video_service):
        """Test slide parsing without comments."""
        content = """# Slide 1

Content here

---

# Slide 2

More content"""

        slides = video_service._parse_slides(content)

        assert len(slides) == 2
        assert slides[0]['comment'] == ''
        assert slides[1]['comment'] == ''

    def test_parse_slides_empty_content(self, video_service):
        """Test slide parsing with empty content."""
        slides = video_service._parse_slides("")
        assert len(slides) == 0

    def test_parse_slides_with_frontmatter(self, video_service):
        """Test slide parsing with frontmatter."""
        content = """---
marp: true
theme: default
---

# First Slide

Content

<!-- Narration -->

---

# Second Slide

More content"""

        slides = video_service._parse_slides(content)

        assert len(slides) == 2
        assert slides[0]['index'] == 0
        assert slides[1]['index'] == 1

    def test_parse_slides_type_safety(self, video_service):
        """Test that parsed slides match SlideData TypedDict structure."""
        content = """# Test

Content

<!-- Comment -->"""

        slides = video_service._parse_slides(content)

        assert len(slides) == 1
        slide = slides[0]

        # Check all required keys exist
        assert 'index' in slide
        assert 'content' in slide
        assert 'comment' in slide

        # Check types
        assert isinstance(slide['index'], int)
        assert isinstance(slide['content'], str)
        assert isinstance(slide['comment'], str)

    def test_prepare_presentation_success(self, video_service):
        """Test successful presentation preparation."""
        content = """# Slide 1

Content

---

# Slide 2

Content 2"""

        result = video_service._prepare_presentation(content)

        assert result is not None
        assert isinstance(result, list)
        assert len(result) == 2
        assert all(isinstance(slide, dict) for slide in result)

    def test_prepare_presentation_empty(self, video_service):
        """Test presentation preparation with empty content."""
        result = video_service._prepare_presentation("")
        assert result is None

    def test_check_dependencies(self, video_service):
        """Test dependency checking."""
        success, message = video_service._check_dependencies()

        # We can't guarantee ffmpeg is installed in all environments,
        # but we can check the function returns the correct types
        assert isinstance(success, bool)
        assert isinstance(message, str)

    def test_slide_data_structure(self):
        """Test SlideData TypedDict structure."""
        # This test validates the structure at runtime
        slide: SlideData = {
            'index': 0,
            'content': 'Test content',
            'comment': 'Test comment'
        }

        assert slide['index'] == 0
        assert slide['content'] == 'Test content'
        assert slide['comment'] == 'Test comment'

        # Verify all required keys
        required_keys = {'index', 'content', 'comment'}
        assert set(slide.keys()) == required_keys
