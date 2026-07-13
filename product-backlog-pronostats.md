# Product Backlog — ProNoStats

**Proyecto:** ProNoStats — plataforma de pronósticos y apuestas simuladas de UFC/MMA
**Repositorio:** https://github.com/vielkab/ProyectoPronosticosUFC

---

## Leyenda

- **Estimación:** T-shirt Sizing (XS, S, M, L, XL)
- **Prioridad (MoSCoW):** Must have / Should have / Could have / Won't have (esta iteración)

---

## Épica 1: Gestión de cuenta de usuario

| # | Historia de usuario | Criterios de aceptación | Estimación | Prioridad |
|---|---|---|---|---|
| 1.1 | Como visitante, quiero registrarme con correo y contraseña para crear mi cuenta de usuario. | - El sistema valida formato de correo y fuerza mínima de contraseña.<br>- Se crea el usuario con rol "Usuario" por defecto.<br>- Se muestra confirmación de registro exitoso. | S | Must |
| 1.2 | Como usuario registrado, quiero iniciar sesión con mis credenciales para acceder a mi cuenta. | - Login válido redirige al dashboard.<br>- Credenciales incorrectas muestran mensaje de error claro.<br>- La sesión se mantiene activa mientras el token sea válido. | S | Must |
| 1.3 | Como usuario, quiero recuperar mi contraseña si la olvido, para no perder acceso a mi cuenta. | - El sistema envía un enlace/código de recuperación al correo registrado.<br>- El enlace expira después de un tiempo determinado.<br>- El usuario puede establecer una nueva contraseña válida. | M | Should |

## Épica 2: Billetera virtual y métodos de pago

| # | Historia de usuario | Criterios de aceptación | Estimación | Prioridad |
|---|---|---|---|---|
| 2.1 | Como usuario, quiero tener un saldo virtual inicial al registrarme, para poder realizar apuestas simuladas. | - Todo usuario nuevo recibe un saldo virtual predefinido.<br>- El saldo es visible en el dashboard principal. | XS | Must |
| 2.2 | Como usuario, quiero gestionar métodos de pago simulados, para asociarlos a mi billetera virtual. | - El usuario puede agregar/eliminar un método de pago simulado.<br>- El sistema no procesa pagos reales (todo es simulado). | S | Should |
| 2.3 | Como usuario, quiero ver el historial de movimientos de mi billetera, para hacer seguimiento de mi saldo. | - Se listan depósitos, retiros y montos apostados con fecha.<br>- El saldo mostrado coincide con la suma de movimientos. | S | Should |

## Épica 3: Catálogo de eventos y peleadores

| # | Historia de usuario | Criterios de aceptación | Estimación | Prioridad |
|---|---|---|---|---|
| 3.1 | Como usuario, quiero consultar la cartelera de eventos UFC próximos, para saber qué peleas se aproximan. | - Se listan eventos con fecha, ubicación y peleas principales.<br>- Los datos provienen de API-Sports MMA o del dataset demo si no hay API key. | M | Must |
| 3.2 | Como usuario, quiero buscar y filtrar peleadores por nombre, categoría o país, para encontrar información específica. | - La búsqueda por nombre retorna resultados parciales coincidentes.<br>- Los filtros por categoría/país reducen la lista correctamente. | M | Must |
| 3.3 | Como usuario, quiero ver el perfil y estadísticas de un peleador, para conocer su rendimiento histórico. | - El perfil muestra récord (ganadas/perdidas), método de victoria más común y peleas recientes.<br>- Si no hay datos de API disponibles, se muestran datos del dataset histórico. | M | Must |

## Épica 4: Estadísticas y pronósticos

| # | Historia de usuario | Criterios de aceptación | Estimación | Prioridad |
|---|---|---|---|---|
| 4.1 | Como usuario, quiero ver un porcentaje de probabilidad de victoria para cada peleador antes de una pelea, para decidir mi apuesta con base en datos. | - El sistema calcula un porcentaje por peleador que suma 100% entre ambos.<br>- El cálculo se basa en el dataset histórico y/o estadísticas de la API. | L | Must |
| 4.2 | Como usuario, quiero ver los factores que influyen en el pronóstico (récord, método de victoria, racha), para entender de dónde sale el porcentaje. | - Se muestra un desglose simple de al menos 2 factores usados en el cálculo. | M | Could |

