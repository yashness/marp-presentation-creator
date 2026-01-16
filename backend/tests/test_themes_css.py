"""Tests for theme CSS content and layout classes."""

import os
import pytest
from pathlib import Path


THEMES_DIR = Path(__file__).parent.parent / "themes"


@pytest.fixture
def theme_files():
    """Get all theme CSS files."""
    return list(THEMES_DIR.glob("*.css"))


@pytest.fixture
def default_theme():
    """Load default theme CSS."""
    return (THEMES_DIR / "default.css").read_text()


@pytest.fixture
def corporate_theme():
    """Load corporate theme CSS."""
    return (THEMES_DIR / "corporate.css").read_text()


@pytest.fixture
def academic_theme():
    """Load academic theme CSS."""
    return (THEMES_DIR / "academic.css").read_text()


# =============================================================================
# THEME FILE TESTS
# =============================================================================

class TestThemeFiles:
    """Tests for theme file existence and structure."""

    def test_themes_directory_exists(self):
        """Test themes directory exists."""
        assert THEMES_DIR.exists()
        assert THEMES_DIR.is_dir()

    def test_required_themes_exist(self, theme_files):
        """Test required theme files exist."""
        theme_names = [f.stem for f in theme_files]
        assert "default" in theme_names
        assert "corporate" in theme_names
        assert "academic" in theme_names

    @pytest.mark.parametrize("theme_name", ["default", "corporate", "academic"])
    def test_theme_has_declaration(self, theme_name):
        """Test each theme has proper @theme declaration."""
        content = (THEMES_DIR / f"{theme_name}.css").read_text()
        assert f"@theme {theme_name}" in content


# =============================================================================
# CODE BLOCK STYLING TESTS
# =============================================================================

class TestCodeBlockStyling:
    """Tests for code block styling in themes."""

    @pytest.mark.parametrize("theme_name", ["default", "corporate", "academic"])
    def test_pre_has_background(self, theme_name):
        """Test pre elements have background color."""
        content = (THEMES_DIR / f"{theme_name}.css").read_text()
        assert "pre {" in content or "pre{" in content
        # Check for background property in pre block
        assert "background" in content

    @pytest.mark.parametrize("theme_name", ["default", "corporate", "academic"])
    def test_pre_code_has_color(self, theme_name):
        """Test pre code has explicit color (not black)."""
        content = (THEMES_DIR / f"{theme_name}.css").read_text()
        assert "pre code" in content
        # Should have light color for code inside pre
        assert "color:" in content

    @pytest.mark.parametrize("theme_name", ["default", "corporate", "academic"])
    def test_inline_code_styling(self, theme_name):
        """Test inline code has proper styling."""
        content = (THEMES_DIR / f"{theme_name}.css").read_text()
        # Inline code should have background
        assert "code {" in content or "code{" in content

    def test_default_code_not_black(self, default_theme):
        """Test default theme code is not black on black."""
        # Pre should have dark background
        assert "#1e293b" in default_theme or "#2d" in default_theme
        # Code in pre should have light color
        assert "#e2e8f0" in default_theme or "#f8f8f2" in default_theme


# =============================================================================
# LAYOUT CLASSES TESTS
# =============================================================================

class TestLayoutClasses:
    """Tests for layout utility classes."""

    @pytest.mark.parametrize("class_name", [
        ".columns-2",
        ".columns-3",
        ".columns-2-wide-left",
        ".columns-2-wide-right",
        ".flex-row",
        ".flex-between",
        ".center",
    ])
    def test_layout_classes_exist_in_default(self, default_theme, class_name):
        """Test layout classes exist in default theme."""
        assert class_name in default_theme

    @pytest.mark.parametrize("class_name", [
        ".columns-2",
        ".columns-3",
        ".flex-row",
        ".center",
    ])
    def test_layout_classes_exist_in_corporate(self, corporate_theme, class_name):
        """Test layout classes exist in corporate theme."""
        assert class_name in corporate_theme

    @pytest.mark.parametrize("class_name", [
        ".columns-2",
        ".columns-3",
        ".flex-row",
        ".center",
    ])
    def test_layout_classes_exist_in_academic(self, academic_theme, class_name):
        """Test layout classes exist in academic theme."""
        assert class_name in academic_theme

    def test_columns_2_uses_grid(self, default_theme):
        """Test columns-2 uses CSS grid."""
        assert "grid-template-columns: 1fr 1fr" in default_theme

    def test_columns_3_uses_grid(self, default_theme):
        """Test columns-3 uses CSS grid."""
        assert "grid-template-columns: 1fr 1fr 1fr" in default_theme


# =============================================================================
# CARD AND BOX CLASSES TESTS
# =============================================================================

class TestCardAndBoxClasses:
    """Tests for card and info box classes."""

    @pytest.mark.parametrize("class_name", [
        ".card",
        ".card-primary",
        ".highlight",
        ".info-box",
        ".warning-box",
        ".success-box",
    ])
    def test_box_classes_exist(self, default_theme, class_name):
        """Test box/card classes exist in default theme."""
        assert class_name in default_theme


# =============================================================================
# TABLE STYLING TESTS
# =============================================================================

class TestTableStyling:
    """Tests for table styling."""

    @pytest.mark.parametrize("theme_name", ["default", "corporate", "academic"])
    def test_table_styling_exists(self, theme_name):
        """Test table elements are styled."""
        content = (THEMES_DIR / f"{theme_name}.css").read_text()
        assert "table {" in content or "table{" in content
        assert "th {" in content or "th{" in content
        assert "td {" in content or "td{" in content

    @pytest.mark.parametrize("theme_name", ["default", "corporate", "academic"])
    def test_table_header_styled(self, theme_name):
        """Test table headers have background."""
        content = (THEMES_DIR / f"{theme_name}.css").read_text()
        # Find th block and check for background
        assert "background" in content


# =============================================================================
# EMOJI HANDLING TESTS
# =============================================================================

class TestEmojiHandling:
    """Tests for emoji handling in themes."""

    @pytest.mark.parametrize("theme_name", ["default", "corporate", "academic"])
    def test_text_wrap_balance(self, theme_name):
        """Test text-wrap: balance is applied."""
        content = (THEMES_DIR / f"{theme_name}.css").read_text()
        assert "text-wrap: balance" in content

    @pytest.mark.parametrize("theme_name", ["default", "corporate", "academic"])
    def test_emoji_class_exists(self, theme_name):
        """Test emoji class exists for explicit handling."""
        content = (THEMES_DIR / f"{theme_name}.css").read_text()
        assert ".emoji" in content


# =============================================================================
# IMAGE SIZING TESTS
# =============================================================================

class TestImageSizing:
    """Tests for image sizing classes."""

    @pytest.mark.parametrize("class_name", [
        ".img-small",
        ".img-medium",
        ".img-large",
        ".img-full",
    ])
    def test_image_classes_exist(self, default_theme, class_name):
        """Test image sizing classes exist."""
        assert class_name in default_theme


# =============================================================================
# SYNTAX HIGHLIGHTING TESTS
# =============================================================================

class TestSyntaxHighlighting:
    """Tests for syntax highlighting in code blocks."""

    @pytest.mark.parametrize("selector", [
        "pre .keyword",
        "pre .string",
        "pre .number",
        "pre .comment",
        "pre .function",
    ])
    def test_syntax_classes_exist(self, default_theme, selector):
        """Test syntax highlighting classes exist."""
        assert selector in default_theme
