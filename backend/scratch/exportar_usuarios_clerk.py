import csv
import re
from sqlalchemy import select
from app.core.base_de_datos import SesionLocal
from app.usuarios.models import Usuario

def sanitizar_username(username):
    # Convertir a minúsculas
    u = username.lower().strip()
    # Reemplazar espacios y guiones largos por guión bajo
    u = re.sub(r'[\s\-]+', '_', u)
    # Dejar solo caracteres válidos para Clerk (letras, números, _, ., -)
    u = re.sub(r'[^a-z0-9._\-]', '', u)
    # Asegurar longitud mínima
    if len(u) < 3:
        u = f"user_{u}"
    return u

def exportar_usuarios():
    csv_file = "usuarios_importacion_clerk.csv"
    headers = ["email_address", "username", "password_hash", "password_hasher"]
    
    with SesionLocal() as db:
        # Traer usuarios que aún no están vinculados a Clerk y tienen contraseña local
        stmt = select(Usuario).where(Usuario.clerk_id.is_(None), Usuario.password_hash != "clerk_managed")
        usuarios = db.scalars(stmt).all()
        
        if not usuarios:
            print("No hay usuarios locales pendientes de exportar.")
            return

        with open(csv_file, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            
            contador = 0
            for u in usuarios:
                username_clerk = sanitizar_username(u.nombre)
                # Escribir fila compatible con importador de Clerk
                writer.writerow([
                    u.correo.strip().lower(),
                    username_clerk,
                    u.password_hash,
                    "bcrypt"
                ])
                contador += 1
                
        print(f"Éxito: Se exportaron {contador} usuarios a '{csv_file}'.")
        print("Puedes subir este archivo directamente en el Dashboard de Clerk -> Users -> Import.")

if __name__ == "__main__":
    exportar_usuarios()
