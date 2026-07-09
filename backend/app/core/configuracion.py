from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Ajustes(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_nombre: str = "PronoStats UFC API"
    app_version: str = "0.1.0"
    app_env: str = "desarrollo"
    app_debug: bool = True

    database_url: str = Field(
        "postgresql+psycopg://postgres:postgres@localhost:5432/pronostats_ufc",
        alias="DATABASE_URL",
    )
    secret_key: str = Field("cambia-esta-clave", alias="SECRET_KEY")
    jwt_secret: str = Field("cambia-este-jwt-secret", alias="JWT_SECRET")
    jwt_expire_minutes: int = Field(60, alias="JWT_EXPIRE_MINUTES")
    api_sports_key: str = Field("", alias="API_SPORTS_KEY")
    stripe_secret_key: str = Field("", alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field("", alias="STRIPE_WEBHOOK_SECRET")
    stripe_public_key: str = Field("", alias="STRIPE_PUBLIC_KEY")
    frontend_url: str = Field("http://localhost:5173", alias="FRONTEND_URL")
    sqlite_fallback_habilitado: bool = Field(True, alias="SQLITE_FALLBACK_HABILITADO")
    sqlite_fallback_url: str = Field("", alias="SQLITE_FALLBACK_URL")
    smtp_host: str = Field("", alias="SMTP_HOST")
    smtp_port: int = Field(587, alias="SMTP_PORT")
    smtp_user: str = Field("", alias="SMTP_USER")
    smtp_password: str = Field("", alias="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(True, alias="SMTP_USE_TLS")
    correo_remitente: str = Field("no-reply@pronostats.local", alias="CORREO_REMITENTE")
    guardar_codigos_desarrollo: bool = Field(True, alias="GUARDAR_CODIGOS_DESARROLLO")
    admin_usuario: str = Field("Dana White", alias="ADMIN_USUARIO")
    admin_correo: str = Field("vielkaborja@gmail.com", alias="ADMIN_CORREO")
    admin_password: str = Field("Elmeromero1", alias="ADMIN_PASSWORD")


ajustes = Ajustes()
