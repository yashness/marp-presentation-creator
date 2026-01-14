from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import patch
from pathlib import Path
import json

client = TestClient(app)
EXPORTS_DIR = Path("data/exports")
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

def get_sample_markdown() -> str:
    return "---\nmarp: true\n---\n\n# Test Slide\n\nContent here"

def create_test_presentation() -> dict:
    response = client.post("/api/presentations", json={
        "title": "Test Presentation",
        "content": get_sample_markdown()
    })
    return response.json()

def test_create_presentation():
    response = client.post("/api/presentations", json={
        "title": "New Presentation",
        "content": get_sample_markdown()
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "New Presentation"
    assert "id" in data

def test_create_presentation_validation():
    response = client.post("/api/presentations", json={
        "title": "",
        "content": get_sample_markdown()
    })
    assert response.status_code == 422

def test_create_presentation_empty_content():
    response = client.post("/api/presentations", json={
        "title": "Test",
        "content": ""
    })
    assert response.status_code == 422

def test_create_presentation_whitespace_content():
    response = client.post("/api/presentations", json={
        "title": "Test",
        "content": "   \n   \t   "
    })
    assert response.status_code == 422

def test_list_presentations():
    create_test_presentation()
    response = client.get("/api/presentations")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_presentation():
    pres = create_test_presentation()
    response = client.get(f"/api/presentations/{pres['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == pres["id"]

def test_get_nonexistent_presentation():
    response = client.get("/api/presentations/nonexistent-id")
    assert response.status_code == 404

def test_update_presentation():
    pres = create_test_presentation()
    response = client.put(f"/api/presentations/{pres['id']}", json={
        "title": "Updated Title"
    })
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title"

def test_update_presentation_with_theme():
    pres = create_test_presentation()
    response = client.put(f"/api/presentations/{pres['id']}", json={
        "theme_id": "corporate"
    })
    assert response.status_code == 200
    assert response.json()["theme_id"] == "corporate"

def test_update_presentation_with_content():
    pres = create_test_presentation()
    new_content = "---\nmarp: true\n---\n\n# Updated Content"
    response = client.put(f"/api/presentations/{pres['id']}", json={
        "content": new_content
    })
    assert response.status_code == 200
    assert response.json()["content"] == new_content

def test_duplicate_presentation():
    pres = create_test_presentation()
    response = client.post(f"/api/presentations/{pres['id']}/duplicate")
    assert response.status_code == 201
    dup = response.json()
    assert dup["id"] != pres["id"]
    assert dup["content"] == pres["content"]
    assert dup["title"].endswith("(Copy)")

def test_delete_presentation():
    pres = create_test_presentation()
    response = client.delete(f"/api/presentations/{pres['id']}")
    assert response.status_code == 200

    get_response = client.get(f"/api/presentations/{pres['id']}")
    assert get_response.status_code == 404

def test_update_nonexistent_presentation():
    response = client.put("/api/presentations/nonexistent-id", json={
        "title": "Updated Title"
    })
    assert response.status_code == 404

def test_delete_nonexistent_presentation():
    response = client.delete("/api/presentations/nonexistent-id")
    assert response.status_code == 404

@patch('app.services.marp_service.render_to_html')
def test_preview_presentation(mock_render):
    mock_render.return_value = "<html><body>Test</body></html>"
    pres = create_test_presentation()
    response = client.get(f"/api/presentations/{pres['id']}/preview")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    mock_render.assert_called_once()

def test_preview_nonexistent_presentation():
    response = client.get("/api/presentations/nonexistent-id/preview")
    assert response.status_code == 404

@patch('app.services.marp_service.render_to_html')
def test_preview_error(mock_render):
    mock_render.side_effect = Exception("Render failed")
    pres = create_test_presentation()
    response = client.get(f"/api/presentations/{pres['id']}/preview")
    assert response.status_code == 500

@patch('app.services.marp_service.render_export')
def test_export_pdf(mock_render):
    pres = create_test_presentation()
    export_path = EXPORTS_DIR / f"{pres['id']}.pdf"
    export_path.write_bytes(b"PDF content")
    response = client.post(f"/api/presentations/{pres['id']}/export?format=pdf")
    assert response.status_code == 200
    assert "application/pdf" in response.headers["content-type"]
    export_path.unlink(missing_ok=True)

@patch('app.services.marp_service.render_export')
def test_export_html(mock_render):
    pres = create_test_presentation()
    export_path = EXPORTS_DIR / f"{pres['id']}.html"
    export_path.write_text("<html></html>")
    response = client.post(f"/api/presentations/{pres['id']}/export?format=html")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    export_path.unlink(missing_ok=True)

@patch('app.services.marp_service.render_export')
def test_export_pptx(mock_render):
    pres = create_test_presentation()
    export_path = EXPORTS_DIR / f"{pres['id']}.pptx"
    export_path.write_bytes(b"PPTX content")
    response = client.post(f"/api/presentations/{pres['id']}/export?format=pptx")
    assert response.status_code == 200
    assert "presentationml" in response.headers["content-type"]
    export_path.unlink(missing_ok=True)

def test_export_invalid_format():
    pres = create_test_presentation()
    response = client.post(f"/api/presentations/{pres['id']}/export?format=invalid")
    assert response.status_code == 400

def test_export_nonexistent_presentation():
    response = client.post("/api/presentations/nonexistent-id/export?format=pdf")
    assert response.status_code == 404

@patch('app.services.marp_service.render_export')
def test_export_error(mock_render):
    mock_render.side_effect = Exception("Export failed")
    pres = create_test_presentation()
    response = client.post(f"/api/presentations/{pres['id']}/export?format=pdf")
    assert response.status_code == 500