## Épica 5: Sistema de apuestas simuladas

| # | Historia de usuario | Criterios de aceptación | Estimación | Prioridad |
|---|---|---|---|---|
| 5.1 | Como usuario, quiero realizar una apuesta individual sobre el resultado de una pelea, usando mi saldo virtual. | - El usuario elige un peleador y un monto ≤ su saldo disponible.<br>- El saldo se descuenta al confirmar la apuesta.<br>- La apuesta queda registrada como "pendiente". | M | Must |
| 5.2 | Como usuario, quiero realizar apuestas combinadas sobre varias peleas de un mismo evento, para aumentar mi posible ganancia. | - El usuario puede seleccionar 2+ peleas para una apuesta combinada.<br>- El sistema calcula la cuota combinada.<br>- Si una selección pierde, la apuesta combinada se marca como perdida. | L | Should |
| 5.3 | Como usuario, quiero realizar apuestas en vivo durante un evento, para reaccionar a cómo se desarrolla la pelea. | - Las cuotas en vivo se actualizan según el estado de la pelea disponible en la API.<br>- El usuario puede apostar mientras el evento esté marcado como "en curso". | XL | Could |
| 5.4 | Como usuario, quiero consultar mi historial de apuestas, para revisar mis resultados pasados. | - Se listan apuestas con estado (ganada, perdida, pendiente), monto y fecha.<br>- El historial es filtrable por estado. | S | Must |

## Épica 6: Favoritos y notificaciones

| # | Historia de usuario | Criterios de aceptación | Estimación | Prioridad |
|---|---|---|---|---|
| 6.1 | Como usuario, quiero marcar peleadores o eventos como favoritos, para acceder rápido a ellos. | - El usuario puede agregar/quitar favoritos desde el perfil del peleador o evento.<br>- Existe una sección "Mis favoritos" con la lista guardada. | S | Should |
| 6.2 | Como usuario, quiero recibir una notificación cuando un evento favorito esté por comenzar, para no perdérmelo. | - Se genera una notificación (en app) antes del inicio del evento marcado como favorito. | M | Could |

## Épica 7: Panel administrativo

| # | Historia de usuario | Criterios de aceptación | Estimación | Prioridad |
|---|---|---|---|---|
| 7.1 | Como administrador, quiero sincronizar manualmente la información desde la API externa, para mantener los datos actualizados. | - Existe un endpoint/botón admin que dispara la sincronización.<br>- Se muestra confirmación de éxito o error de la sincronización. | M | Should |
| 7.2 | Como administrador, quiero ver un resumen general del sistema (usuarios, apuestas activas, eventos cargados), para monitorear el estado de la plataforma. | - El resumen muestra al menos 3 métricas clave del sistema.<br>- Solo accesible con rol "Administrador". | M | Should |

---

## Resumen de priorización (MoSCoW)

- **Must have (Sprint 1):** 1.1, 1.2, 3.1, 3.2, 3.3, 4.1, 5.1, 5.4
- **Should have (Sprint 2):** 1.3, 2.2, 2.3, 5.2, 6.1, 7.1, 7.2
- **Could have (si sobra tiempo):** 4.2, 5.3, 6.2
- **Won't have (fuera de alcance del MVP):** pagos reales, apuestas con dinero real

## Notas para las ceremonias

- **Sprint 1** debería enfocarse en autenticación + catálogo + pronóstico básico + apuesta individual: es el flujo mínimo para hacer una demo end-to-end.
- **Sprint 2** suma billetera completa, favoritos y el panel admin.
- Para la **evidencia de cambio de requisito re-estimado**: una candidata natural es la historia 5.3 (apuestas en vivo) — es XL y de baja prioridad, así que si en el sprint review deciden bajarla de alcance o posponerla, eso ya es un cambio de requisito documentable con su re-estimación.
