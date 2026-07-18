import os
from fastapi.testclient import TestClient
from app.main import app
from app.core.configuracion import ajustes

client = TestClient(app)

def test_auth_email_flow(tmp_path):
    # Ensure development codes are saved and we use SQLite fallback
    ajustes.guardar_codigos_desarrollo = True
    
    # 1. Register a new user
    correo = "test_user_flow@example.com"
    usuario = "testuserflow"
    password = "SecurePassword123"
    cedula = "12345678"
    
    # Clean up files in codigos_desarrollo before starting
    import shutil
    from pathlib import Path
    dir_codigos = Path(__file__).resolve().parents[1] / "codigos_desarrollo"
    if dir_codigos.exists():
        for f in dir_codigos.glob("*.txt"):
            try:
                f.unlink()
            except Exception:
                pass

    # Call register endpoint
    response = client.post(
        "/auth/register",
        json={
            "usuario": usuario,
            "correo": correo,
            "password": password,
            "cedula": cedula,
            "fecha_nacimiento": "2000-01-01T00:00:00",
            "acepta_terminos": True
        }
    )
    assert response.status_code == 202, f"Register failed: {response.text}"
    
    # Wait for thread to write the file (or check if it exists)
    import time
    code_file = dir_codigos / "test_user_flow_at_example_com.txt"
    for _ in range(20):
        if code_file.exists():
            break
        time.sleep(0.1)
        
    assert code_file.exists(), "Email code file was not created in codigos_desarrollo"
    
    # Read the code from the file
    content = code_file.read_text(encoding="utf-8")
    assert "Codigo:" in content
    codigo = None
    for line in content.splitlines():
        if line.startswith("Codigo:"):
            codigo = line.split(":")[1].strip()
            break
    
    assert codigo is not None, "Could not find verification code in email file"
    
    # 2. Verify registration
    response_verify = client.post(
        "/auth/register/verify",
        json={
            "correo": correo,
            "codigo": codigo
        }
    )
    assert response_verify.status_code == 200, f"Verify register failed: {response_verify.text}"
    tokens = response_verify.json()
    assert "access_token" in tokens
    
    # 3. Request password recovery
    # Delete the code file first to verify it gets recreated
    code_file.unlink()
    
    # Try requesting with email instead of username
    response_forgot = client.post(
        "/auth/password/forgot",
        json={
            "usuario": correo
        }
    )
    assert response_forgot.status_code == 202, f"Forgot password failed: {response_forgot.text}"
    
    # Wait for the recovery email code file
    for _ in range(20):
        if code_file.exists():
            break
        time.sleep(0.1)
        
    assert code_file.exists(), "Recovery email code file was not created"
    
    # Read the recovery code
    content_recovery = code_file.read_text(encoding="utf-8")
    codigo_rec = None
    for line in content_recovery.splitlines():
        if line.startswith("Codigo:"):
            codigo_rec = line.split(":")[1].strip()
            break
            
    assert codigo_rec is not None
    
    # 4. Verify recovery code (using email)
    response_verify_rec = client.post(
        "/auth/password/verify-code",
        json={
            "usuario": correo,
            "codigo": codigo_rec
        }
    )
    assert response_verify_rec.status_code == 200, f"Verify recovery code failed: {response_verify_rec.text}"
    
    # 5. Reset password (using email)
    response_reset = client.post(
        "/auth/password/reset",
        json={
            "usuario": correo,
            "codigo": codigo_rec,
            "password": "NewSecurePassword123"
        }
    )
    assert response_reset.status_code == 200, f"Reset password failed: {response_reset.text}"
    
    # Try to log in with new password (using email)
    response_login = client.post(
        "/auth/login",
        json={
            "usuario": correo,
            "password": "NewSecurePassword123"
        }
    )
    assert response_login.status_code == 200, f"Login with new password failed: {response_login.text}"
    
    # Clean up test user in DB (optional, but since we are using sqlite fallback dev db, we should do it)
    # Using the database session to delete the user
    from app.core.base_de_datos import obtener_db
    db = next(obtener_db())
    from app.usuarios.models import Usuario
    from app.auth.models import CodigoAutenticacion
    from sqlalchemy import delete
    db.execute(delete(CodigoAutenticacion).where(CodigoAutenticacion.correo == correo))
    usuario_db = db.query(Usuario).filter(Usuario.correo == correo).first()
    if usuario_db:
        # Delete wallet first if cascade not configured
        from app.billetera.models import Billetera
        db.execute(delete(Billetera).where(Billetera.usuario_id == usuario_db.id))
        db.delete(usuario_db)
        db.commit()
