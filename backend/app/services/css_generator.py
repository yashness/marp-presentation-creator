"""CSS generator service for custom themes."""

from app.schemas.theme import ColorConfig, TypographyConfig, SpacingConfig

def generate_theme_css(
    theme_name: str,
    colors: ColorConfig | dict,
    typography: TypographyConfig | dict,
    spacing: SpacingConfig | dict
) -> str:
    """Generate Marp theme CSS from configuration."""
    c = colors if isinstance(colors, dict) else colors.model_dump()
    t = typography if isinstance(typography, dict) else typography.model_dump()
    s = spacing if isinstance(spacing, dict) else spacing.model_dump()

    css_template = f"""/* @theme {theme_name} */

section {{
  background: {c['background']};
  color: {c['text']};
  font-family: {t['font_family']};
  font-size: {t['font_size']};
  padding: {s['slide_padding']};
}}

h1 {{
  color: {c['h1']};
  font-size: {t['h1_size']};
  font-weight: {t['h1_weight']};
  margin-bottom: {s['h1_margin_bottom']};
}}

h2 {{
  color: {c['h2']};
  font-size: {t['h2_size']};
  font-weight: {t['h2_weight']};
  margin-top: {s['h2_margin_top']};
}}

h3 {{
  color: {c['h3']};
  font-size: {t['h3_size']};
  font-weight: {t['h3_weight']};
}}

a {{
  color: {c['link']};
  text-decoration: none;
}}

a:hover {{
  text-decoration: underline;
}}

code {{
  background: {c['code_background']};
  color: {c['code_text']};
  padding: {s['code_padding']};
  border-radius: {s['border_radius']};
  font-family: {t['code_font_family']};
}}

pre {{
  background: {c['code_block_background']};
  color: {c['code_block_text']};
  padding: {s['code_block_padding']};
  border-radius: {s['code_block_border_radius']};
}}

pre code {{
  background: transparent;
  color: inherit;
  padding: 0;
}}
"""
    return css_template.strip()

def validate_css_output(css: str) -> bool:
    """Validate generated CSS has theme directive."""
    return css.strip().startswith("/* @theme")
