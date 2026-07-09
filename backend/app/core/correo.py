from __future__ import annotations

from email.message import EmailMessage
import logging
from pathlib import Path
import smtplib

from app.core.configuracion import ajustes

logger = logging.getLogger(__name__)


def _guardar_copia_desarrollo(correo_destino: str, asunto: str, contenido: str) -> None:
    if not ajustes.guardar_codigos_desarrollo:
        return

    directorio = Path(__file__).resolve().parents[2] / "codigos_desarrollo"
    directorio.mkdir(exist_ok=True)
    nombre_archivo = correo_destino.replace("@", "_at_").replace(".", "_")
    ruta = directorio / f"{nombre_archivo}.txt"
    ruta.write_text(
        f"Asunto: {asunto}\nDestino: {correo_destino}\n\n{contenido}\n",
        encoding="utf-8",
    )
    logger.info("Copia de codigo de desarrollo guardada en %s", ruta)


def enviar_correo(correo_destino: str, asunto: str, contenido: str) -> None:
    if ajustes.smtp_host.strip():
        password_smtp = ajustes.smtp_password.replace(" ", "").strip()
        mensaje = EmailMessage()
        mensaje["Subject"] = asunto
        mensaje["From"] = ajustes.correo_remitente
        mensaje["To"] = correo_destino
        mensaje.set_content(contenido)

        with smtplib.SMTP(ajustes.smtp_host, ajustes.smtp_port, timeout=10) as servidor:
            if ajustes.smtp_use_tls:
                servidor.starttls()

            if ajustes.smtp_user.strip():
                servidor.login(ajustes.smtp_user.strip(), password_smtp)

            servidor.send_message(mensaje)
    else:
        logger.warning(
            "SMTP no configurado. El correo para %s se guardara en archivos de desarrollo.",
            correo_destino,
        )

    _guardar_copia_desarrollo(correo_destino, asunto, contenido)
