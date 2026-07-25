# PronoStats UFC

Proyecto final académico de pronósticos UFC/MMA desarrollado con **React** en el frontend y **FastAPI** en el backend. El proyecto utiliza **PostgreSQL** para la persistencia de datos siendo **NEON** nuestro servidor que usamos para guardar los datos en tiempo real, **Alembic** para las migraciones, **Clerk** (y JWT fallback) para la autenticación y gestión de usuarios, **Stripe** en modo test para recarga de créditos, y un modelo analítico de IA/ML para la predicción de peleas.

---

## 🚀 Despliegue en Producción

- **Frontend (Vercel):** https://proyecto-pronosticos-ufc.vercel.app
- **Backend (Render):** https://proyectopronosticosufc.onrender.com

---

## 🛠️ Tecnologías principales

- **Backend:** Python 3.12, FastAPI, SQLAlchemy, Alembic, Pydantic, Clerk SDK / PyJWT, Stripe, HTTPX.
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Clerk React, React Router, React Query, React Hook Form.
- **Autenticación & Usuarios:** Clerk (Gestión de identidades y Webhooks sincronizados).
- **Base de Datos:** PostgreSQL en servidores de NEON.
- **Contenedores:** Docker, Docker Compose.
- **CI/CD:** GitHub Actions.

---

## 📁 Estructura del repositorio

- `backend/`: servidor FastAPI, lógica de negocio, modelos SQLAlchemy, migraciones Alembic, endpoints y webhooks de sincronización.
- `frontend/`: aplicación React con Vite, TypeScript, integración de Clerk y React Query.
- `docker-compose.yml`: define Postgres, backend y frontend para desarrollo en contenedores.
- `modeloEntrenamiento/`: scripts y modelos de entrenamiento de pronósticos.
- `.github/workflows/`: pipelines de integración continua (CI/CD).

---

## ⚙️ Configuración de Variables de Entorno

Para ejecutar el proyecto localmente, debes crear los archivos de configuración correspondientes basándote en los requerimientos del sistema:

1. **Backend (`backend/.env`):**
   Crea este archivo definiendo la cadena de conexión a PostgreSQL (`DATABASE_URL`), la URL del frontend para políticas CORS (`FRONTEND_URL`), las claves secretas de Clerk (`CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`) y las llaves de prueba de Stripe.

2. **Frontend (`frontend/.env`):**
   Crea este archivo especificando la ruta de la API (`VITE_API_URL=http://localhost:8000`) y tu clave pública de Clerk (`VITE_CLERK_PUBLISHABLE_KEY`).

---

## 💻 Desarrollo Local

### Opción 1: Ejecutar con Docker Compose (Recomendado)

Inicia la base de datos PostgreSQL, el backend y el frontend de forma automatizada:

    docker compose up --build

Esto levanta:
- **Frontend:** http://localhost:5173
- **Backend (API):** http://localhost:8000
- **PostgreSQL:** localhost:5438 (mapeado al puerto interno 5432)

---

### Opción 2: Ejecutar por separado

#### Backend

    cd backend
    python -m venv .venv

    # En Windows (PowerShell):
    .venv\Scripts\Activate.ps1
    # En Linux/macOS:
    # source .venv/bin/activate

    pip install --upgrade pip
    pip install -e .

    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

#### Frontend

    cd frontend
    npm install
    npm run dev

El frontend usará `VITE_API_URL` para conectarse al backend.

---

## 💡 Consejo Técnico: Recepción de Webhooks de Clerk / Stripe en Local

Dado que servicios como **Clerk** o **Stripe** envían eventos asíncronos mediante Webhooks HTTP (para la sincronización de nuevos usuarios o confirmación de recargas), **no pueden realizar peticiones directas a `localhost:8000`**.

Para probar y depurar estos flujos durante el desarrollo local, se recomienda exponer el backend a Internet mediante un **túnel seguro HTTPS** usando **Ngrok** o **Localtunnel**:

