"""Slide rewriting and transformation operations."""

from .client import AIClient
from .text_utils import sanitize_markdown, parse_slide_blocks
from .layout_guide import get_layout_prompt, LAYOUT_CLASSES


class SlideOperations:
    """Slide rewriting with viewport awareness."""

    MAX_BULLETS = 6
    MAX_CHARS = 80
    MAX_LINES = 12

    def __init__(self, client: AIClient):
        self.client = client

    def rewrite(self, content: str, instruction: str) -> str:
        """Rewrite slide with custom instruction."""
        if not self.client.is_available:
            return content

        prompt = self._create_rewrite_prompt(content, instruction)
        result = self.client.call(prompt, max_tokens=600, context="Rewrite slide")
        return sanitize_markdown(result) if result else content

    def apply_layout(self, content: str, layout_type: str) -> str:
        """Apply a specific layout class to slide content."""
        if not self.client.is_available:
            return content

        layout_info = LAYOUT_CLASSES.get(layout_type)
        if not layout_info:
            return self.rewrite_layout(content)

        prompt = f"""Reorganize this slide using the "{layout_type}" layout.

Current slide:
{content}

Target layout: {layout_info['name']} - {layout_info['description']}

Example HTML structure:
{layout_info['html']}

Instructions:
- Keep the same information and meaning
- Adapt content to fit the layout structure
- Use the HTML div structure shown above
- Keep markdown inside the divs
- Ensure content is balanced across columns/sections

{get_layout_prompt()}

VIEWPORT CONSTRAINTS:
- Max {self.MAX_BULLETS} bullets per section
- Max {self.MAX_CHARS} chars per bullet

Return markdown with HTML layout only, no code fences."""

        result = self.client.call(prompt, max_tokens=800, context=f"Apply {layout_type}")
        return sanitize_markdown(result) if result else content

    def rewrite_layout(self, content: str) -> str:
        """Change slide layout while keeping content."""
        if not self.client.is_available:
            return content

        prompt = f"""Reorganize this slide with a different layout structure.

Current slide:
{content}

{get_layout_prompt()}

Choose the most appropriate layout for this content and apply it.
Keep the same information but present it in a more visual way.

VIEWPORT CONSTRAINTS:
- Max {self.MAX_BULLETS} bullets per section
- Max {self.MAX_CHARS} chars per bullet

Return markdown with HTML layout only, no code fences."""

        result = self.client.call(prompt, max_tokens=800, context="Change layout")
        return sanitize_markdown(result) if result else content

    def restyle(self, content: str, style: str = "modern") -> str:
        """Restyle slide content with different tone."""
        instruction = f"Restyle to be more {style}. Keep core info but adjust tone."
        return self.rewrite(content, instruction)

    def simplify(self, content: str) -> str:
        """Simplify slide for clarity."""
        instruction = "Simplify: shorter phrases, remove details, make scannable."
        return self.rewrite(content, instruction)

    def expand(self, content: str) -> str:
        """Expand slide with more detail."""
        instruction = "Add more detail and examples while staying within viewport."
        return self.rewrite(content, instruction)

    def split(self, content: str) -> list[str]:
        """Split overloaded slide into multiple slides."""
        if not self.client.is_available:
            return [content]

        # Detect if slide contains diagram/layout HTML
        has_diagram = any(cls in content for cls in [
            'flow-horizontal', 'flow-vertical', 'hierarchy', 'cycle',
            'pyramid', 'stat-cards', 'timeline', 'columns-', 'feature-grid',
            'pros-cons', 'comparison'
        ])

        diagram_instruction = ""
        if has_diagram:
            diagram_instruction = """
IMPORTANT: This slide contains diagram/layout HTML elements.
- Keep the entire HTML diagram structure intact on ONE slide
- Do NOT split the HTML diagram itself
- Split OTHER content (text, bullets before/after) into separate slides
- If the slide is mostly diagram, create slides for context/explanation"""

        prompt = f"""This slide has too much content. Split into multiple slides.

Current:
{content}

Rules:
- Create 2-3 focused slides
- Max {self.MAX_BULLETS} bullets each
- Separate with ---
- Maintain logical flow
{diagram_instruction}

Return markdown only."""

        result = self.client.call(prompt, max_tokens=1200, context="Split slide")
        if not result:
            return [content]

        blocks = parse_slide_blocks(sanitize_markdown(result))
        return blocks if blocks else [content]

    def duplicate_and_rewrite(self, content: str, new_topic: str) -> str:
        """Duplicate slide and rewrite for a new topic."""
        if not self.client.is_available:
            return content

        prompt = f"""Rewrite this slide for a completely different topic while keeping the same structure and style.

Original slide:
{content}

New topic: {new_topic}

Instructions:
- Keep the exact same layout structure (HTML divs, lists, etc.)
- Keep the same number of bullet points
- Keep the same style/tone
- Replace all content with {new_topic} related content
- Maintain the visual organization

Return markdown only, no code fences."""

        result = self.client.call(prompt, max_tokens=800, context="Duplicate rewrite")
        return sanitize_markdown(result) if result else content

    def rewrite_selected(
        self,
        full_content: str,
        selected_text: str,
        instruction: str,
        selection_start: int,
        selection_end: int
    ) -> str:
        """Rewrite only the selected portion of text."""
        if not self.client.is_available:
            return selected_text

        prompt = f"""Rewrite ONLY the selected text based on the instruction.

Full slide context:
{full_content}

Selected text to rewrite:
"{selected_text}"

Instruction: {instruction}

Rules:
- Only rewrite the selected text
- Keep the same format (bullets, headers, etc.) if applicable
- Make the rewritten text fit naturally in the surrounding context
- Be concise and clear

Return ONLY the rewritten text, nothing else. No code fences or explanations."""

        result = self.client.call(prompt, max_tokens=300, context="Rewrite selection")
        return result.strip() if result else selected_text

    def _create_rewrite_prompt(self, content: str, instruction: str) -> str:
        """Create rewrite prompt with viewport constraints."""
        return f"""Rewrite this slide.

Current:
{content}

Instruction: {instruction}

VIEWPORT CONSTRAINTS:
- Max {self.MAX_BULLETS} bullets
- Max {self.MAX_CHARS} chars per bullet
- Max {self.MAX_LINES} lines total

Return markdown only, no code fences."""


