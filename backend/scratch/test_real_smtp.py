import logging
import sys

# Add backend directory to path so we can import app modules
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.core.configuracion import ajustes
from app.core.correo import _ejecutar_envio_correo_sincrono

print("=== CONFIGURACIÓN DE SMTP ===")
print(f"HOST: {ajustes.smtp_host}")
print(f"PORT: {ajustes.smtp_port}")
print(f"USER: {ajustes.smtp_user}")
print(f"PASSWORD (len): {len(ajustes.smtp_password)}")
print(f"USE_TLS: {ajustes.smtp_use_tls}")
print(f"REMITENTE: {ajustes.correo_remitente}")
print("=============================")

print("\nIntentando enviar un correo de prueba...")
try:
    _ejecutar_envio_correo_sincrono(
        correo_destino="vielkaborja@gmail.com",
        asunto="Prueba de PronoStats UFC",
        contenido="Esta es una prueba de envío real usando tu configuración de Gmail."
    )
    print("\nProceso finalizado. Revisa los logs de arriba para ver si tuvo éxito o falló.")
except Exception as e:
    import traceback
    print("\nExcepción capturada en el hilo principal:")
    traceback.print_exc()
