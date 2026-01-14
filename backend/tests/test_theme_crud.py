"""Tests for custom theme CRUD operations."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_sample_theme_data(name: str = "Test Theme"):
    """Get sample theme creation data."""
    return {
        "name": name,
        "description": "A test theme",
        "colors": {
            "background": "#ffffff",
            "text": "#000000",
            "h1": "#0000ff",
            "h2": "#0000cc",
            "h3": "#000099",
            "link": "#0000ff",
            "code_background": "#f5f5f5",
            "code_text": "#333333",
            "code_block_background": "#1e1e1e",
            "code_block_text": "#f5f5f5"
        },
        "typography": {
            "font_family": "Arial, sans-serif",
            "font_size": "28px",
            "h1_size": "48px",
            "h1_weight": "700",
            "h2_size": "36px",
            "h2_weight": "600",
            "h3_size": "28px",
            "h3_weight": "500",
            "code_font_family": "monospace"
        },
        "spacing": {
            "slide_padding": "60px",
            "h1_margin_bottom": "30px",
            "h2_margin_top": "20px",
            "code_padding": "2px 8px",
            "code_block_padding": "20px",
            "border_radius": "4px",
            "code_block_border_radius": "8px"
        }
    }

def test_list_themes_includes_builtin():
    """Test listing themes includes built-in themes."""
    response = client.get("/api/themes")
    assert response.status_code == 200
    themes = response.json()
    assert len(themes) >= 3
    builtin_names = {t["name"] for t in themes if t["is_builtin"]}
    assert "Default" in builtin_names
    assert "Corporate" in builtin_names
    assert "Academic" in builtin_names

def test_create_custom_theme():
    """Test creating a custom theme."""
    theme_data = get_sample_theme_data("Create Test")
    response = client.post("/api/themes", json=theme_data)
    assert response.status_code == 201
    theme = response.json()
    assert theme["name"] == "Create Test"
    assert theme["is_builtin"] is False
    assert "id" in theme
    assert theme["css_content"] is not None
    client.delete(f"/api/themes/{theme['id']}")

def test_get_theme_by_id():
    """Test retrieving a theme by ID."""
    theme_data = get_sample_theme_data("Get Test")
    create_response = client.post("/api/themes", json=theme_data)
    theme_id = create_response.json()["id"]

    response = client.get(f"/api/themes/{theme_id}")
    assert response.status_code == 200
    theme = response.json()
    assert theme["id"] == theme_id
    assert theme["name"] == "Get Test"

    client.delete(f"/api/themes/{theme_id}")

def test_get_builtin_theme():
    """Test retrieving a built-in theme."""
    response = client.get("/api/themes/default")
    assert response.status_code == 200
    theme = response.json()
    assert theme["id"] == "default"
    assert theme["is_builtin"] is True
    assert theme["css_content"] is not None

def test_update_custom_theme():
    """Test updating a custom theme."""
    theme_data = get_sample_theme_data("Update Test")
    create_response = client.post("/api/themes", json=theme_data)
    theme_id = create_response.json()["id"]

    update_data = {
        "name": "Updated Test",
        "description": "Updated description"
    }
    response = client.put(f"/api/themes/{theme_id}", json=update_data)
    assert response.status_code == 200
    theme = response.json()
    assert theme["name"] == "Updated Test"
    assert theme["description"] == "Updated description"

    client.delete(f"/api/themes/{theme_id}")

def test_delete_custom_theme():
    """Test deleting a custom theme."""
    theme_data = get_sample_theme_data("Delete Test")
    create_response = client.post("/api/themes", json=theme_data)
    theme_id = create_response.json()["id"]

    response = client.delete(f"/api/themes/{theme_id}")
    assert response.status_code == 204

    get_response = client.get(f"/api/themes/{theme_id}")
    assert get_response.status_code == 404

def test_get_theme_css():
    """Test retrieving theme CSS."""
    theme_data = get_sample_theme_data("CSS Test")
    create_response = client.post("/api/themes", json=theme_data)
    theme_id = create_response.json()["id"]

    response = client.get(f"/api/themes/{theme_id}/css")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/css; charset=utf-8"
    css = response.text
    assert "/* @theme" in css
    assert "background: #ffffff" in css

    client.delete(f"/api/themes/{theme_id}")

def test_export_theme():
    """Test exporting theme as CSS file."""
    theme_data = get_sample_theme_data("Export Test")
    create_response = client.post("/api/themes", json=theme_data)
    theme_id = create_response.json()["id"]

    response = client.get(f"/api/themes/{theme_id}/export")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/css; charset=utf-8"
    assert "attachment" in response.headers["content-disposition"]

    client.delete(f"/api/themes/{theme_id}")

def test_create_theme_with_duplicate_name():
    """Test creating theme with duplicate name fails."""
    import uuid
    unique_name = f"Duplicate Test {uuid.uuid4().hex[:8]}"
    theme_data = get_sample_theme_data(unique_name)
    create_response = client.post("/api/themes", json=theme_data)
    assert create_response.status_code == 201
    theme_id = create_response.json()["id"]

    duplicate_response = client.post("/api/themes", json=theme_data)
    assert duplicate_response.status_code == 409

    client.delete(f"/api/themes/{theme_id}")

def test_get_nonexistent_theme():
    """Test getting non-existent theme returns 404."""
    response = client.get("/api/themes/nonexistent-id")
    assert response.status_code == 404

def test_update_nonexistent_theme():
    """Test updating non-existent theme returns 404."""
    response = client.put("/api/themes/nonexistent-id", json={"name": "Test"})
    assert response.status_code == 404

def test_delete_nonexistent_theme():
    """Test deleting non-existent theme returns 404."""
    response = client.delete("/api/themes/nonexistent-id")
    assert response.status_code == 404

def test_theme_css_generation():
    """Test that CSS is properly generated from theme config."""
    theme_data = get_sample_theme_data("CSS Gen Test")
    response = client.post("/api/themes", json=theme_data)
    theme = response.json()

    css = theme["css_content"]
    assert "/* @theme CSS Gen Test */" in css
    assert "background: #ffffff" in css
    assert "color: #000000" in css
    assert "font-family: Arial, sans-serif" in css
    assert "font-size: 28px" in css

    client.delete(f"/api/themes/{theme['id']}")
