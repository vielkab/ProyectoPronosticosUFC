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
    
    # === IMPRIME ESTO PARA DETECTAR EL ERROR ===
    print(f"\n📬 [DIAGNÓSTICO] Destinatario: {correo_destino}")
    print(f"📬 [DIAGNÓSTICO] Asunto recibido: {asunto}")
    print(f"📬 [DIAGNÓSTICO] Contenido del cuerpo:\n{contenido}\n")
    # ===========================================
    
    import os
    import httpx

    # Resolve api key and provider
    api_key_env = os.getenv("RESEND_API_KEY", "").strip()
    api_key_ajustes = getattr(ajustes, "resend_api_key", "").strip()
    api_key = api_key_env if api_key_env else api_key_ajustes
    
    provider = ajustes.email_provider.lower().strip()
    remitente_oficial = ajustes.correo_remitente.strip() if ajustes.correo_remitente.strip() else "vielkaborja@gmail.com"

    # Function to try sending via Brevo API
    def enviar_con_brevo() -> bool:
        if not (api_key and "xkeysib" in api_key):
            logger.warning("Brevo no está configurado (falta API Key válida con 'xkeysib')")
            return False
        try:
            asunto_brevo = f"{asunto} [Brevo Cloud]"
            headers = {
                "accept": "application/json",
                "api-key": api_key,
                "content-type": "application/json"
            }
            
            # Creamos una estructura HTML real y limpia para que los filtros de Brevo no lo destruyan
            html_formateado = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
            </head>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #1a73e8;">PronoStats UFC</h2>
                    <p>Usa este código para restablecer tu contraseña en nuestra plataforma.</p>
                    <div style="background-color: #f1f3f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; border-radius: 4px; color: #202124;">
                        {contenido.split("Codigo: ")[1].split("\n")[0] if "Codigo: " in contenido else "Código generado"}
                    </div>
                    <p style="font-size: 13px; color: #666;">Vigencia: 15 minutos.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
                    <p style="font-size: 11px; color: #999; text-align: center;">Este es un correo automático, por favor no respondas a este mensaje.</p>
                </div>
            </body>
            </html>
            """

            payload = {
                "sender": {"name": "PronoStats UFC", "email": remitente_oficial},
                "to": [{"email": correo_destino}],
                "subject": asunto_brevo,
                "htmlContent": html_formateado,
            }

            response = httpx.post(
                "https://api.brevo.com/v3/smtp/email",
                headers=headers,
                json=payload,
                timeout=12
            )
            
            if response.status_code in (200, 201, 202):
                logger.info("Correo enviado exitosamente a %s a través de Brevo API", correo_destino)
                return True
            else:
                logger.error("Error de Brevo API (%d): %s", response.status_code, response.text)
                return False
        except Exception as e:
            logger.error("Error al enviar correo via Brevo API: %s", str(e))
            return False

    # Function to try sending via Resend API
    def enviar_con_resend() -> bool:
        if not api_key or "xkeysib" in api_key:
            logger.warning("Resend no está configurado (falta API Key de Resend)")
            return False
        try:
            # En Resend, si no tienes dominio verificado, debes enviar desde "onboarding@resend.dev"
            remitente = "onboarding@resend.dev" if "pronostats.local" in remitente_oficial or "@" not in remitente_oficial else remitente_oficial
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
                logger.info("Correo enviado exitosamente a %s a través de Resend API", correo_destino)
                return True
            else:
                logger.error("Error de Resend API (%d): %s", response.status_code, response.text)
                return False
        except Exception as e:
            logger.error("Error al enviar correo via Resend API: %s", str(e))
            return False

    # Function to try sending via SMTP
    def enviar_con_smtp() -> bool:
        if not ajustes.smtp_host.strip():
            logger.warning("SMTP no está configurado (falta SMTP_HOST)")
            return False
        try:
            password_smtp = ajustes.smtp_password.replace(" ", "").strip()
            mensaje = EmailMessage()
            mensaje["Subject"] = f"{asunto} [SMTP Local]"
            mensaje["From"] = remitente_oficial
            mensaje["To"] = correo_destino
            mensaje.set_content(contenido)

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
            return True
        except Exception as e:
            logger.error("Error al enviar correo via SMTP: %s", str(e))
            return False

    # Dispatch based on configured provider
    if provider == "brevo":
        enviado = enviar_con_brevo()
        if not enviado:
            logger.info("Fallo en Brevo, intentando fallback por SMTP...")
            enviado = enviar_con_smtp()
    elif provider == "resend":
        enviado = enviar_con_resend()
        if not enviado:
            logger.info("Fallo en Resend, intentando fallback por SMTP...")
            enviado = enviar_con_smtp()
    else: # Default/SMTP
        enviado = enviar_con_smtp()
        if not enviado:
            logger.info("Fallo en SMTP, intentando fallback por Brevo...")
            enviado = enviar_con_brevo()

    # 3. Respaldo local y de logs
    if not enviado:
        logger.warning("No se pudo enviar el correo a %s por ningún canal configurado.", correo_destino)
    else:
        logger.info("El correo para %s fue enviado correctamente.", correo_destino)

    _guardar_copia_desarrollo(correo_destino, asunto, contenido)


def enviar_correo(correo_destino: str, asunto: str, contenido: str) -> None:
    """Prueba lineal sin hilos para forzar la salida de logs"""
    print("\n🚀 [DEBUG FASTAPI] Entrando a enviar_correo de forma lineal...")
    _ejecutar_envio_correo_sincrono(correo_destino, asunto, contenido)
    print("🏁 [DEBUG FASTAPI] Saliendo de enviar_correo...\n")