import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.configuracion import ajustes
from app.core.base_de_datos import engine, SesionLocal
from app.usuarios.models import Usuario
from sqlalchemy import select

print("=== CONFIGURACIÓN DE BASE DE DATOS ===")
print(f"DATABASE_URL: {ajustes.database_url}")
print("=======================================")

try:
    with engine.connect() as conn:
        print("Conexión básica a la base de datos: ¡ÉXITO!")
        
    db = SesionLocal()
    try:
        usuarios = db.scalars(select(Usuario)).all()
        print(f"\nSe encontraron {len(usuarios)} usuarios registrados:")
        for u in usuarios:
            print(f"- ID: {u.id} | Nombre: '{u.nombre}' | Correo: '{u.correo}' | Activo: {u.activo}")
    except Exception as e:
        print(f"\nError al consultar la tabla de usuarios: {e}")
    finally:
        db.close()
        
except Exception as e:
    import traceback
    print("\nError de conexión a la base de datos:")
    traceback.print_exc()
