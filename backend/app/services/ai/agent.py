"""Claude Agent SDK v2 integration for agentic presentation workflows."""

import json
from typing import Iterator, Callable, Any
from loguru import logger

from .client import AIClient


# Agent tools for presentation operations
PRESENTATION_TOOLS = [
    {
        "name": "create_slide",
        "description": "Create a new slide with the given content in Marp markdown format",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "The slide title"
                },
                "content": {
                    "type": "string",
                    "description": "The slide content in Marp markdown"
                },
                "layout": {
                    "type": "string",
                    "description": "Optional layout class (e.g., 'two-column', 'centered')",
                    "enum": ["default", "two-column", "centered", "image-right", "image-left"]
                },
                "position": {
                    "type": "integer",
                    "description": "Position to insert the slide (0-indexed, -1 for end)"
                }
            },
            "required": ["title", "content"]
        }
    },
    {
        "name": "update_slide",
        "description": "Update an existing slide's content",
        "input_schema": {
            "type": "object",
            "properties": {
                "slide_index": {
                    "type": "integer",
                    "description": "Index of the slide to update (0-indexed)"
                },
                "title": {
                    "type": "string",
                    "description": "New slide title (optional)"
                },
                "content": {
                    "type": "string",
                    "description": "New slide content in Marp markdown"
                }
            },
            "required": ["slide_index", "content"]
        }
    },
    {
        "name": "delete_slide",
        "description": "Delete a slide at the given index",
        "input_schema": {
            "type": "object",
            "properties": {
                "slide_index": {
                    "type": "integer",
                    "description": "Index of the slide to delete (0-indexed)"
                }
            },
            "required": ["slide_index"]
        }
    },
    {
        "name": "reorder_slides",
        "description": "Reorder slides to a new arrangement",
        "input_schema": {
            "type": "object",
            "properties": {
                "new_order": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "description": "Array of slide indices in the new order"
                }
            },
            "required": ["new_order"]
        }
    },
    {
        "name": "apply_theme",
        "description": "Apply a theme to the presentation",
        "input_schema": {
            "type": "object",
            "properties": {
                "theme_id": {
                    "type": "string",
                    "description": "Theme ID to apply"
                }
            },
            "required": ["theme_id"]
        }
    },
    {
        "name": "generate_image",
        "description": "Generate an image for a slide using DALL-E",
        "input_schema": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Description of the image to generate"
                },
                "slide_index": {
                    "type": "integer",
                    "description": "Index of the slide to add the image to"
                }
            },
            "required": ["prompt", "slide_index"]
        }
    },
    {
        "name": "search_presentation",
        "description": "Search for content within the current presentation",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_presentation_info",
        "description": "Get information about the current presentation",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    }
]


