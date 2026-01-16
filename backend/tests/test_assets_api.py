"""API integration tests for asset management endpoints."""

import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_asset_service():
    """Mock the asset service for API tests."""
    with patch('app.api.routes.assets.asset_service') as mock:
        yield mock


class TestAssetUploadEndpoint:
    """Tests for POST /api/assets endpoint."""

    def test_upload_asset_success(self, client, mock_asset_service):
        """Test successful asset upload."""
        mock_asset = MagicMock()
        mock_asset.id = "test-asset-id"
        mock_asset.filename = "test_abc123.png"
        mock_asset.original_filename = "test.png"
        mock_asset.content_type = "image/png"
        mock_asset.size_bytes = 1024
        mock_asset.url = "/api/assets/test-asset-id"
        mock_asset.created_at = "2024-01-01T00:00:00"

        mock_asset_service.save_asset.return_value = mock_asset

        # Create a test file
        test_file = io.BytesIO(b"fake image data")

        response = client.post(
            "/api/assets",
            files={"file": ("test.png", test_file, "image/png")}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "test-asset-id"
        assert data["original_filename"] == "test.png"

    def test_upload_asset_failure(self, client, mock_asset_service):
        """Test upload failure handling."""
        mock_asset_service.save_asset.return_value = None

        test_file = io.BytesIO(b"fake data")

        response = client.post(
            "/api/assets",
            files={"file": ("test.png", test_file, "image/png")}
        )

        assert response.status_code == 400

    def test_upload_asset_exception(self, client, mock_asset_service):
        """Test exception handling during upload."""
        mock_asset_service.save_asset.side_effect = Exception("Storage error")

        test_file = io.BytesIO(b"fake data")

        response = client.post(
            "/api/assets",
            files={"file": ("test.png", test_file, "image/png")}
        )

        assert response.status_code == 500
        assert "Storage error" in response.json()["detail"]


class TestListAssetsEndpoint:
    """Tests for GET /api/assets endpoint."""

    def test_list_assets_empty(self, client, mock_asset_service):
        """Test listing when no assets exist."""
        mock_asset_service.list_assets.return_value = []

        response = client.get("/api/assets")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_assets_with_items(self, client, mock_asset_service):
        """Test listing with multiple assets."""
        mock_asset1 = MagicMock()
        mock_asset1.id = "asset-1"
        mock_asset1.filename = "file1.png"
        mock_asset1.original_filename = "image1.png"
        mock_asset1.content_type = "image/png"
        mock_asset1.size_bytes = 1024
        mock_asset1.url = "/api/assets/asset-1"
        mock_asset1.created_at = "2024-01-01T00:00:00"

        mock_asset2 = MagicMock()
        mock_asset2.id = "asset-2"
        mock_asset2.filename = "file2.jpg"
        mock_asset2.original_filename = "photo.jpg"
        mock_asset2.content_type = "image/jpeg"
        mock_asset2.size_bytes = 2048
        mock_asset2.url = "/api/assets/asset-2"
        mock_asset2.created_at = "2024-01-02T00:00:00"

        mock_asset_service.list_assets.return_value = [mock_asset1, mock_asset2]

        response = client.get("/api/assets")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == "asset-1"
        assert data[1]["id"] == "asset-2"


class TestGetAssetEndpoint:
    """Tests for GET /api/assets/{asset_id} endpoint."""

    def test_get_asset_not_found(self, client, mock_asset_service):
        """Test getting a non-existent asset."""
        mock_asset_service.get_asset.return_value = None

        response = client.get("/api/assets/nonexistent-id")

        assert response.status_code == 404

    def test_get_asset_file_not_found(self, client, mock_asset_service):
        """Test when asset exists in DB but file is missing."""
        mock_asset = MagicMock()
        mock_asset.filename = "test.png"
        mock_asset_service.get_asset.return_value = mock_asset
        mock_asset_service.get_asset_path.return_value = None

        response = client.get("/api/assets/test-id")

        assert response.status_code == 404


class TestDeleteAssetEndpoint:
    """Tests for DELETE /api/assets/{asset_id} endpoint."""

    def test_delete_asset_success(self, client, mock_asset_service):
        """Test successful asset deletion."""
        mock_asset_service.delete_asset.return_value = True

        response = client.delete("/api/assets/test-id")

        assert response.status_code == 204

    def test_delete_asset_not_found(self, client, mock_asset_service):
        """Test deleting a non-existent asset."""
        mock_asset_service.delete_asset.return_value = False

        response = client.delete("/api/assets/nonexistent-id")

        assert response.status_code == 404
