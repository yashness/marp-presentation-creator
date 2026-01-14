from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_lifespan_logs():
    with TestClient(app) as test_client:
        response = test_client.get("/health")
        assert response.status_code == 200
