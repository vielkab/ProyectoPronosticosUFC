# Documento de Requisitos

## Introducción

Esta funcionalidad implementa el panel de administración completo del backend de PronoStats UFC. Cubre la gestión de peleas (CRUD + resultados + estados), la gestión de apuestas (listado y ajuste manual de estado) y la gestión de usuarios (listado, bloqueo y reactivación). Todos los endpoints requieren rol de administrador y deben cumplir las restricciones del AGENTS.md: validación con Pydantic, nombres en español, sin sobreingeniería.

---

## Glosario

- **Sistema**: el backend de PronoStats UFC (FastAPI + SQLAlchemy 2.0 + PostgreSQL).
- **Admin_Router**: el módulo `app/admin/router.py` que expone los endpoints del administrador.
- **Admin_Service**: el módulo `app/admin/service.py` que contiene la lógica de negocio del administrador.
- **Admin_Schemas**: los esquemas Pydantic de `app/admin/schemas.py` que validan las entradas y salidas del administrador.
- **Pelea**: registro en la tabla `peleas` con campos `id`, `evento_id`, `peleador_rojo_id`, `peleador_azul_id`, `division`, `estado`, `orden`, `notas`.
- **Evento**: registro en la tabla `eventos` con campos `id`, `nombre`, `fecha`, `sede`, `estado`.
- **Resultado**: registro en la tabla `resultados` con campos `id`, `pelea_id`, `ganador_id`, `metodo`, `round`.
- **Apuesta**: registro en la tabla `apuestas` con campos `id`, `usuario_id`, `pelea_id`, `peleador_seleccionado_id`, `monto`, `cuota`, `estado` (`Pendiente`/`Ganada`/`Perdida`/`Cancelada`), `estado_pago`, `creado_en`.
- **Prediccion**: registro en la tabla `predicciones` con campos `id`, `pelea_id`, `probabilidad_rojo`, `probabilidad_azul`, `acertada`.
- **Usuario**: registro en la tabla `usuarios` con campos `id`, `nombre`, `correo`, `rol`, `activo`.
- **EstadoPelea**: enumeración de estados válidos para una Pelea — `programada`, `en_curso`, `finalizada`, `cancelada`.
- **EstadoApuesta**: enumeración de estados válidos para una Apuesta — `Pendiente`, `Ganada`, `Perdida`, `Cancelada`.
- **Validador**: la capa de validación de entrada compuesta por los Admin_Schemas (Pydantic v2).
- **Autorizador**: la dependencia FastAPI `requerir_admin` que verifica el rol del token JWT.

---

## Requisitos

### Requisito 1: Control de acceso administrativo

**User Story:** Como administrador, quiero que todos los endpoints del panel administrativo estén protegidos por autenticación y autorización, para que solo los usuarios con rol `administrador` puedan ejecutarlos.

#### Criterios de Aceptación

1. WHEN una petición llega a cualquier endpoint de `Admin_Router`, THE `Autorizador` SHALL verificar que el token JWT sea válido y que el campo `rol` del usuario sea `administrador`.
2. IF el token JWT es inválido o está ausente, THEN THE `Autorizador` SHALL retornar HTTP 401.
3. IF el token JWT es válido pero el rol del usuario no es `administrador`, THEN THE `Autorizador` SHALL retornar HTTP 403.
4. THE `Autorizador` SHALL rechazar cualquier petición cuyo token haya expirado retornando HTTP 401.

---

### Requisito 2: Listar peleas

**User Story:** Como administrador, quiero obtener la lista completa de peleas con datos de evento y peleadores, para poder visualizar y gestionar la cartelera desde el panel.

#### Criterios de Aceptación

