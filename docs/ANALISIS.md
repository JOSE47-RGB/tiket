# Análisis del proyecto — 22 de octubre de 2026

## Arquitectura y ejecución
TypeScript; backend NestJS 11, Prisma 6, MariaDB 10.11, JWT y bcrypt; frontend React 19, Vite 7, Tailwind 4 y CSS propio. `backend/src` contiene autenticación, operaciones y catálogos; `backend/prisma` modelo y migraciones; `backend/test` integración y unidades; `frontend/src` pantallas y API; `scripts` arranque/configuración; `docs` documentación. Docker separa backend y Nginx/frontend. El usuario informa publicación Railway con despliegue desde main; no se ha inspeccionado su configuración privada ni se probará su base.

Local: Node 22 y MariaDB 10.11; `npm run install:all`, configurar variables privadas desde `backend/.env.example`, crear una base de desarrollo vacía, `npm run db:generate --prefix backend`, `npm run db:migrate --prefix backend`, `npm run build`, `npm run seed`, `npm run start:local`. Sitio 5187 y API 3107: configurar PORT=3107. La cuenta migradora necesita DDL; la cuenta de ejecución SELECT/INSERT/UPDATE. Nunca importar SQL ni ejecutar pruebas sobre producción. Integración requiere TEST_DATABASE_URL apuntando a una base terminada en `_test`; sin ella se omite. Las dependencias locales existen; se preparará una MariaDB aislada para validar.

## Personas y permisos
Administrador: cuentas, catálogos, tarifa y operación completa. Supervisor: flota, rutas, pilotos, horarios, iniciar/cancelar/finalizar recorridos y venta. Operador: boletos y visitas, limitados por asignación vigente a estaciones. Financiero: recargas, pagos y devoluciones. Seguridad: guardias/accesos y alertas. Piloto: consulta de sus recorridos/asientos, sin vender ni cerrar viajes. El backend verifica permisos; ocultar botones no sustituye esa validación.

## Pantallas y flujos
Inicio → rutas/estaciones → buses y pilotos → programar recorrido → venta: elegir viaje, asiento, pasajero, origen/destino y pago → emitir o reservar → confirmar/cancelar reserva → registrar visitas y finalizar viaje. Reportes permite buscar/exportar boletos y movimientos según rol. Cuentas de acceso gestiona usuarios; tarifa/recargas gestiona saldo. Son boletos de viaje, no tickets de soporte: no hay comentarios ni asignación de incidencias. Asignar significa vincular piloto/bus/ruta; no se añadirá un flujo de soporte ajeno al negocio.

## Sesión y primer acceso
POST auth/login verifica bcrypt, actualiza ultimo_acceso y emite JWT de 8 horas en cookie HttpOnly, con cookie CSRF para cambios. GET auth/me devuelve usuario y roles desde MariaDB; React los conserva en memoria y los recupera al recargar. No existe indicador de tutorial; ultimo_acceso no distingue una explicación completada. Se añadirá tutorial_visto por usuario, actualizado solo para la cuenta autenticada al completar u omitir.

## Prioridades y hallazgos
1. Alto: tutorial persistente, accesible y adaptado al rol; salida de sesión visible en móvil (actualmente profile se oculta).
2. Alto: errores de red/servidor comprensibles; confirmar cancelación/finalización; formularios sin dobles envíos.
3. Alto: venta guiada con pasos, destinos posteriores al origen y tarjeta solo cuando corresponde. Mantener cobro interno; no simular procesamiento bancario.
4. Medio: estados cotidianos, inicio con pendientes y acciones según rol, vacíos orientados a acción, búsqueda visible.
5. Medio: evitar petición duplicada de usuarios y consultas de listas no necesarias; impedir respuestas tardías de otras cuentas.
6. Medio: contraste, foco, etiquetas, diálogo accesible y tamaños táctiles conservando #103d32.
7. Posterior: separar main.tsx (actualmente concentra múltiples pantallas), paginación real de reportes (límite 1.000), pruebas de usabilidad con personas y auditoría de accesibilidad completa.

Se preservan correcciones locales previas de asignación de piloto/capacidad y sus pruebas. La documentación anterior afirma Railway pendiente: es información histórica; la publicación actual fue comunicada por el usuario. No hay mediciones actuales que sustenten promesas de rendimiento.
