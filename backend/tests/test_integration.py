"""Integration tests for end-to-end workflows."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_preview_export_workflow():
    """Test complete workflow: create, preview, export."""
    create_data = {
        "title": "Integration Test",
        "content": "---\nmarp: true\n---\n\n# Test Slide\n\nContent here"
    }
    create_response = client.post("/api/presentations", json=create_data)
    assert create_response.status_code == 200
    pres_id = create_response.json()["id"]

    preview_response = client.get(f"/api/presentations/{pres_id}/preview")
    assert preview_response.status_code == 200
    assert "text/html" in preview_response.headers["content-type"]

    export_response = client.post(f"/api/presentations/{pres_id}/export?format=pdf")
    assert export_response.status_code == 200
    assert export_response.headers["content-type"] == "application/pdf"

    delete_response = client.delete(f"/api/presentations/{pres_id}")
    assert delete_response.status_code == 200

def test_create_update_retrieve_workflow():
    """Test workflow: create, update, retrieve."""
    create_data = {"title": "Original", "content": "# Original Content"}
    create_response = client.post("/api/presentations", json=create_data)
    assert create_response.status_code == 200
    pres_id = create_response.json()["id"]

    update_data = {"title": "Updated", "content": "# Updated Content"}
    update_response = client.put(f"/api/presentations/{pres_id}", json=update_data)
    assert update_response.status_code == 200
    assert update_response.json()["title"] == "Updated"

    get_response = client.get(f"/api/presentations/{pres_id}")
    assert get_response.status_code == 200
    assert get_response.json()["title"] == "Updated"
    assert get_response.json()["content"] == "# Updated Content"

    client.delete(f"/api/presentations/{pres_id}")

def test_search_and_filter_workflow():
    """Test workflow: create multiple, search, filter."""
    pres1 = client.post("/api/presentations", json={
        "title": "Python Tutorial", "content": "# Python Basics", "theme_id": "academic"
    }).json()
    pres2 = client.post("/api/presentations", json={
        "title": "Business Report", "content": "# Q4 Results", "theme_id": "corporate"
    }).json()

    search_response = client.get("/api/presentations?query=python")
    assert search_response.status_code == 200
    results = search_response.json()
    assert len(results) >= 1
    assert any(p["id"] == pres1["id"] for p in results)

    filter_response = client.get("/api/presentations?theme_id=corporate")
    assert filter_response.status_code == 200
    results = filter_response.json()
    assert any(p["id"] == pres2["id"] for p in results)

    client.delete(f"/api/presentations/{pres1['id']}")
    client.delete(f"/api/presentations/{pres2['id']}")

def test_batch_export_workflow():
    """Test batch export workflow."""
    pres1 = client.post("/api/presentations", json={
        "title": "Presentation 1", "content": "# Slide 1"
    }).json()
    pres2 = client.post("/api/presentations", json={
        "title": "Presentation 2", "content": "# Slide 2"
    }).json()

    batch_data = {
        "presentation_ids": [pres1["id"], pres2["id"]],
        "format": "html"
    }
    batch_response = client.post("/api/presentations/batch/export", json=batch_data)
    assert batch_response.status_code == 200
    results = batch_response.json()
    assert len(results) == 2
    assert all(r["status"] == "success" for r in results)

    client.delete(f"/api/presentations/{pres1['id']}")
    client.delete(f"/api/presentations/{pres2['id']}")

def test_theme_integration():
    """Test theme integration across operations."""
    themes_response = client.get("/api/themes")
    assert themes_response.status_code == 200
    themes = themes_response.json()
    assert len(themes) >= 3

    theme_id = themes[0]["id"]
    pres = client.post("/api/presentations", json={
        "title": "Themed Presentation",
        "content": "# Themed Slide",
        "theme_id": theme_id
    }).json()

    preview_response = client.get(f"/api/presentations/{pres['id']}/preview")
    assert preview_response.status_code == 200

    client.delete(f"/api/presentations/{pres['id']}")

def test_error_recovery_workflow():
    """Test error handling and recovery."""
    invalid_id = "nonexistent-id"
    get_response = client.get(f"/api/presentations/{invalid_id}")
    assert get_response.status_code == 404

    export_response = client.post(f"/api/presentations/{invalid_id}/export")
    assert export_response.status_code == 404

    invalid_format_response = client.post("/api/presentations/batch/export", json={
        "presentation_ids": ["test-id"],
        "format": "invalid"
    })
    assert invalid_format_response.status_code == 400
