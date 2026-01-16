"""Main AI service composing all generators."""

from typing import Optional

from .client import AIClient
from .models import PresentationOutline
from .outline_generator import OutlineGenerator
from .content_generator import ContentGenerator
from .commentary_generator import CommentaryGenerator
from .slide_operations import SlideOperations, PresentationTransformer
from .image_generator import ImageGenerator
from .theme_generator import ThemeGenerator
from .layout_guide import get_all_layouts


class AIService:
    """Unified AI service for presentation generation."""

    def __init__(self):
        """Initialize all AI components."""
        self.client = AIClient()
        self._outline = OutlineGenerator(self.client)
        self._content = ContentGenerator(self.client)
        self._commentary = CommentaryGenerator(self.client)
        self._slides = SlideOperations(self.client)
        self._transformer = PresentationTransformer(self.client)
        self._images = ImageGenerator(
            self.client.azure_endpoint or "",
            self.client.api_key or "",
            self.client.image_deployment
        )
        self._themes = ThemeGenerator(self.client)

    @property
    def is_available(self) -> bool:
        """Check if AI is available."""
        return self.client.is_available

    # -------------------------------------------------------------------------
    # Outline Generation
    # -------------------------------------------------------------------------

    def generate_outline(
        self,
        description: str,
        slide_count: Optional[int] = None,
        subtopic_count: Optional[int] = None,
        audience: Optional[str] = None,
        flavor: Optional[str] = None,
        narration_instructions: Optional[str] = None,
        comment_max_ratio: Optional[float] = None,
        language: Optional[str] = None
    ) -> Optional[PresentationOutline]:
        """Generate presentation outline."""
        return self._outline.generate(
            description, slide_count, audience, flavor,
            narration_instructions, comment_max_ratio, language
        )

    # -------------------------------------------------------------------------
    # Content Generation
    # -------------------------------------------------------------------------

    def generate_full_presentation(
        self,
        outline: PresentationOutline,
        theme: str = "professional",
        language: Optional[str] = None
    ) -> str:
        """Generate full presentation without comments."""
        return self._content.generate(outline, theme, language)

    # -------------------------------------------------------------------------
    # Commentary Generation
    # -------------------------------------------------------------------------

    def generate_commentary(
        self,
        slides: list[dict],
        style: str = "professional"
    ) -> list[str]:
        """Generate audio-aware commentary for all slides."""
        return self._commentary.generate_all(slides, style)

    def regenerate_comment(
        self,
        slide_content: str,
        previous_comment: str | None = None,
        context_before: str | None = None,
        context_after: str | None = None,
        style: str = "professional"
    ) -> str:
        """Regenerate single slide commentary."""
        return self._commentary.generate_single(
            slide_content, previous_comment, context_before, context_after, style
        )

    def regenerate_all_comments(
        self,
        slides: list[dict],
        style: str = "professional"
    ) -> list[str]:
        """Regenerate all comments."""
        return self._commentary.generate_all(slides, style)

    # -------------------------------------------------------------------------
    # Slide Operations
    # -------------------------------------------------------------------------

    def rewrite_slide(self, content: str, instruction: str) -> str:
        """Rewrite slide with instruction."""
        return self._slides.rewrite(content, instruction)

    def rewrite_selected_text(
        self,
        full_content: str,
        selected_text: str,
        instruction: str,
        selection_start: int,
        selection_end: int
    ) -> str:
        """Rewrite only the selected portion of text."""
        return self._slides.rewrite_selected(
            full_content, selected_text, instruction, selection_start, selection_end
        )

    def rewrite_layout(self, content: str) -> str:
        """Change slide layout."""
        return self._slides.rewrite_layout(content)

    def restyle_slide(self, content: str, style: str = "modern") -> str:
        """Restyle slide content."""
        return self._slides.restyle(content, style)

    def simplify_slide(self, content: str) -> str:
        """Simplify slide for clarity."""
        return self._slides.simplify(content)

    def expand_slide(self, content: str) -> str:
        """Expand slide with more detail."""
        return self._slides.expand(content)

    def split_slide(self, content: str) -> list[str]:
        """Split overloaded slide."""
        return self._slides.split(content)

    def apply_layout(self, content: str, layout_type: str) -> str:
        """Apply a specific layout to slide content."""
        return self._slides.apply_layout(content, layout_type)

    def duplicate_and_rewrite_slide(self, content: str, new_topic: str) -> str:
        """Duplicate slide and rewrite for a new topic."""
        return self._slides.duplicate_and_rewrite(content, new_topic)

    # -------------------------------------------------------------------------
    # Presentation Transformation
    # -------------------------------------------------------------------------

    def rearrange_slides(self, slides: list[str]) -> list[str]:
        """Rearrange slides for better cohesion."""
        return self._transformer.rearrange(slides)

    def transform_style(self, slides: list[str], style: str) -> list[str]:
        """Transform presentation to a specific style."""
        return self._transformer.transform_style(slides, style)

    def rewrite_for_topic(
        self, slides: list[str], new_topic: str, keep_style: bool = True
    ) -> list[str]:
        """Rewrite entire presentation for a new topic."""
        return self._transformer.rewrite_for_topic(slides, new_topic, keep_style)

    # -------------------------------------------------------------------------
    # Layout Information
    # -------------------------------------------------------------------------

    def get_layouts(self) -> dict:
        """Get available layout classes and callouts."""
        return get_all_layouts()

    # -------------------------------------------------------------------------
    # Image Generation
    # -------------------------------------------------------------------------

    def generate_image(
        self,
        prompt: str,
        size: str = "1024x1024",
        quality: str = "standard"
    ) -> Optional[str]:
        """Generate image using DALL-E."""
        return self._images.generate(prompt, size, quality)

    # -------------------------------------------------------------------------
    # Theme Generation
    # -------------------------------------------------------------------------

    def generate_theme_css(
        self,
        theme_name: str,
        brand_colors: list[str],
        description: str = ""
    ) -> Optional[str]:
        """Generate Marp theme CSS."""
        return self._themes.generate(theme_name, brand_colors, description)