1. **Exponer el puerto local:**
       npx localtunnel --port 8000
       # o con Ngrok:
       ngrok http 8000

2. **Configurar la URL en los Dashboards:**
   Copia la URL pública temporal asignada (ej. `https://tu-tunel.loca.lt`) y vincúlala en los paneles de administración:
   - **Clerk Webhook:** https://tu-tunel.loca.lt/auth/webhook
   - **Stripe Webhook:** https://tu-tunel.loca.lt/pagos/webhook

---

## 🛠️ Comandos útiles

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

---

## 📡 Endpoints principales

- **Autenticación & Webhooks:** `POST /auth/webhook`, `POST /auth/register`, `POST /auth/login`, `GET /usuarios/yo`
- **Eventos:** `GET /eventos`, `GET /eventos/{evento_id}`
- **Peleas:** `POST /eventos/peleas/{pelea_id}/resultado`
- **Peleadores:** `GET /peleadores`, `GET /peleadores/{peleador_id}`
- **Predicciones:** `GET /predicciones/{fight_id}`
- **Apuestas:** `POST /apuestas`, `GET /apuestas/historial`
- **Pagos:** `POST /pagos/checkout`, `POST /pagos/webhook`
- **Administración:** `GET /admin/resumen`, `POST /admin/sincronizar`

---

## 🔄 Flujo de Uso de la Aplicación

1. **Autenticación:** Inicia sesión o regístrate en la app web mediante la integración con **Clerk**. La API recibirá la notificación vía Webhook para dar de alta al usuario en la base de datos PostgreSQL.
2. **Consulta de Eventos:** Navega por la cartelera de eventos UFC para ver enfrentamientos y estadísticas de los peleadores.
3. **Predicciones con IA:** Visualiza el pronóstico automático generado por el modelo entrenado para cada pelea.
4. **Recarga de Créditos:** Simula recargas de saldo utilizando la pasarela integrada con **Stripe** en modo test.
5. **Apuestas Simuladas:** Utiliza tus créditos disponibles para realizar pronósticos sobre tus peleadores favoritos y hacer seguimiento en tu historial.

---

## 💳 Stripe Test Mode

Usar claves de prueba y webhooks de sandbox.

Tarjetas de ejemplo:

- **Éxito:** `4242 4242 4242 4242`
- **Rechazo:** `4000 0000 0000 0002`
- **Autenticación requerida:** `4000 0025 0000 3155`

---

## ⚙️ Despliegue

URLs de producción actuales:

- Frontend (Vercel): https://proyecto-pronosticos-ufc.vercel.app
- Backend (Render): https://proyectopronosticosufc.onrender.com

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

1. Crear un servicio Web estándar (Python).
2. Establecer el directorio de despliegue en `backend`.
3. Build command:
   - `pip install -e .`
4. Start command:
   - `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Configurar variables de entorno en Render.

#### Webhook de Clerk en producción

Configura en el dashboard de Clerk la URL:

https://proyectopronosticosufc.onrender.com/auth/webhook

---

## 🔄 Integración Continua (CI/CD)

El repositorio includes un pipeline automatizado mediante **GitHub Actions** (configurado en `.github/workflows/ci.yml`) que se ejecuta automáticamente ante cada `push` o `pull_request` a la rama `main`.
- **Fase de Build:** Verifica la correcta compilación del Frontend (React/Vite) y la instalación de dependencias del Backend (FastAPI).
- **Fase de Pruebas:** Ejecuta la suite de pruebas automatizadas del backend para asegurar la estabilidad del MVP antes del despliegue.

---

## 📌 Consideraciones

- El backend aplica migraciones y carga datos históricos al iniciar.
- El frontend consume la API a través de `VITE_API_URL`, por lo que el valor debe apuntar al backend desplegado.
- Si `API_SPORTS_KEY` no está presente, el proyecto puede funcionar con datos demo en modo local.

---

## 📝 Notas finales

Este README documenta el arranque local, las dependencias principales, el uso de túneles para webhooks locales y los pasos para desplegar el frontend en Vercel y el backend en Render.