class PresentationTransformer:
    """Transform entire presentations."""

    def __init__(self, client: AIClient):
        self.client = client

    def rearrange(self, slides: list[str]) -> list[str]:
        """Rearrange slides for better flow and cohesion."""
        if not self.client.is_available or len(slides) < 2:
            return slides

        slides_text = "\n\n---\n\n".join([
            f"[Slide {i+1}]\n{s}" for i, s in enumerate(slides)
        ])

        prompt = f"""Analyze these slides and suggest a better arrangement for cohesion.

Current slides:
{slides_text}

Instructions:
- Return the slide numbers in optimal order (e.g., "2, 1, 4, 3, 5")
- Group related topics together
- Ensure logical flow from intro to conclusion
- Keep intro (if exists) first and conclusion (if exists) last

Return ONLY the comma-separated list of slide numbers in new order."""

        result = self.client.call(prompt, max_tokens=100, context="Rearrange slides")
        if not result:
            return slides

        try:
            new_order = [int(n.strip()) - 1 for n in result.split(",")]
            if sorted(new_order) != list(range(len(slides))):
                return slides
            return [slides[i] for i in new_order]
        except (ValueError, IndexError):
            return slides

    def transform_style(self, slides: list[str], style: str) -> list[str]:
        """Transform presentation to a specific style."""
        if not self.client.is_available:
            return slides

        style_prompts = {
            "story": "Convert to storytelling format with narrative arc, characters, conflict, resolution.",
            "teaching": "Convert to educational style with learning objectives, explanations, examples, exercises.",
            "pitch": "Convert to pitch deck style - problem, solution, traction, team, ask.",
            "workshop": "Convert to workshop format with activities, discussions, hands-on exercises.",
            "technical": "Convert to technical documentation style with specs, diagrams, code examples.",
            "executive": "Convert to executive summary style - key insights, metrics, recommendations.",
        }

        style_instruction = style_prompts.get(style, f"Transform to {style} style.")
        transformed = []

        for slide in slides:
            prompt = f"""Transform this slide.

Current:
{slide}

Style: {style_instruction}

Keep core information but adapt presentation style.
Return markdown only, no code fences."""

            result = self.client.call(prompt, max_tokens=600, context=f"Transform {style}")
            transformed.append(sanitize_markdown(result) if result else slide)

        return transformed

    def rewrite_for_topic(
        self, slides: list[str], new_topic: str, keep_style: bool = True
    ) -> list[str]:
        """Rewrite entire presentation for a new topic."""
        if not self.client.is_available:
            return slides

        if keep_style:
            return self._rewrite_keeping_style(slides, new_topic)
        return self._rewrite_fresh(slides, new_topic)

    def _rewrite_keeping_style(self, slides: list[str], new_topic: str) -> list[str]:
        """Rewrite keeping the same structure and style."""
        rewritten = []
        for i, slide in enumerate(slides):
            prompt = f"""Rewrite this slide for a new topic while keeping exact structure.

Original slide:
{slide}

New topic: {new_topic}
Slide position: {i+1} of {len(slides)}

Instructions:
- Keep the exact same layout (columns, lists, boxes)
- Keep the same number of points/sections
- Keep the same tone and style
- Replace content with {new_topic} related content
- Maintain transitions if this isn't the first slide

Return markdown only, no code fences."""

            result = self.client.call(prompt, max_tokens=800, context=f"Rewrite slide {i+1}")
            rewritten.append(sanitize_markdown(result) if result else slide)

        return rewritten

    def _rewrite_fresh(self, slides: list[str], new_topic: str) -> list[str]:
        """Generate fresh content for new topic with similar slide count."""
        # This would use the outline generator for better results
        # For now, simple rewrite
        return self._rewrite_keeping_style(slides, new_topic)
