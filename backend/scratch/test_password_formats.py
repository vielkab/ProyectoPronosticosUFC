import smtplib
from email.message import EmailMessage

host = "smtp.gmail.com"
port = 587
user = "vielkaborja@gmail.com"
pass_raw = "ygdf wrfd gwwu vzvl"
pass_no_spaces = pass_raw.replace(" ", "").strip()

print("1. Intentando con la contraseña SIN espacios...")
try:
    server = smtplib.SMTP(host, port, timeout=10)
    server.starttls()
    server.login(user, pass_no_spaces)
    print("¡ÉXITO SIN ESPACIOS!")
    server.quit()
except Exception as e:
    print(f"Fallo sin espacios: {e}")

print("\n2. Intentando con la contraseña CON espacios...")
try:
    server = smtplib.SMTP(host, port, timeout=10)
    server.starttls()
    server.login(user, pass_raw)
    print("¡ÉXITO CON ESPACIOS!")
    server.quit()
except Exception as e:
    print(f"Fallo con espacios: {e}")
