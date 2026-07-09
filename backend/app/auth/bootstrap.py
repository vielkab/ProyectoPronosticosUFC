from __future__ import annotations

from sqlalchemy import or_, select

from app.core.base_de_datos import SesionLocal
from app.core.configuracion import ajustes
from app.core.seguridad import generar_hash_password
from app.usuarios.models import Usuario


def asegurar_admin_inicial() -> None:
    usuario_admin = " ".join(ajustes.admin_usuario.strip().split())
    correo_admin = ajustes.admin_correo.strip().lower()
    password_admin = ajustes.admin_password

    if not usuario_admin or not correo_admin or not password_admin:
        return

    with SesionLocal() as db:
        admin = db.scalar(
            select(Usuario).where(
                or_(
                    Usuario.nombre == usuario_admin,
                    Usuario.correo == correo_admin,
                )
            )
        )

        if admin:
            admin.nombre = usuario_admin
            admin.correo = correo_admin
            admin.password_hash = generar_hash_password(password_admin)
            admin.rol = "administrador"
            admin.activo = True
        else:
            db.add(
                Usuario(
                    nombre=usuario_admin,
                    correo=correo_admin,
                    password_hash=generar_hash_password(password_admin),
                    rol="administrador",
                    activo=True,
                )
            )

        db.commit()
