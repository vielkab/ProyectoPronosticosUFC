# PronoStats UFC

MVP academico para pronosticos UFC/MMA con React, FastAPI, SQLAlchemy, PostgreSQL, Alembic, JWT y Stripe Test Mode.

## Configuracion

Backend:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/pronostats_ufc
JWT_SECRET=cambia-este-jwt-secret
SECRET_KEY=cambia-esta-clave
FRONTEND_URL=http://localhost:5173
API_SPORTS_KEY=
MMA_API_URL=https://v1.mma.api-sports.io
MMA_FIGHTS_ENDPOINT=/fights
MMA_EVENTS_ENDPOINT=/events
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLIC_KEY=pk_test_xxx
```

Frontend:

```env
VITE_API_URL=http://localhost:8000
```

## Endpoints principales

- `POST /auth/register`, `POST /auth/register/verify`, `POST /auth/login`, `GET /usuarios/yo`
- `GET /eventos`, `GET /eventos/{evento_id}`, `POST /eventos/peleas/{pelea_id}/resultado`
- `GET /peleadores`, `GET /peleadores/{peleador_id}`
- `GET /predicciones/{fight_id}`
- `POST /apuestas`, `GET /apuestas/historial`
- `POST /pagos/checkout`, `POST /pagos/webhook`
- `GET /admin/resumen`, `POST /admin/sincronizar`

## Stripe Test Mode

El sistema crea Checkout Sessions y actualiza apuestas mediante webhooks. Usa solo claves `sk_test`, `pk_test` y `whsec` de sandbox.

Tarjetas utiles:

- Pago exitoso: `4242 4242 4242 4242`
- Pago rechazado: `4000 0000 0000 0002`
- Requiere autenticacion: `4000 0025 0000 3155`

Usa cualquier fecha futura, cualquier CVC de tres digitos y un ZIP valido.

## Arquitectura

La logica de negocio vive en `app/*/service.py`, los routers solo exponen endpoints y los modelos SQLAlchemy se mantienen por dominio. El cliente externo MMA esta encapsulado en `app/eventos/mma_api_client.py`; usa `https://v1.mma.api-sports.io` con header `x-apisports-key`, consulta `/fights` y agrupa peleas por evento/fecha. Si no hay `API_SPORTS_KEY`, la sincronizacion conserva datos demo para poder ejecutar el MVP localmente.
