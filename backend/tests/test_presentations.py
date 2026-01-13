from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import patch
import json

client = TestClient(app)

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

def test_delete_presentation():
    pres = create_test_presentation()
    response = client.delete(f"/api/presentations/{pres['id']}")
    assert response.status_code == 200

    get_response = client.get(f"/api/presentations/{pres['id']}")
    assert get_response.status_code == 404

@patch('app.services.marp_service.render_to_html')
def test_preview_presentation(mock_render):
    mock_render.return_value = "<html><body>Test</body></html>"
    pres = create_test_presentation()
    response = client.get(f"/api/presentations/{pres['id']}/preview")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    mock_render.assert_called_once()
