# PronoStats UFC

MVP académico de pronósticos UFC/MMA con React en el frontend y FastAPI en el backend. El proyecto usa PostgreSQL para persistencia, Alembic para migraciones, JWT para autenticación, Stripe en modo test y un modelo de pronóstico para pelea.

## Estructura del repositorio

- `backend/`: servidor FastAPI, lógica de negocio, modelos SQLAlchemy, migraciones Alembic y carga de datos históricos.
- `frontend/`: aplicación React con Vite, TypeScript y React Query.
- `docker-compose.yml`: define Postgres, backend y frontend para desarrollo en contenedores.
- `modeloEntrenamiento/`: scripts y modelos de entrenamiento de pronósticos.

## Tecnologías principales

- Backend: Python 3.12, FastAPI, SQLAlchemy, Alembic, Pydantic, JWT, Stripe, HTTPX.
- Frontend: React, Vite, TypeScript, Tailwind, React Router, React Hook Form.
- DB: PostgreSQL.
- Contenedores: Docker, Docker Compose.

## Variables de entorno

### Backend (`backend/.env` o variables de entorno del servicio)

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

- `DATABASE_URL`: conexión a Postgres.
- `JWT_SECRET` / `SECRET_KEY`: secretos para autenticación y seguridad.
- `FRONTEND_URL`: URL permitida para CORS.
- `API_SPORTS_KEY`: clave para el proveedor de datos MMA (opcional en modo demo).
- `STRIPE_*`: claves de Stripe en modo prueba.

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
```

- `VITE_API_URL`: URL de la API backend.

## Desarrollo local

### Opción 1: Ejecutar con Docker Compose

Recomendado para levantar la app completa con PostgreSQL.

```bash
cd "c:\Users\Usuario\Desktop\Universidad\U SEM5\Modelado Ágil del Software\Proyecto_final\ProyectoPronosticosUFC"
docker compose up --build
```

Esto levanta:
- Frontend en `http://localhost:5173`
- Backend en `http://localhost:8000`
- PostgreSQL en `localhost:5438`

### Opción 2: Ejecutar por separado

#### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -e .
```

Crear un archivo `backend/.env` con las variables anteriores.

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend usará `VITE_API_URL` para conectarse al backend.

## Comandos útiles

### Frontend

- `npm install` — instalar dependencias.
- `npm run dev` — iniciar servidor de desarrollo.
- `npm run build` — generar build de producción.
- `npm run preview` — previsualizar el build.

### Backend

- `pip install -e .` — instalar backend en modo editable.
- `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` — ejecutar servidor.
- `docker compose up --build` — levantar la app completa con Docker.

### Base de datos

En Docker Compose, Postgres se expone en `5438:5432` y el backend usa la URL interna `postgresql+psycopg://postgres:postgres@postgres:5432/pronostats_ufc`.

## Endpoints principales

- Autenticación: `POST /auth/register`, `POST /auth/register/verify`, `POST /auth/login`, `GET /usuarios/yo`
- Eventos: `GET /eventos`, `GET /eventos/{evento_id}`
- Peleas: `POST /eventos/peleas/{pelea_id}/resultado`
- Peleadores: `GET /peleadores`, `GET /peleadores/{peleador_id}`
- Predicciones: `GET /predicciones/{fight_id}`
- Apuestas: `POST /apuestas`, `GET /apuestas/historial`
- Pagos: `POST /pagos/checkout`, `POST /pagos/webhook`
- Administración: `GET /admin/resumen`, `POST /admin/sincronizar`

## Stripe Test Mode

Usar claves de prueba y webhooks de sandbox.

Tarjetas de ejemplo:

- Éxito: `4242 4242 4242 4242`
- Rechazo: `4000 0000 0000 0002`
- Autenticación requerida: `4000 0025 0000 3155`

## Despliegue

URLs de producción actuales:

- Frontend (Vercel): `https://proyecto-pronosticos-ufc.vercel.app`
- Backend (Render): `https://proyectopronosticosufc.onrender.com`

### Frontend en Vercel

1. Conectar el repositorio a Vercel.
2. Seleccionar la carpeta `frontend` como directorio del proyecto.
3. Configurar build:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Establecer variables de entorno:
   - `VITE_API_URL=https://proyectopronosticosufc.onrender.com`
   - `VITE_CLERK_PUBLISHABLE_KEY=<tu_clave_publica_de_clerk>`
5. Desplegar.

> Si `VITE_API_URL` no se define, el build de producción usa por defecto la URL de Render configurada en el código.

### Backend en Render

Render puede desplegar directamente desde el repositorio.

#### Opción A: Web Service con Docker

1. Crear un nuevo servicio Web en Render.
2. Seleccionar Docker como entorno de despliegue.
3. Apuntar al directorio `backend`.
4. Render detectará y usará el `Dockerfile` existente.
5. Configurar variables de entorno con los valores de producción.

#### Opción B: Python Service sin Docker

1. Crear un servicio Web estándard (Python).
2. Establecer el directorio de despliegue en `backend`.
3. Build command:
   - `pip install -e .`
4. Start command:
   - `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Configurar variables de entorno en Render.

#### Variables sugeridas en Render

- `APP_ENV=produccion`
- `APP_DEBUG=false`
- `DATABASE_URL` — cadena de conexión a Postgres administrado.
- `JWT_SECRET`, `SECRET_KEY`
- `FRONTEND_URL=https://proyecto-pronosticos-ufc.vercel.app`
- `FRONTEND_URLS=https://proyecto-pronosticos-ufc.vercel.app`
- `CLERK_ISSUER_URL=https://<tu-instancia>.clerk.accounts.dev`
- `CLERK_WEBHOOK_SECRET=whsec_...`
- `CLERK_SECRET_KEY=sk_live_...`
- `API_SPORTS_KEY` (opcional)
- `MMA_API_URL=https://v1.mma.api-sports.io`
- `MMA_FIGHTS_ENDPOINT=/fights`
- `MMA_EVENTS_ENDPOINT=/events`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLIC_KEY`

#### Webhook de Clerk en producción

Configura en el dashboard de Clerk la URL:

`https://proyectopronosticosufc.onrender.com/auth/webhook`

## Consideraciones

- El backend aplica migraciones y carga datos históricos al iniciar.
- El frontend consume la API a través de `VITE_API_URL`, por lo que el valor debe apuntar al backend desplegado.
- Si `API_SPORTS_KEY` no está presente, el proyecto puede funcionar con datos demo en modo local.

### Integración Continua (CI/CD)

El repositorio incluye un pipeline automatizado mediante **GitHub Actions** (configurado en `.github/workflows/ci.yml`) que se ejecuta automáticamente ante cada `push` o `pull_request` a la rama `main`.
- **Fase de Build:** Verifica la correcta compilación del Frontend (React/Vite) y la instalación de dependencias del Backend (FastAPI).
- **Fase de Pruebas:** Ejecuta la suite de pruebas automatizadas del backend para asegurar la estabilidad del MVP antes del despliegue.

## Notas finales

Este README documenta el arranque local, las dependencias principales y los pasos para desplegar el frontend en Vercel y el backend en Render.
