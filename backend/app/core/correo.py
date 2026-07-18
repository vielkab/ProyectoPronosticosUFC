from __future__ import annotations

from email.message import EmailMessage
import logging
from pathlib import Path
import smtplib
import threading

from app.core.configuracion import ajustes

logger = logging.getLogger(__name__)

def _guardar_copia_desarrollo(correo_destino: str, asunto: str, contenido: str) -> None:
    if not ajustes.guardar_codigos_desarrollo:
        return

    try:
        directorio = Path(__file__).resolve().parents[2] / "codigos_desarrollo"
        directorio.mkdir(exist_ok=True)
        nombre_archivo = correo_destino.replace("@", "_at_").replace(".", "_")
        ruta = directorio / f"{nombre_archivo}.txt"
        ruta.write_text(
            f"Asunto: {asunto}\nDestino: {correo_destino}\n\n{contenido}\n",
            encoding="utf-8",
        )
        logger.info("Copia de codigo de desarrollo guardada en %s", ruta)
    except Exception as e:
        logger.error("Error al guardar copia de desarrollo: %s", str(e))


def _ejecutar_envio_correo_sincrono(correo_destino: str, asunto: str, contenido: str) -> None:
    enviado = False

    # 1. Si está configurado Resend API Key, preferirlo sobre SMTP
    if ajustes.resend_api_key.strip():
        import httpx
        try:
            api_key = ajustes.resend_api_key.strip()
            # En Resend, si no tienes dominio verificado, debes enviar desde "onboarding@resend.dev"
            remitente = "onboarding@resend.dev" if "pronostats.local" in ajustes.correo_remitente or "@" not in ajustes.correo_remitente else ajustes.correo_remitente
            
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": remitente,
                    "to": [correo_destino],
                    "subject": asunto,
                    "html": contenido.replace("\n", "<br>"),
                },
                timeout=10
            )
            if response.status_code in (200, 201, 202):
                logger.info("Correo enviado exitosamente a %s a traves de Resend API", correo_destino)
                enviado = True
            else:
                logger.error("Error de Resend API (%d): %s", response.status_code, response.text)
        except Exception as e:
            logger.error("Error al enviar correo via Resend API: %s", str(e))

    # 2. Alternativa: SMTP tradicional (si no se envió por Resend o si falló)
    if not enviado and ajustes.smtp_host.strip():
        password_smtp = ajustes.smtp_password.replace(" ", "").strip()
        mensaje = EmailMessage()
        mensaje["Subject"] = asunto
        mensaje["From"] = ajustes.correo_remitente
        mensaje["To"] = correo_destino
        mensaje.set_content(contenido)

        try:
            # Si el puerto es 465, usamos una conexión segura SSL directa
            if ajustes.smtp_port == 465:
                servidor_context = smtplib.SMTP_SSL(ajustes.smtp_host, ajustes.smtp_port, timeout=10)
            else:
                servidor_context = smtplib.SMTP(ajustes.smtp_host, ajustes.smtp_port, timeout=10)

            with servidor_context as servidor:
                if ajustes.smtp_port != 465 and ajustes.smtp_use_tls:
                    servidor.starttls()

                if ajustes.smtp_user.strip():
                    servidor.login(ajustes.smtp_user.strip(), password_smtp)

                servidor.send_message(mensaje)
            logger.info("Correo enviado exitosamente a %s via SMTP", correo_destino)
            enviado = True
        except Exception as e:
            logger.error("Error al enviar correo via SMTP: %s", str(e))

    # 3. Respaldo local y de logs si no se pudo enviar por ningún medio
    if not enviado:
        logger.warning("No se pudo enviar el correo a %s por ningún canal configurado.", correo_destino)
        logger.warning("Respaldo del mensaje para %s:\n%s", correo_destino, contenido)
    else:
        logger.info("El correo para %s fue enviado correctamente.", correo_destino)

    _guardar_copia_desarrollo(correo_destino, asunto, contenido)


def enviar_correo(correo_destino: str, asunto: str, contenido: str) -> None:
    """Envía un correo electrónico en segundo plano para evitar bloquear la solicitud HTTP."""
    hilo = threading.Thread(
        target=_ejecutar_envio_correo_sincrono,
        args=(correo_destino, asunto, contenido),
        daemon=True
    )
    hilo.start()
