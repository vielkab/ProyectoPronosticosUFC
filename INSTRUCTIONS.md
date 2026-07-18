# PronoStats - Implementación de Rankings y Peleas Históricas

## Objetivo

Implementar dos nuevas secciones del sistema utilizando exclusivamente los datasets del proyecto.

No se debe utilizar PostgreSQL para estas funcionalidades.

Los datos deben obtenerse directamente desde los archivos CSV cargados en memoria por el backend.

---

# Dataset de peleas

Archivo:

datasets/fights.csv

Crear un servicio que cargue el CSV al iniciar la aplicación.

No debe leerse el archivo en cada petición.

---

## Endpoint

GET /historico/peleas

Parámetros:

- page (default=1)
- size (default=20)

Debe devolver únicamente las peleas más recientes ordenadas por fecha descendente.

Cada registro debe contener únicamente:

- fecha
- peleador_1
- peleador_2
- ganador

La respuesta debe ser similar a:

```json
{
    "page":1,
    "size":20,
    "total":6500,
    "items":[
        {
            "fecha":"2026-06-14",
            "peleador_1":"Islam Makhachev",
            "peleador_2":"Arman Tsarukyan",
            "ganador":"Islam Makhachev"
        }
    ]
}
```

---

# Dataset de rankings

Archivo:

datasets/rankings_history.csv

Debe cargarse una sola vez al iniciar el backend.

---

## Endpoint

GET /rankings

Query parameter:

division

Ejemplo:

GET /rankings?division=Lightweight

Si no se especifica división, usar:

Lightweight

Debe devolver únicamente el ranking más reciente disponible para esa división.

Cada registro debe contener:

- posición
- nombre del peleador

Ejemplo:

```json
[
    {
        "rank":1,
        "fighter":"Islam Makhachev"
    },
    {
        "rank":2,
        "fighter":"Arman Tsarukyan"
    }
]
```

---

# Backend

Crear un nuevo módulo:

app/historico/

con la siguiente estructura:

app/historico/

- router.py
- service.py
- schemas.py
- loader.py

---

## loader.py

Debe cargar ambos datasets usando pandas durante el startup de FastAPI.

Debe dejar disponibles dos DataFrames globales:

historical_fights

historical_rankings

El backend nunca debe volver a leer los CSV después del inicio.

---

## service.py

Implementar:

get_recent_fights(page, size)

Debe:

- ordenar por fecha descendente
- paginar
- devolver únicamente los campos requeridos

Implementar:

get_rankings(division)

Debe:

- filtrar por división
- seleccionar únicamente la fecha más reciente disponible
- ordenar por posición

---

# Frontend

Agregar dos páginas nuevas.

---

## Rankings

Ruta:

/rankings

Al abrir la página:

- cargar automáticamente la división Lightweight

En la parte superior mostrar un selector con todas las divisiones:

- Flyweight
- Bantamweight
- Featherweight
- Lightweight
- Welterweight
- Middleweight
- Light Heavyweight
- Heavyweight
- Women's Strawweight
- Women's Flyweight
- Women's Bantamweight

Al cambiar la división:

hacer una nueva petición al endpoint.

Mostrar una tabla con:

| Rank | Fighter |

No mostrar información adicional.

---

## Peleas históricas

Ruta:

/historico

Al abrir:

cargar las 20 peleas más recientes.

Mostrar una tabla con:

| Fecha | Peleador 1 | Peleador 2 | Ganador |

Agregar paginación.

Botones:

Anterior

Siguiente

Cada cambio de página debe consultar nuevamente el backend.

No cargar todas las peleas en el frontend.

---

# Diseño

Utilizar los mismos componentes visuales ya existentes en el proyecto.

Mantener:

- mismo tema
- mismos colores
- mismo estilo de tablas
- misma navegación

No crear un diseño diferente.

---

# Restricciones

No usar PostgreSQL.

No modificar la estructura de la base de datos.

No crear migraciones.

No copiar los datos del CSV a la base de datos.

Toda la información debe provenir de:

- datasets/fights.csv
- datasets/rankings_history.csv

cargados en memoria al iniciar FastAPI.
