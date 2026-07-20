from app.core.base_de_datos import SesionLocal
from app.usuarios.models import Usuario
from app.billetera.models import Billetera
from app.core.seguridad import generar_hash_password
from sqlalchemy import select

def repopulate():
    print("Repopulating database with original users and wallets...")
    db = SesionLocal()
    try:
        # Users to add/ensure
        users_data = [
            {
                "nombre": "Dana White",
                "correo": "vielkaborja@gmail.com",
                "password_hash": generar_hash_password("Elmeromero1"),
                "rol": "administrador",
                "saldo": 10000.0
            },
            {
                "nombre": "mario",
                "correo": "yosoysupermantlj@gmail.com",
                "password_hash": "$2b$12$eA1X5yZ3SBlr3iX9WkR1ZuzA9n9yV8KkMv.LSmGZzV2B7wzY7M1eq", # original hash
                "rol": "usuario",
                "saldo": 1000.0
            },
            {
                "nombre": "elkin",
                "correo": "elkincanto999@gmail.com",
                "password_hash": generar_hash_password("Elkin12345"),
                "rol": "usuario",
                "saldo": 1000.0
            },
            {
                "nombre": "victor",
                "correo": "yosoyironmantlj@gmail.com",
                "password_hash": "$2b$12$11SguMRRy0ZagwHd1oTWVe0OIILR90RfVS2KJnf4obi0Zy3fzlXUq", # original hash
                "rol": "usuario",
                "saldo": 1000.0
            },
            {
                "nombre": "juan",
                "correo": "yosoybatmantlj@gmail.com",
                "password_hash": "$2b$12$kaG6mPiu/LbvmU8uNSQEIOFaDspkBG5RPpoWo8/99PM930O0pxQJS", # original hash
                "rol": "usuario",
                "saldo": 1000.0
            }
        ]

        for u_data in users_data:
            # Check if user exists
            user = db.scalar(select(Usuario).where(Usuario.correo == u_data["correo"]))
            if not user:
                user = Usuario(
                    nombre=u_data["nombre"],
                    correo=u_data["correo"],
                    password_hash=u_data["password_hash"],
                    rol=u_data["rol"],
                    activo=True,
                    acepta_terminos=True
                )
                db.add(user)
                db.flush() # Ensure user.id is generated
                print(f"Created user: {u_data['nombre']}")
            else:
                user.nombre = u_data["nombre"]
                user.password_hash = u_data["password_hash"]
                user.rol = u_data["rol"]
                user.activo = True
                user.acepta_terminos = True
                db.flush()
                print(f"Updated user: {u_data['nombre']}")

            # Ensure wallet exists
            wallet = db.scalar(select(Billetera).where(Billetera.usuario_id == user.id))
            if not wallet:
                wallet = Billetera(
                    usuario_id=user.id,
                    saldo=u_data["saldo"],
                    moneda="USD"
                )
                db.add(wallet)
                print(f"Created wallet for user: {u_data['nombre']} with balance: {u_data['saldo']}")
            else:
                print(f"Wallet already exists for user: {u_data['nombre']}")

        db.commit()
        print("Success: Database repopulated successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error repopulating database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    repopulate()
