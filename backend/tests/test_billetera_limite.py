from datetime import datetime, timezone, timedelta
from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.main import app
from app.core.base_de_datos import obtener_db
from app.core.configuracion import ajustes
from app.usuarios.models import Usuario
from app.billetera.models import Billetera, Recarga
from app.core.seguridad import generar_hash_password

client = TestClient(app)

def test_daily_recharge_limit():
    correo = "user_limite_test@example.com"
    
    # 1. Crear un usuario de prueba en la base de datos
    db = next(obtener_db())
    try:
        # Limpiar cualquier residuo de pruebas previas
        usuario_existente = db.query(Usuario).filter(Usuario.correo == correo).first()
        if usuario_existente:
            db.execute(delete(Recarga).where(Recarga.usuario_id == usuario_existente.id))
            db.execute(delete(Billetera).where(Billetera.usuario_id == usuario_existente.id))
            db.delete(usuario_existente)
            db.commit()

        usuario = Usuario(
            nombre="testlimituser",
            correo=correo,
            password_hash=generar_hash_password("Password123"),
            rol="usuario",
            activo=True,
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        usuario_id = usuario.id

        # Crear billetera
        billetera = Billetera(usuario_id=usuario_id, saldo=0.0, moneda="USD")
        db.add(billetera)
        db.commit()
    finally:
        db.close()

    # Iniciar sesión para obtener el token
    response_login = client.post(
        "/auth/login",
        json={"usuario": correo, "password": "Password123"}
    )
    assert response_login.status_code == 200
    token = response_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Hacer una recarga de 3000 créditos (debe permitirse)
    # Simulamos agregando una recarga completada directamente para simular el historial de hoy
    db = next(obtener_db())
    try:
        recarga_1 = Recarga(
            usuario_id=usuario_id,
            stripe_session_id="session_test_limit_1",
            monto=3000.0,
            estado="completado",
            creado_en=datetime.now(timezone.utc)
        )
        db.add(recarga_1)
        db.commit()
    finally:
        db.close()

    # 3. Intentar recargar otros 1500 créditos (debe permitirse, total = 4500)
    response_recarga_2 = client.post(
        "/billetera/recargar",
        json={"monto": 1500.0},
        headers=headers
    )
    if response_recarga_2.status_code != 503:
        assert response_recarga_2.status_code == 200

    # Simulamos que la recarga de 1500.0 fue completada para el límite
    db = next(obtener_db())
    try:
        recarga_2 = Recarga(
            usuario_id=usuario_id,
            stripe_session_id="session_test_limit_2",
            monto=1500.0,
            estado="completado",
            creado_en=datetime.now(timezone.utc)
        )
        db.add(recarga_2)
        db.commit()
    finally:
        db.close()

    # 4. Intentar recargar otros 1000 créditos (debe bloquearse, total superaría 5000)
    response_recarga_3 = client.post(
        "/billetera/recargar",
        json={"monto": 1000.0},
        headers=headers
    )
    assert response_recarga_3.status_code == 400
    assert "excedido el limite diario" in response_recarga_3.json()["detail"]

    # 5. Simulamos una recarga vieja (hace 25 horas) de 4000 créditos para probar que no afecta el límite de las últimas 24 horas
    db = next(obtener_db())
    try:
        db.execute(delete(Recarga).where(Recarga.usuario_id == usuario_id))
        db.commit()
        
        recarga_vieja = Recarga(
            usuario_id=usuario_id,
            stripe_session_id="session_test_limit_old",
            monto=4000.0,
            estado="completado",
            creado_en=datetime.now(timezone.utc) - timedelta(hours=25)
        )
        db.add(recarga_vieja)
        db.commit()
    finally:
        db.close()

    # Intentar recargar 2000 créditos (debe permitirse ya que la anterior fue hace > 24 horas)
    response_recarga_nueva = client.post(
        "/billetera/recargar",
        json={"monto": 2000.0},
        headers=headers
    )
    if response_recarga_nueva.status_code != 503:
        assert response_recarga_nueva.status_code == 200

    # Limpieza final
    db = next(obtener_db())
    try:
        db.execute(delete(Recarga).where(Recarga.usuario_id == usuario_id))
        db.execute(delete(Billetera).where(Billetera.usuario_id == usuario_id))
        usuario_db = db.get(Usuario, usuario_id)
        if usuario_db:
            db.delete(usuario_db)
        db.commit()
    finally:
        db.close()