class PresentationAgent:
    """Agentic workflow handler for presentation operations."""

    def __init__(self, tool_handlers: dict[str, Callable] | None = None):
        """Initialize the agent with optional custom tool handlers."""
        self.client = AIClient()
        self.tool_handlers = tool_handlers or {}
        self.conversation_history: list[dict] = []

    @property
    def is_available(self) -> bool:
        """Check if agent is available."""
        return self.client.is_available

    def _build_system_prompt(self, context: dict | None = None) -> str:
        """Build the system prompt for the agent."""
        base_prompt = """You are an intelligent presentation assistant with access to tools for creating and modifying presentations.

Your capabilities:
1. Create new slides with proper Marp markdown formatting
2. Update existing slides with improvements
3. Reorder slides for better flow
4. Apply themes for consistent styling
5. Generate images for visual enhancement
6. Search within presentations

Guidelines:
- Always use proper Marp markdown syntax
- Consider the overall narrative flow when making changes
- Use layouts appropriately for content type
- Keep slide content concise and impactful
- When creating slides, include speaker notes as HTML comments

Current presentation context is provided below."""

        if context:
            base_prompt += f"\n\nPresentation: {context.get('title', 'Untitled')}"
            base_prompt += f"\nTotal slides: {context.get('slide_count', 0)}"
            if context.get('current_slide'):
                base_prompt += f"\nCurrent slide index: {context.get('current_slide_index', 0)}"

        return base_prompt

    def _execute_tool(self, tool_name: str, tool_input: dict) -> dict:
        """Execute a tool and return the result."""
        handler = self.tool_handlers.get(tool_name)
        if not handler:
            return {"error": f"No handler for tool: {tool_name}"}

        try:
            result = handler(**tool_input)
            return {"success": True, "result": result}
        except Exception as e:
            logger.error(f"Tool execution error: {tool_name}: {e}")
            return {"error": str(e)}

    def run(
        self,
        user_message: str,
        context: dict | None = None,
        max_iterations: int = 10
    ) -> Iterator[dict]:
        """Run the agent with the given message.

        Yields events as the agent processes:
        - {"type": "thinking", "content": str}
        - {"type": "text", "content": str}
        - {"type": "tool_use", "name": str, "input": dict}
        - {"type": "tool_result", "name": str, "result": dict}
        - {"type": "done", "final_response": str}
        - {"type": "error", "message": str}
        """
        if not self.client.is_available:
            yield {"type": "error", "message": "AI service not available"}
            return

        system_prompt = self._build_system_prompt(context)

        # Add user message to history
        self.conversation_history.append({
            "role": "user",
            "content": user_message
        })

        messages = self.conversation_history.copy()
        iterations = 0

        while iterations < max_iterations:
            iterations += 1

            try:
                # Call Claude with tools
                response = self.client.client.messages.create(
                    model=self.client.deployment,
                    max_tokens=4000,
                    system=system_prompt,
                    tools=PRESENTATION_TOOLS,
                    messages=messages
                )

                # Process response content blocks
                assistant_content = []
                has_tool_use = False

                for block in response.content:
                    if block.type == "text":
                        yield {"type": "text", "content": block.text}
                        assistant_content.append({"type": "text", "text": block.text})

                    elif block.type == "tool_use":
                        has_tool_use = True
                        yield {
                            "type": "tool_use",
                            "id": block.id,
                            "name": block.name,
                            "input": block.input
                        }
                        assistant_content.append({
                            "type": "tool_use",
                            "id": block.id,
                            "name": block.name,
                            "input": block.input
                        })

                # Add assistant response to messages
                messages.append({"role": "assistant", "content": assistant_content})

                # If there were tool uses, execute them and continue
                if has_tool_use:
                    tool_results = []
                    for block in response.content:
                        if block.type == "tool_use":
                            result = self._execute_tool(block.name, block.input)
                            yield {
                                "type": "tool_result",
                                "id": block.id,
                                "name": block.name,
                                "result": result
                            }
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": json.dumps(result)
                            })

                    # Add tool results to messages
                    messages.append({"role": "user", "content": tool_results})
                    continue

                # No more tool uses, we're done
                final_text = ""
                for block in response.content:
                    if block.type == "text":
                        final_text += block.text

                # Update conversation history with final response
                self.conversation_history.append({
                    "role": "assistant",
                    "content": final_text
                })

                yield {"type": "done", "final_response": final_text}
                return

            except Exception as e:
                logger.error(f"Agent error: {e}")
                yield {"type": "error", "message": str(e)}
                return

        yield {"type": "error", "message": "Max iterations reached"}

    def clear_history(self):
        """Clear conversation history."""
        self.conversation_history = []


