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
    mma_api_url: str = Field("https://v1.mma.api-sports.io", alias="MMA_API_URL")
    mma_fights_endpoint: str = Field("/fights", alias="MMA_FIGHTS_ENDPOINT")
    mma_events_endpoint: str = Field("/events", alias="MMA_EVENTS_ENDPOINT")
    mma_fighters_endpoint: str = Field("/fighters", alias="MMA_FIGHTERS_ENDPOINT")
    mma_fighter_categories: str = Field(
        "Flyweight,Bantamweight,Featherweight,Lightweight,Welterweight,Middleweight,Light Heavyweight,Heavyweight,"
        "Women's Strawweight,Women's Flyweight,Women's Bantamweight,Women's Featherweight",
        alias="MMA_FIGHTER_CATEGORIES",
    )
    mma_fighter_category_limit: int = Field(2, alias="MMA_FIGHTER_CATEGORY_LIMIT")
    stripe_secret_key: str = Field("", alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field("", alias="STRIPE_WEBHOOK_SECRET")
    stripe_public_key: str = Field("", alias="STRIPE_PUBLIC_KEY")
    frontend_url: str = Field("http://localhost:5173", alias="FRONTEND_URL")
    frontend_urls: str = Field(
        "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
        alias="FRONTEND_URLS",
    )
    sqlite_fallback_habilitado: bool = Field(True, alias="SQLITE_FALLBACK_HABILITADO")
    sqlite_fallback_url: str = Field("", alias="SQLITE_FALLBACK_URL")
    smtp_host: str = Field("", alias="SMTP_HOST")
    smtp_port: int = Field(587, alias="SMTP_PORT")
    smtp_user: str = Field("", alias="SMTP_USER")
    smtp_password: str = Field("", alias="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(True, alias="SMTP_USE_TLS")
    correo_remitente: str = Field("no-reply@pronostats.local", alias="CORREO_REMITENTE")
    resend_api_key: str = Field("re_NaSuH7Rj_8ivqwXwuCoqLwyqv6ubrh9AH", alias="RESEND_API_KEY")
    guardar_codigos_desarrollo: bool = Field(True, alias="GUARDAR_CODIGOS_DESARROLLO")
    admin_usuario: str = Field("Dana White", alias="ADMIN_USUARIO")
    admin_correo: str = Field("vielkaborja@gmail.com", alias="ADMIN_CORREO")
    admin_password: str = Field("Elmeromero1", alias="ADMIN_PASSWORD")

    @property
    def frontend_origenes_permitidos(self) -> list[str]:
        from urllib.parse import urlparse

        origenes = [origen.strip() for origen in self.frontend_urls.split(",") if origen.strip()]

        if self.frontend_url.strip():
            origenes.append(self.frontend_url.strip())

        origenes_limpios = []
        for origen in origenes:
            partes = urlparse(origen)
            if partes.scheme and partes.netloc:
                origenes_limpios.append(f"{partes.scheme}://{partes.netloc}")
            else:
                origenes_limpios.append(origen)

        return list(dict.fromkeys(origenes_limpios))


    @property
    def frontend_url_base(self) -> str:
        from urllib.parse import urlparse
        partes = urlparse(self.frontend_url)
        if partes.scheme and partes.netloc:
            return f"{partes.scheme}://{partes.netloc}"
        return self.frontend_url


ajustes = Ajustes()
