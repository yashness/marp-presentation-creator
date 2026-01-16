"""AI service for presentation generation using Anthropic Claude."""

import json
import os
import re
import httpx
from typing import Optional
from anthropic import Anthropic
from pydantic import BaseModel
from loguru import logger

from .comment_processor import CommentProcessor


# Pre-compiled regex patterns for performance
JSON_CODE_FENCE_PATTERN = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)
MARKDOWN_CODE_FENCE_PATTERN = re.compile(r"^```(?:markdown|md)?\s*([\s\S]*?)\s*```$", re.IGNORECASE)


class SlideOutline(BaseModel):
    """Outline for a single slide."""
    title: str
    content_points: list[str]
    notes: str = ""


class PresentationOutline(BaseModel):
    """Outline for entire presentation."""
    title: str
    slides: list[SlideOutline]
    narration_instructions: str | None = None
    comment_max_ratio: float | None = None


class AIService:
    """Service for AI-powered presentation generation."""

    def __init__(self):
        """Initialize AI service with Azure credentials."""
        self.azure_endpoint = os.getenv("AZURE_ENDPOINT")
        self.api_key = os.getenv("API_KEY") or os.getenv("AZURE_API_KEY")
        self.deployment = os.getenv("AZURE_DEPLOYMENT", "claude-haiku-4-5")
        self.image_deployment = os.getenv("AZURE_IMAGE_DEPLOYMENT", "dall-e-3")
        self.api_version = os.getenv("AZURE_API_VERSION", "2024-05-01-preview")
        self.anthropic_version = os.getenv("ANTHROPIC_VERSION", "2023-06-01")
        self.slide_batch_size = 4

        if not self.azure_endpoint or not self.api_key:
            logger.warning("Azure credentials not configured")
            self.client = None
        else:
            # Azure Anthropic requires the Azure resource endpoint + /anthropic,
            # the deployment name as the model, and api-version query parameter.
            base_url = self.azure_endpoint.rstrip("/")
            default_headers = {
                "api-key": self.api_key,
                "anthropic-version": self.anthropic_version,
            }
            http_client = httpx.Client(
                timeout=30.0,
                base_url=base_url,
                params={"api-version": self.api_version},
            )
            self.client = Anthropic(
                base_url=base_url,
                api_key=self.api_key,
                default_headers=default_headers,
                http_client=http_client,
            )

    def _call_ai(
        self,
        prompt: str,
        max_tokens: int = 4000,
        context: str = "AI request"
    ) -> Optional[str]:
        """Centralized AI client call with error handling."""
        if not self.client:
            logger.error(f"{context}: AI client not initialized")
            return None

        try:
            response = self.client.messages.create(
                model=self.deployment,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}]
            )

            if not response.content:
                logger.error(f"{context}: Empty response from AI")
                return None

            return response.content[0].text
        except Exception as e:
            logger.error(f"{context}: AI call failed - {e}")
            return None

    def _extract_outline_json(self, raw_content: str) -> Optional[dict]:
        """Attempt to parse outline JSON from model response."""
        if not raw_content:
            logger.error("Outline response was empty")
            return None

        cleaned = raw_content.strip()

        # Try raw_decode which can extract JSON from string with trailing text
        decoder = json.JSONDecoder()
        try:
            parsed, idx = decoder.raw_decode(cleaned)
            logger.debug(f"Successfully parsed JSON using raw_decode (consumed {idx} of {len(cleaned)} chars)")
            return parsed
        except json.JSONDecodeError as e:
            logger.debug(f"raw_decode failed: {e}")

        # Try to find JSON within code fences
        fenced = JSON_CODE_FENCE_PATTERN.search(cleaned)
        if fenced:
            try:
                parsed = json.loads(fenced.group(1))
                logger.debug("Successfully parsed JSON from code fence")
                return parsed
            except json.JSONDecodeError as e:
                logger.debug(f"Code fence JSON parsing failed: {e}")
                pass

        # Last resort: try the whole cleaned string
        try:
            parsed = json.loads(cleaned)
            logger.debug("Successfully parsed entire response as JSON")
            return parsed
        except json.JSONDecodeError as e:
            logger.error(f"All JSON parsing attempts failed")
            logger.error(f"Response length: {len(cleaned)} chars")
            logger.error(f"First 500 chars: {cleaned[:500]}")
            logger.error(f"Last 200 chars: {cleaned[-200:]}")
            return None

    @staticmethod
    def _strip_outer_code_fence(text: str) -> str:
        if not text:
            return text
        fenced = MARKDOWN_CODE_FENCE_PATTERN.match(text.strip())
        if fenced:
            return fenced.group(1).strip()
        return text.strip()

    @staticmethod
    def _strip_frontmatter(text: str) -> str:
        if not text:
            return text
        return re.sub(r"^---\s*[\s\S]*?---\s*", "", text.strip())

    def _sanitize_slide_markdown(self, text: str) -> str:
        cleaned = text or ""
        cleaned = self._strip_outer_code_fence(cleaned)
        cleaned = self._strip_frontmatter(cleaned)
        return cleaned.strip()

    def _sanitize_slide_comment(self, text: str) -> str:
        cleaned = text or ""
        fenced = re.search(r"```(?:markdown|md)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
        if fenced:
            cleaned = fenced.group(1)
        cleaned = self._strip_outer_code_fence(cleaned)
        # Remove NARRATION: prefix if present
        cleaned = re.sub(r"^(?:NARRATION|Narration):\s*", "", cleaned.strip(), flags=re.IGNORECASE)
        return cleaned.strip()

    @staticmethod
    def _fix_broken_comments(text: str) -> str:
        """Fix broken HTML comment blocks in slide content."""
        # Remove duplicate comment markers
        text = re.sub(r"<!--\s*<!--", "<!--", text)
        text = re.sub(r"-->\s*-->", "-->", text)
        # Fix unclosed comments
        if text.count("<!--") > text.count("-->"):
            text = text + "\n-->"
        # Remove malformed empty comment blocks
        text = re.sub(r"<!--\s*\n\s*-->", "", text)
        return text



    @staticmethod
    def _extract_heading(text: str) -> str:
        for line in text.splitlines():
            stripped = line.strip()
            if stripped.startswith("#"):
                return stripped.lstrip("#").strip()
        return ""

    @staticmethod
    def _extract_bullets(text: str) -> list[str]:
        bullets = []
        for line in text.splitlines():
            stripped = line.strip()
            if stripped.startswith("- ") or stripped.startswith("* "):
                bullets.append(stripped[2:].strip())
        return bullets


    def _build_constraint_block(
        self,
        slide_count: Optional[int],
        subtopic_count: Optional[int],
        audience: Optional[str],
        flavor: Optional[str],
        narration_instructions: Optional[str],
        comment_max_ratio: Optional[float]
    ) -> str:
        """Build constraint block for outline generation."""
        constraint_lines = []
        if slide_count:
            constraint_lines.append(f"- Desired slide count: {slide_count}")
        if subtopic_count:
            constraint_lines.append(f"- Desired subtopic count: {subtopic_count}")
        if audience:
            constraint_lines.append(f"- Target audience: {audience}")
        if flavor:
            constraint_lines.append(f"- Extra flavor/angle: {flavor}")
        if narration_instructions:
            constraint_lines.append(f"- Narration instructions: {narration_instructions}")
        if comment_max_ratio:
            constraint_lines.append(f"- Narration length target: <= {int(comment_max_ratio * 100)}% of slide text")
        return "\n".join(constraint_lines) if constraint_lines else "None provided."

    def _create_outline_prompt(self, description: str, constraint_block: str, slide_count_hint: str) -> str:
        """Create the prompt for outline generation."""
        return f"""You are an expert educator creating a presentation outline. Your goal is to create thorough narration that explains each slide's content in depth.

Topic: {description}

Optional constraints (honor if possible):
{constraint_block}

Generate a structured outline with:
1. A compelling presentation title
2. An INTRO slide (first slide) - title card with the presentation name and a hook
3. {slide_count_hint} for the main content
4. An OUTRO slide (last slide) - key takeaway or call to action

Respond in JSON format:
{{
    "title": "Presentation Title",
    "slides": [
        {{
            "title": "Slide Title",
            "content_points": ["Point 1", "Point 2", "Point 3"],
            "notes": "Thorough 3-4 sentence narration explaining this slide's content"
        }}
    ]
}}

NARRATION REQUIREMENTS (CRITICAL):
- 3-4 sentences per slide (50-80 words) - enough to thoroughly explain each bullet point
- Narration must EXPLAIN the slide's content in depth - elaborate on WHY and HOW
- Walk through each key point, providing context, examples, or implications
- NEVER use: "Let's", "Here's", "Let me", "We'll", "This slide", "Next", "Now"
- NEVER reference the presentation, slides, or visuals
- Write as if teaching someone who can see the slide - explain what the bullets MEAN
- First slide (intro): Set the context and explain why this topic matters
- Last slide (outro): Synthesize the key insights and provide a clear takeaway
- Keep it natural and conversational, like an expert explaining to a colleague

EXAMPLES:
❌ BAD: "Let's explore machine learning. We'll look at algorithms."
✅ GOOD: "Machine learning enables computers to identify patterns in data without explicit programming. Instead of writing rules manually, we feed the system examples and let it discover the underlying logic. This approach works particularly well for complex problems where the rules would be too numerous or subtle for humans to define."

❌ BAD: "Here's why this matters."
✅ GOOD: "Companies adopting ML report 40% faster decision-making because the system processes vast datasets in seconds. The accuracy improvements come from the algorithm's ability to detect subtle patterns that human analysts might miss, especially when dealing with thousands of variables."

Do not include markdown formatting, frontmatter, or code fences in your response."""

    def generate_outline(
        self,
        description: str,
        slide_count: Optional[int] = None,
        subtopic_count: Optional[int] = None,
        audience: Optional[str] = None,
        flavor: Optional[str] = None,
        narration_instructions: Optional[str] = None,
        comment_max_ratio: Optional[float] = None
    ) -> Optional[PresentationOutline]:
        """Generate presentation outline from description."""
        if not self.client:
            logger.error("AI client not initialized")
            return None

        try:
            constraint_block = self._build_constraint_block(
                slide_count, subtopic_count, audience, flavor,
                narration_instructions, comment_max_ratio
            )
            slide_count_hint = f"{slide_count} slides" if slide_count else "5-8 slides"
            prompt = self._create_outline_prompt(description, constraint_block, slide_count_hint)

            content = self._call_ai(prompt, max_tokens=4000, context="Generate outline")
            if not content:
                return None

            data = self._extract_outline_json(content)
            if not data:
                return None

            outline = PresentationOutline(**data)
            if narration_instructions:
                outline.narration_instructions = narration_instructions
            if comment_max_ratio:
                outline.comment_max_ratio = comment_max_ratio
            return outline

        except Exception as e:
            logger.error(f"Failed to generate outline: {e}")
            return None

    def generate_slide_content(
        self,
        slide_outline: SlideOutline,
        theme: str = "professional"
    ) -> str:
        """Generate markdown content for a single slide.

        Args:
            slide_outline: Outline for the slide
            theme: Presentation theme/style

        Returns:
            Markdown content for the slide
        """
        if not self.client:
            logger.error("AI client not initialized")
            return f"# {slide_outline.title}\n\n" + "\n".join(f"- {point}" for point in slide_outline.content_points)

        try:
            prompt = f"""Convert this slide outline into polished Marp markdown:

Title: {slide_outline.title}
Points: {', '.join(slide_outline.content_points)}
Theme: {theme}

Create engaging markdown with:
- Clear heading
- Bullet points or structured content
- Appropriate formatting (bold, italic, code blocks if needed)
- Keep it concise and visual

Return only the slide markdown content (no frontmatter, no code fences, no commentary).
Do not include slide separators (`---`)."""

            content = self._call_ai(prompt, max_tokens=500, context="Generate slide content")
            if not content:
                return f"# {slide_outline.title}\n\n" + "\n".join(f"- {point}" for point in slide_outline.content_points)

            return self._sanitize_slide_markdown(content)

        except Exception as e:
            logger.error(f"Failed to generate slide content: {e}")
            return f"# {slide_outline.title}\n\n" + "\n".join(f"- {point}" for point in slide_outline.content_points)

    def _create_fallback_slides(self, slides: list[SlideOutline]) -> str:
        """Create fallback slides when AI generation fails."""
        chunks = []
        for slide in slides:
            content = f"# {slide.title}\n\n" + "\n".join(f"- {point}" for point in slide.content_points)
            comment = self._sanitize_slide_comment(slide.notes or "")
            if comment:
                content += f"\n\n<!--\n{comment}\n-->"
            chunks.append(content)
        return "\n\n---\n\n".join(chunks)

    def _create_batch_prompt(
        self,
        slides: list[SlideOutline],
        theme: str,
        batch_index: int,
        batch_total: int,
        narration_instructions: Optional[str]
    ) -> str:
        """Create prompt for batch slide generation."""
        slide_lines = []
        for idx, slide in enumerate(slides, start=1):
            notes = slide.notes or ""
            slide_lines.append(
                f"Outline item {idx} title: {slide.title}\n"
                f"Outline item {idx} points: {', '.join(slide.content_points)}\n"
                f"Outline item {idx} notes: {notes}"
            )
        slide_block = "\n\n".join(slide_lines)
        narration_hint = narration_instructions or "Thorough, detailed explanations that walk through each concept."

        return f"""Create Marp markdown slides. Batch {batch_index}/{batch_total}.

Theme: {theme}

Content to cover:
{slide_block}

Additional style: {narration_hint}

FORMAT:
- Slides separated by `---`
- Each slide has a comment block: <!-- narration -->
- Use actual topic titles (never "# Slide 1")
- 3-5 bullets per slide, clean markdown
- Vary layouts: bullets, quotes, comparisons

COMMENT RULES (CRITICAL - READ CAREFULLY):
The comment is AUDIO NARRATION that will be spoken while the slide is shown.
The narration MUST directly reference and explain the EXACT content visible on the slide.

REQUIREMENTS:
1. Read each bullet point on the slide and explain it in the comment
2. If the slide says "1896: Cinema arrives in India" - the comment must explain that 1896 date
3. If the slide has a table with data - the comment must reference that specific data
4. Comments should flow from the previous slide's topic to this slide's topic
5. 2-3 sentences (40-60 words) - concise but substantive
6. NEVER use: "Let's", "Here's", "This slide", "Now we'll", "Next"

EXAMPLE (FOLLOW THIS PATTERN):
Slide content:
# The Water Cycle
- Evaporation: Sun heats water, creating vapor
- Condensation: Vapor rises, cools, forms clouds
- Precipitation: Rain/snow falls back to surface

Correct comment: <!-- The water cycle has three key phases. Evaporation occurs when solar energy heats surface water into vapor. That vapor rises and cools to form clouds through condensation. Finally, precipitation returns water to earth as rain or snow, completing the cycle. -->

Wrong comment: <!-- Let's explore water. Water is essential for life and moves through our environment. The cycle is fascinating. -->

The comment MUST explain the actual bullet points shown, not generic related information."""

    def generate_slide_batch(
        self,
        slides: list[SlideOutline],
        theme: str,
        batch_index: int,
        batch_total: int,
        narration_instructions: Optional[str]
    ) -> str:
        """Generate markdown for a batch of slides with per-slide comments."""
        if not self.client:
            return self._create_fallback_slides(slides)

        prompt = self._create_batch_prompt(
            slides, theme, batch_index, batch_total, narration_instructions
        )

        content = self._call_ai(prompt, max_tokens=2500, context=f"Generate batch {batch_index}/{batch_total}")
        if not content:
            return self._create_fallback_slides(slides)

        return self._sanitize_slide_markdown(content)

    def _create_intro_slide(self, title: str) -> str:
        """Create an intro/title slide with brief comment."""
        return f"""# {title}

<!-- {title} - a presentation exploring key concepts and insights. -->"""

    def _create_outro_slide(self, title: str) -> str:
        """Create an outro/closing slide with call to action."""
        return f"""# Thank You

**{title}**

Questions? Let's discuss.

<!-- The key ideas from this presentation should help guide your next steps. -->"""

    def generate_full_presentation(
        self,
        outline: PresentationOutline,
        theme: str = "professional"
    ) -> str:
        """Generate complete presentation markdown.

        Args:
            outline: Complete presentation outline
            theme: Presentation theme/style

        Returns:
            Full Marp markdown presentation
        """
        frontmatter = f"""---
marp: true
title: {outline.title}
theme: default
paginate: true
---

"""

        blocks = []

        # Add intro slide
        intro_slide = self._create_intro_slide(outline.title)
        blocks.append(intro_slide)

        total_batches = max(1, (len(outline.slides) + self.slide_batch_size - 1) // self.slide_batch_size)
        for batch_index in range(total_batches):
            start = batch_index * self.slide_batch_size
            end = start + self.slide_batch_size
            batch_slides = outline.slides[start:end]
            batch_md = self.generate_slide_batch(
                batch_slides,
                theme,
                batch_index + 1,
                total_batches,
                outline.narration_instructions
            )
            batch_md = self._sanitize_slide_markdown(batch_md)
            batch_md = self._fix_broken_comments(batch_md)
            batch_blocks = re.split(r"\n---\s*\n", batch_md) if batch_md else []
            for block in [b for b in batch_blocks if b.strip()]:
                blocks.append(block.strip())

        # Add outro slide
        outro_slide = self._create_outro_slide(outline.title)
        blocks.append(outro_slide)

        slides_content = []
        for idx, block in enumerate(blocks):
            # Extract narration comment from the AI-generated block
            comment_match = re.search(r"<!--\s*([\s\S]*?)\s*-->", block)
            comment = comment_match.group(1).strip() if comment_match else ""

            # Clean up NARRATION: prefix if present
            comment = re.sub(r"^(?:NARRATION|Narration):\s*", "", comment, flags=re.IGNORECASE)

            # Extract slide content (everything except the comment)
            block_body = re.sub(r"<!--\s*[\s\S]*?\s*-->", "", block).strip()

            # Clean up generic "# Slide X" headers
            block_body = re.sub(r"^#\s*Slide\s*\d+\s*\n+", "", block_body, flags=re.MULTILINE)

            heading = self._extract_heading(block_body)
            bullets = self._extract_bullets(block_body)
            focus = bullets[0] if bullets else ""
            prev_heading = self._extract_heading(blocks[idx - 1]) if idx > 0 else ""
            next_heading = self._extract_heading(blocks[idx + 1]) if idx + 1 < len(blocks) else ""

            if not comment:
                logger.warning(f"Slide {idx + 1} missing narration - adding fallback")
                comment = CommentProcessor.build_slide_narration(
                    heading=heading,
                    focus=focus,
                    index=idx,
                    total=len(blocks),
                    prev_heading=prev_heading,
                    next_heading=next_heading
                )

            fallback_comment = CommentProcessor.build_slide_narration(
                heading=heading,
                focus=focus,
                index=idx,
                total=len(blocks),
                prev_heading=prev_heading,
                next_heading=next_heading
            )
            comment = CommentProcessor.enforce_comment_length(
                comment,
                block_body,
                fallback_comment,
                outline.comment_max_ratio
            )

            block_with_comment = f"{block_body}\n\n<!--\n{comment}\n-->"
            slides_content.append(block_with_comment)

        return frontmatter + "\n\n---\n\n".join(slides_content)

    def rewrite_slide(self, current_content: str, instruction: str) -> str:
        """Rewrite a slide based on user instruction.

        Args:
            current_content: Current slide markdown
            instruction: How to modify the slide

        Returns:
            Rewritten slide markdown
        """
        if not self.client:
            logger.error("AI client not initialized")
            return current_content

        try:
            prompt = f"""Rewrite this slide based on the instruction:

Current content:
{current_content}

Instruction: {instruction}

Return only the updated markdown content, no extra text."""

            response = self.client.messages.create(
                model=self.deployment,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            return response.content[0].text.strip()

        except Exception as e:
            logger.error(f"Failed to rewrite slide: {e}")
            return current_content

    def regenerate_comment(
        self,
        slide_content: str,
        previous_comment: str | None = None,
        context_before: str | None = None,
        context_after: str | None = None,
        style: str = "professional"
    ) -> str:
        """Generate a comment that directly explains the slide content.

        Args:
            slide_content: The slide markdown to explain
            previous_comment: Current comment if any
            context_before: Previous slide content for flow
            context_after: Next slide content for flow
            style: Narration style

        Returns:
            Generated comment text
        """
        if not self.client:
            return previous_comment or "No comment available."

        context_hint = ""
        if context_before:
            context_hint += f"\nPrevious slide ended with: {context_before[-200:]}\n"
        if context_after:
            context_hint += f"\nNext slide starts with: {context_after[:200]}\n"

        prompt = f"""Generate narration for this slide that DIRECTLY explains what's shown.

SLIDE CONTENT:
{slide_content}
{context_hint}
Style: {style}

RULES:
1. Read each bullet point and explain it in 1-2 sentences
2. Total length: 2-3 sentences (40-60 words)
3. Reference the EXACT content - if it says "1896" mention 1896
4. NEVER say "Let's", "Here's", "This slide", "Now we'll"
5. Write as an expert explaining to a colleague
6. Flow naturally from previous slide's topic if context provided

Return ONLY the comment text, no HTML comment tags."""

        try:
            response = self.client.messages.create(
                model=self.deployment,
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text.strip()
        except Exception as e:
            logger.error(f"Failed to regenerate comment: {e}")
            return previous_comment or "No comment available."

    def regenerate_all_comments(
        self,
        slides: list[dict],
        style: str = "professional"
    ) -> list[str]:
        """Regenerate comments for all slides with context awareness.

        Args:
            slides: List of {"content": str, "comment": str} dicts
            style: Narration style

        Returns:
            List of new comments
        """
        new_comments = []
        for i, slide in enumerate(slides):
            context_before = slides[i - 1]["content"] if i > 0 else None
            context_after = slides[i + 1]["content"] if i < len(slides) - 1 else None
            new_comment = self.regenerate_comment(
                slide["content"],
                slide.get("comment"),
                context_before,
                context_after,
                style
            )
            new_comments.append(new_comment)
        return new_comments

    def generate_image(
        self,
        prompt: str,
        size: str = "1024x1024",
        quality: str = "standard"
    ) -> Optional[str]:
        """Generate image using DALL-E via Azure OpenAI.

        Args:
            prompt: Description of the image to generate
            size: Image dimensions (1024x1024, 1792x1024, 1024x1792)
            quality: Image quality (standard or hd)

        Returns:
            Base64 encoded image data or None if failed
        """
        if not self.azure_endpoint or not self.api_key:
            logger.error("Azure credentials not configured")
            return None

        try:
            azure_base = self.azure_endpoint.rstrip("/").removesuffix("/anthropic")
            image_url = f"{azure_base}/openai/deployments/{self.image_deployment}/images/generations"
            params = {"api-version": os.getenv("AZURE_IMAGE_API_VERSION", "2024-02-01")}

            headers = {
                "api-key": self.api_key,
                "Content-Type": "application/json"
            }

            payload = {
                "prompt": prompt,
                "size": size,
                "n": 1,
                "quality": quality,
                "response_format": "b64_json"
            }

            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    image_url,
                    headers=headers,
                    params=params,
                    json=payload
                )
                response.raise_for_status()

            data = response.json()
            if data.get("data") and len(data["data"]) > 0:
                return data["data"][0].get("b64_json")

            logger.error("No image data in response")
            return None

        except Exception as e:
            logger.error(f"Failed to generate image: {e}")
            return None

    def generate_theme_css(
        self,
        theme_name: str,
        brand_colors: list[str],
        description: str = ""
    ) -> Optional[str]:
        """Generate Marp theme CSS based on brand colors and description.

        Args:
            theme_name: Name for the theme
            brand_colors: List of hex color codes (primary, secondary, etc.)
            description: Additional context about brand style

        Returns:
            Generated CSS theme content
        """
        if not self.client:
            logger.error("AI client not initialized")
            return None

        try:
            color_info = "\n".join([f"Color {i+1}: {c}" for i, c in enumerate(brand_colors)])

            prompt = f"""Generate a professional Marp theme CSS file based on these brand colors:

{color_info}

Theme name: {theme_name}
{f'Style description: {description}' if description else ''}

Create a complete Marp theme with:
1. Section styling with color hierarchy
2. Typography (headings, body text, code)
3. Layout and spacing
4. Lists, blockquotes, tables
5. Color scheme that uses the provided colors tastefully

The CSS should follow Marp theme structure:
- Use :root for variables
- Style section elements
- Include h1-h6, p, ul, ol, code, pre, blockquote, table, etc.

Return ONLY the CSS code, no markdown formatting or explanations."""

            response = self.client.messages.create(
                model=self.deployment,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )

            css_content = response.content[0].text.strip()

            # Clean up markdown code blocks if present
            if css_content.startswith("```"):
                lines = css_content.split("\n")
                css_content = "\n".join(lines[1:-1]) if len(lines) > 2 else css_content

            return css_content

        except Exception as e:
            logger.error(f"Failed to generate theme: {e}")
            return None