1. WHEN el `Admin_Router` recibe una petición GET `/admin/peleas`, THE `Admin_Service` SHALL retornar la lista de todas las peleas existentes en la base de datos.
2. THE `Admin_Service` SHALL incluir en cada elemento de la lista: `id`, `evento` (nombre del evento), `categoria` (división), `estado`, `fecha_hora` (fecha del evento), `peleador_rojo` (objeto con `id` y `nombre`), `peleador_azul` (objeto con `id` y `nombre`).
3. IF no existen peleas registradas, THEN THE `Admin_Service` SHALL retornar una lista vacía con HTTP 200.
4. THE `Admin_Schemas` SHALL validar que la respuesta se ajusta al esquema `PeleaAdminResumen` antes de enviarla al cliente.

---

### Requisito 3: Obtener detalle de una pelea

**User Story:** Como administrador, quiero ver el detalle completo de una pelea incluyendo su resultado si ya fue registrado, para poder tomar decisiones de gestión informadas.

#### Criterios de Aceptación

1. WHEN el `Admin_Router` recibe una petición GET `/admin/peleas/{id}`, THE `Admin_Service` SHALL retornar los datos completos de la Pelea identificada por `id`.
2. THE `Admin_Service` SHALL incluir en la respuesta todos los campos de `PeleaAdminResumen` más el campo `resultado` con `ganador_id`, `ganador_nombre`, `metodo` y `round` si el Resultado existe.
3. IF el campo `resultado` de la Pelea es `null`, THE `Admin_Service` SHALL retornar el campo `resultado` con valor `null` en la respuesta.
4. IF no existe una Pelea con el `id` indicado, THEN THE `Admin_Service` SHALL retornar HTTP 404 con un mensaje descriptivo.

---

### Requisito 4: Crear una pelea

**User Story:** Como administrador, quiero crear una nueva pelea en la cartelera usando IDs de peleadores existentes, para gestionar los combates del evento directamente desde el panel.

#### Criterios de Aceptación

1. WHEN el `Admin_Router` recibe una petición POST `/admin/peleas` con un payload válido, THE `Admin_Service` SHALL crear una nueva Pelea en la base de datos y retornar su detalle completo con HTTP 201.
2. THE `Validador` SHALL requerir en el payload los campos: `evento` (nombre, 2–160 caracteres), `categoria` (división, 1–80 caracteres), `fecha` (fecha válida), `peleador_rojo_id` (entero positivo), `peleador_azul_id` (entero positivo), `estado` (valor dentro de `EstadoPelea`).
3. IF `peleador_rojo_id` o `peleador_azul_id` no corresponden a un Peleador existente, THEN THE `Admin_Service` SHALL retornar HTTP 422 con un mensaje descriptivo.
4. IF `peleador_rojo_id` es igual a `peleador_azul_id`, THEN THE `Validador` SHALL retornar HTTP 422 indicando que los peleadores deben ser distintos.
5. THE `Admin_Service` SHALL crear el Evento si no existe uno con el mismo nombre y fecha, o reutizar el existente si coinciden.

---

### Requisito 5: Editar datos de una pelea

**User Story:** Como administrador, quiero editar los datos de una pelea existente (división, orden, estado del evento, etc.), para corregir errores o actualizar información antes del evento.

#### Criterios de Aceptación

1. WHEN el `Admin_Router` recibe una petición PUT `/admin/peleas/{id}` con un payload válido, THE `Admin_Service` SHALL actualizar los campos editables de la Pelea y retornar el detalle actualizado con HTTP 200.
2. THE `Validador` SHALL permitir editar los campos: `evento`, `categoria`, `fecha`, `peleador_rojo_id`, `peleador_azul_id`, `estado`.
3. IF no existe una Pelea con el `id` indicado, THEN THE `Admin_Service` SHALL retornar HTTP 404.
4. IF la Pelea tiene estado `finalizada` o `cancelada`, THEN THE `Admin_Service` SHALL retornar HTTP 409 indicando que la pelea no puede editarse en ese estado.
5. IF `peleador_rojo_id` o `peleador_azul_id` del payload no corresponden a un Peleador existente, THEN THE `Admin_Service` SHALL retornar HTTP 422.

---

### Requisito 6: Cambiar estado de una pelea

