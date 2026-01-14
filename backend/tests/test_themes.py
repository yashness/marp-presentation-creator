from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_list_themes():
    response = client.get("/api/themes")
    assert response.status_code == 200
    themes = response.json()
    assert isinstance(themes, list)
    assert len(themes) >= 3  # At least 3 built-in themes

def test_theme_names():
    response = client.get("/api/themes")
    themes = response.json()
    theme_ids = [t["id"] for t in themes]
    assert "default" in theme_ids
    assert "corporate" in theme_ids
    assert "academic" in theme_ids

def test_get_theme():
    response = client.get("/api/themes/default")
    assert response.status_code == 200
    theme = response.json()
    assert theme["id"] == "default"
    assert theme["is_builtin"] is True
    assert len(theme["css_content"]) > 0

def test_get_nonexistent_theme():
    response = client.get("/api/themes/nonexistent")
    assert response.status_code == 404
