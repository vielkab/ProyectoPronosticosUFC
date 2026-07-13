from fastapi.testclient import TestClient
from app.main import app  # ajusta el import si tu app está en otra ruta

client = TestClient(app)

def test_app_arranca():
    assert app is not None

def test_docs_disponible():
    response = client.get("/docs")
    assert response.status_code == 200
    