**User Story:** Como administrador, quiero cambiar únicamente el estado de una pelea (programada, en_curso, finalizada, cancelada), para actualizar el flujo del combate en tiempo real.

#### Criterios de Aceptación

1. WHEN el `Admin_Router` recibe una petición PATCH `/admin/peleas/{id}/estado` con el campo `estado`, THE `Admin_Service` SHALL actualizar el campo `estado` de la Pelea y retornar el detalle actualizado con HTTP 200.
2. THE `Validador` SHALL rechazar cualquier valor de `estado` que no pertenezca a `EstadoPelea` retornando HTTP 422.
3. IF no existe una Pelea con el `id` indicado, THEN THE `Admin_Service` SHALL retornar HTTP 404.

---

### Requisito 7: Registrar resultado de una pelea

**User Story:** Como administrador, quiero registrar el resultado de una pelea para que el sistema resuelva automáticamente todas las apuestas pendientes asociadas a esa pelea y evalúe la predicción existente.

#### Criterios de Aceptación

1. WHEN el `Admin_Router` recibe una petición PATCH `/admin/peleas/{id}/resultado` con `ganador_id`, `metodo` y opcionalmente `round`, THE `Admin_Service` SHALL registrar el Resultado, actualizar el estado de la Pelea a `finalizada` y retornar el detalle de la Pelea con HTTP 200.
2. THE `Validador` SHALL requerir `ganador_id` (entero positivo) y `metodo` (1–60 caracteres); `round` es opcional (entero entre 1 y 5).
3. IF `ganador_id` no corresponde a `peleador_rojo_id` ni a `peleador_azul_id` de la Pelea, THEN THE `Admin_Service` SHALL retornar HTTP 422 con un mensaje descriptivo.
4. IF la Pelea ya tiene un Resultado registrado, THEN THE `Admin_Service` SHALL retornar HTTP 409 indicando que el resultado ya fue registrado.
5. IF no existe una Pelea con el `id` indicado, THEN THE `Admin_Service` SHALL retornar HTTP 404.
6. WHEN el Resultado es registrado, THE `Admin_Service` SHALL resolver todas las Apuestas con estado `Pendiente` de esa Pelea: marcando `Ganada` si `peleador_seleccionado_id` coincide con `ganador_id`, y `Perdida` en caso contrario.
7. WHEN el Resultado es registrado y existe una Prediccion para esa Pelea, THE `Admin_Service` SHALL evaluar la Prediccion asignando `acertada = True` si el peleador con mayor probabilidad coincide con `ganador_id`, y `acertada = False` en caso contrario.

---

### Requisito 8: Cancelar una pelea

**User Story:** Como administrador, quiero cancelar una pelea para que el sistema invalide automáticamente todas las apuestas pendientes asociadas a ella.

#### Criterios de Aceptación

1. WHEN el `Admin_Router` recibe una petición DELETE `/admin/peleas/{id}`, THE `Admin_Service` SHALL cambiar el estado de la Pelea a `cancelada` y retornar HTTP 200 con un mensaje de confirmación.
2. WHEN la Pelea es cancelada, THE `Admin_Service` SHALL actualizar el estado de todas las Apuestas con estado `Pendiente` de esa Pelea a `Cancelada`.
3. IF no existe una Pelea con el `id` indicado, THEN THE `Admin_Service` SHALL retornar HTTP 404.
4. IF la Pelea ya tiene estado `cancelada`, THEN THE `Admin_Service` SHALL retornar HTTP 409 indicando que la pelea ya está cancelada.
5. IF la Pelea tiene estado `finalizada`, THEN THE `Admin_Service` SHALL retornar HTTP 409 indicando que una pelea finalizada no puede cancelarse.

---

### Requisito 9: Listar apuestas del sistema

**User Story:** Como administrador, quiero ver todas las apuestas registradas en el sistema con posibilidad de filtrar por estado, para supervisar la actividad de apuestas de la plataforma.

#### Criterios de Aceptación