def create_agent_tool_handlers(
    presentation_id: str,
    get_presentation: Callable,
    update_presentation: Callable,
    generate_image_fn: Callable | None = None
) -> dict[str, Callable]:
    """Create tool handlers for a specific presentation.

    Args:
        presentation_id: ID of the presentation to operate on
        get_presentation: Function to get presentation data
        update_presentation: Function to update presentation
        generate_image_fn: Optional function to generate images

    Returns:
        Dictionary of tool name to handler function
    """

    def parse_slides(content: str) -> list[str]:
        """Parse presentation content into slides."""
        # Split by slide separator
        parts = content.split('\n---\n')
        slides = []
        for i, part in enumerate(parts):
            if i == 0:
                # First part may contain frontmatter
                if '---' in part:
                    _, slide_content = part.split('---', 1)
                    if slide_content.strip():
                        slides.append(slide_content.strip())
                else:
                    slides.append(part.strip())
            else:
                slides.append(part.strip())
        return [s for s in slides if s]

    def join_slides(slides: list[str], frontmatter: str = "") -> str:
        """Join slides back into presentation content."""
        if frontmatter:
            return frontmatter + '\n\n---\n\n' + '\n\n---\n\n'.join(slides)
        return '\n\n---\n\n'.join(slides)

    def extract_frontmatter(content: str) -> str:
        """Extract frontmatter from presentation content."""
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                return '---' + parts[1] + '---'
        return ""

    def create_slide(title: str, content: str, layout: str = "default", position: int = -1) -> dict:
        pres = get_presentation(presentation_id)
        if not pres:
            return {"error": "Presentation not found"}

        slides = parse_slides(pres.content)
        frontmatter = extract_frontmatter(pres.content)

        # Create slide markdown
        slide_md = f"# {title}\n\n{content}"
        if layout != "default":
            slide_md = f"<!-- class: {layout} -->\n{slide_md}"

        # Insert at position
        if position < 0 or position >= len(slides):
            slides.append(slide_md)
        else:
            slides.insert(position, slide_md)

        new_content = join_slides(slides, frontmatter)
        update_presentation(presentation_id, {"content": new_content})

        return {"slide_index": len(slides) - 1 if position < 0 else position}

    def update_slide(slide_index: int, content: str, title: str | None = None) -> dict:
        pres = get_presentation(presentation_id)
        if not pres:
            return {"error": "Presentation not found"}

        slides = parse_slides(pres.content)
        frontmatter = extract_frontmatter(pres.content)

        if slide_index < 0 or slide_index >= len(slides):
            return {"error": f"Invalid slide index: {slide_index}"}

        # Update slide content
        if title:
            slides[slide_index] = f"# {title}\n\n{content}"
        else:
            slides[slide_index] = content

        new_content = join_slides(slides, frontmatter)
        update_presentation(presentation_id, {"content": new_content})

        return {"updated": True, "slide_index": slide_index}

    def delete_slide(slide_index: int) -> dict:
        pres = get_presentation(presentation_id)
        if not pres:
            return {"error": "Presentation not found"}

        slides = parse_slides(pres.content)
        frontmatter = extract_frontmatter(pres.content)

        if slide_index < 0 or slide_index >= len(slides):
            return {"error": f"Invalid slide index: {slide_index}"}

        slides.pop(slide_index)
        new_content = join_slides(slides, frontmatter)
        update_presentation(presentation_id, {"content": new_content})

        return {"deleted": True, "remaining_slides": len(slides)}

    def reorder_slides(new_order: list[int]) -> dict:
        pres = get_presentation(presentation_id)
        if not pres:
            return {"error": "Presentation not found"}

        slides = parse_slides(pres.content)
        frontmatter = extract_frontmatter(pres.content)

        if len(new_order) != len(slides):
            return {"error": "New order must contain all slide indices"}

        try:
            reordered = [slides[i] for i in new_order]
        except IndexError:
            return {"error": "Invalid slide index in new order"}

        new_content = join_slides(reordered, frontmatter)
        update_presentation(presentation_id, {"content": new_content})

        return {"reordered": True, "new_order": new_order}

    def apply_theme(theme_id: str) -> dict:
        update_presentation(presentation_id, {"theme_id": theme_id})
        return {"applied": True, "theme_id": theme_id}

    def generate_image(prompt: str, slide_index: int) -> dict:
        if not generate_image_fn:
            return {"error": "Image generation not available"}

        try:
            image_data = generate_image_fn(prompt)
            # In a real implementation, save the image and return URL
            return {"generated": True, "slide_index": slide_index}
        except Exception as e:
            return {"error": str(e)}

    def search_presentation(query: str) -> dict:
        pres = get_presentation(presentation_id)
        if not pres:
            return {"error": "Presentation not found"}

        slides = parse_slides(pres.content)
        results = []

        query_lower = query.lower()
        for i, slide in enumerate(slides):
            if query_lower in slide.lower():
                results.append({
                    "slide_index": i,
                    "preview": slide[:200] + "..." if len(slide) > 200 else slide
                })

        return {"matches": results, "count": len(results)}

    def get_presentation_info() -> dict:
        pres = get_presentation(presentation_id)
        if not pres:
            return {"error": "Presentation not found"}

        slides = parse_slides(pres.content)

        return {
            "id": pres.id,
            "title": pres.title,
            "theme_id": pres.theme_id,
            "slide_count": len(slides),
            "slides": [
                {"index": i, "preview": s[:100] + "..." if len(s) > 100 else s}
                for i, s in enumerate(slides)
            ]
        }

    return {
        "create_slide": create_slide,
        "update_slide": update_slide,
        "delete_slide": delete_slide,
        "reorder_slides": reorder_slides,
        "apply_theme": apply_theme,
        "generate_image": generate_image,
        "search_presentation": search_presentation,
        "get_presentation_info": get_presentation_info
    }
