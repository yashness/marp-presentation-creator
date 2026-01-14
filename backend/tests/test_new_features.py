from fastapi.testclient import TestClient
from app.main import app
from app.schemas.batch import BatchExportRequest
from pathlib import Path
from unittest.mock import patch

client = TestClient(app)
EXPORTS_DIR = Path("data/exports")

def get_sample_markdown() -> str:
    return "---\nmarp: true\n---\n\n# Test\n\nContent"

def create_presentation(title: str, theme_id: str | None = None) -> dict:
    response = client.post("/api/presentations", json={
        "title": title,
        "content": get_sample_markdown(),
        "theme_id": theme_id
    })
    return response.json()

def test_search_presentations_by_title():
    create_presentation("Python Tutorial")
    create_presentation("JavaScript Guide")
    response = client.get("/api/presentations?query=Python")
    assert response.status_code == 200
    results = response.json()
    assert any(p["title"] == "Python Tutorial" for p in results)

def test_search_presentations_by_content():
    create_presentation("Test Title")
    response = client.get("/api/presentations?query=marp")
    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1

def test_filter_presentations_by_theme():
    create_presentation("Corporate Deck", "corporate")
    create_presentation("Default Deck", "default")
    response = client.get("/api/presentations?theme_id=corporate")
    assert response.status_code == 200

@patch('app.services.marp_service.render_to_pdf')
def test_batch_export_success(mock_render):
    pres1 = create_presentation("Pres 1")
    pres2 = create_presentation("Pres 2")
    request = {
        "presentation_ids": [pres1["id"], pres2["id"]],
        "format": "pdf"
    }
    response = client.post("/api/presentations/batch/export", json=request)
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 2
    assert all(r["status"] == "success" for r in results)

@patch('app.services.marp_service.render_to_pdf')
def test_batch_export_with_invalid_id(mock_render):
    pres1 = create_presentation("Valid Pres")
    request = {
        "presentation_ids": [pres1["id"], "nonexistent-id"],
        "format": "pdf"
    }
    response = client.post("/api/presentations/batch/export", json=request)
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 2
    success_count = sum(1 for r in results if r["status"] == "success")
    error_count = sum(1 for r in results if r["status"] == "error")
    assert success_count == 1
    assert error_count == 1

def test_render_cache():
    from app.services.marp_service import render_to_html
    from app.core.cache import render_cache
    render_cache.clear()
    content = get_sample_markdown()
    with patch('app.services.marp_service.run_marp_command') as mock_run:
        mock_run.return_value.stdout = "<html>test</html>"
        result1 = render_to_html(content, "default")
        result2 = render_to_html(content, "default")
        assert result1 == result2
        assert mock_run.call_count == 1

def test_cache_key_generation():
    from app.core.cache import generate_cache_key
    key1 = generate_cache_key("content1", "theme1")
    key2 = generate_cache_key("content1", "theme1")
    key3 = generate_cache_key("content2", "theme1")
    assert key1 == key2
    assert key1 != key3

@patch('app.services.marp_service.render_to_pdf')
def test_batch_export_with_exception(mock_render):
    mock_render.side_effect = Exception("Marp failed")
    pres1 = create_presentation("Test Pres")
    request = {
        "presentation_ids": [pres1["id"]],
        "format": "pdf"
    }
    response = client.post("/api/presentations/batch/export", json=request)
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["status"] == "error"
    assert "Marp failed" in results[0]["error"]