1. WHEN el `Admin_Router` recibe una petición GET `/admin/apuestas`, THE `Admin_Service` SHALL retornar la lista de todas las Apuestas registradas en la base de datos.
2. WHERE el parámetro de query `estado` es proporcionado, THE `Admin_Service` SHALL filtrar las Apuestas retornando solo aquellas cuyo campo `estado` coincida exactamente con el valor indicado.
3. THE `Admin_Service` SHALL incluir en cada elemento de la lista: `id`, `usuario_id`, `pelea_id`, `peleador_seleccionado_id`, `monto`, `cuota`, `estado`, `estado_pago`, `creado_en`.
4. IF no existen Apuestas que coincidan con los filtros, THEN THE `Admin_Service` SHALL retornar una lista vacía con HTTP 200.
5. THE `Validador` SHALL rechazar un valor de `estado` en el query que no pertenezca a `EstadoApuesta` retornando HTTP 422.

---

### Requisito 10: Cambiar estado de una apuesta manualmente

**User Story:** Como administrador, quiero cambiar manualmente el estado de una apuesta, para corregir errores de resolución o gestionar casos excepcionales.

#### Criterios de Aceptación

1. WHEN el `Admin_Router` recibe una petición PATCH `/admin/apuestas/{id}/estado` con el campo `estado`, THE `Admin_Service` SHALL actualizar el campo `estado` de la Apuesta y retornar la Apuesta actualizada con HTTP 200.
2. THE `Validador` SHALL requerir que el campo `estado` pertenezca a `EstadoApuesta`; si no, retornar HTTP 422.
3. IF no existe una Apuesta con el `id` indicado, THEN THE `Admin_Service` SHALL retornar HTTP 404.

---

### Requisito 11: Listar usuarios del sistema

**User Story:** Como administrador, quiero ver la lista de todos los usuarios registrados en la plataforma con sus datos básicos, para monitorear la base de usuarios.

#### Criterios de Aceptación

1. WHEN el `Admin_Router` recibe una petición GET `/admin/usuarios`, THE `Admin_Service` SHALL retornar la lista de todos los Usuarios registrados en la base de datos.
2. THE `Admin_Service` SHALL incluir en cada elemento de la lista: `id`, `nombre`, `correo`, `rol`, `activo`.
3. IF no existen Usuarios registrados, THEN THE `Admin_Service` SHALL retornar una lista vacía con HTTP 200.

---

### Requisito 12: Bloquear un usuario

**User Story:** Como administrador, quiero desactivar un usuario para impedir que acceda a la plataforma mientras persista su registro en la base de datos.

#### Criterios de Aceptación

1. WHEN el `Admin_Router` recibe una petición PATCH `/admin/usuarios/{id}/bloquear`, THE `Admin_Service` SHALL establecer el campo `activo` del Usuario a `False` y retornar HTTP 200 con un mensaje de confirmación.
2. IF no existe un Usuario con el `id` indicado, THEN THE `Admin_Service` SHALL retornar HTTP 404.
3. IF el Usuario ya tiene `activo = False`, THEN THE `Admin_Service` SHALL retornar HTTP 409 indicando que el usuario ya está bloqueado.
4. IF el Usuario a bloquear tiene rol `administrador`, THEN THE `Admin_Service` SHALL retornar HTTP 403 indicando que no se puede bloquear a un administrador.

---

### Requisito 13: Reactivar un usuario

**User Story:** Como administrador, quiero reactivar un usuario previamente bloqueado para restaurar su acceso a la plataforma.

#### Criterios de Aceptación

1. WHEN el `Admin_Router` recibe una petición PATCH `/admin/usuarios/{id}/reactivar`, THE `Admin_Service` SHALL establecer el campo `activo` del Usuario a `True` y retornar HTTP 200 con un mensaje de confirmación.
2. IF no existe un Usuario con el `id` indicado, THEN THE `Admin_Service` SHALL retornar HTTP 404.
3. IF el Usuario ya tiene `activo = True`, THEN THE `Admin_Service` SHALL retornar HTTP 409 indicando que el usuario ya está activo.
