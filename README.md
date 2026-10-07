# Transmetro

Sistema de control de transporte basado en el documento ENTREGa_NO 5. Backend NestJS y TypeScript, frontend React con Vite y Tailwind, Prisma y MariaDB 10.11.

## Instalación local

La estructura `transmetro_db` ya fue importada en el servidor local que administra phpMyAdmin (`localhost:3306`). Contiene 29 tablas: las 28 del documento y pasajeros. La conexión de la aplicación se configura en `backend/.env`.

El archivo `conexion_local.sql` prepara una cuenta dedicada con permisos SELECT, INSERT y UPDATE únicamente sobre `transmetro_db`. En el entorno local de desarrollo, la cuenta y sus permisos ya fueron configurados. En otra instalación, un administrador debe crear una cuenta propia y conceder los permisos necesarios. Contiene una contraseña generada: no compartirlo ni publicarlo. El archivo `.env` debe permanecer privado.

Después de configurar esa cuenta:

```bash
npm run install:all
npm run build
npm run seed
npm run start:local
```

Si las dependencias ya están instaladas, omitir `install:all`. Abrir http://127.0.0.1:5187. El administrador inicial se toma de `ADMIN_USERNAME` y `ADMIN_PASSWORD` en `backend/.env`. El seed conserva cualquier usuario existente y, sin `--demo`, no introduce rutas, buses ni pasajeros ficticios.

phpMyAdmin: http://localhost/phpMyAdmin/index.php?route=/database/structure&db=transmetro_db

## Primera configuración operativa

1. Registrar municipalidades, estaciones, parqueos, pilotos y guardias en Catálogos.
2. Crear una línea inactiva y relacionar sus estaciones con el orden y las distancias.
3. Agregar buses desde Flota, con una línea y un parqueo obligatorios. Sus asientos se generan según la capacidad.
4. Activar la línea cuando tenga entre uno y dos buses por estación.
5. Crear usuarios y asignar los operadores a estaciones; registrar los métodos de pago y los pasajeros.
6. Programar un recorrido y abrir Control de abordaje para seleccionar asientos y emitir tickets.

La tarifa, la duración de reserva y la espera por baja ocupación se configuran mediante `TICKET_PRICE`, `RESERVATION_MINUTES` y `LOW_OCCUPANCY_WAIT_MINUTES`. Los valores iniciales son Q1.00, 5 minutos y 5 minutos; deben confirmarse para la operación real. Los asientos se refrescan cada 5 segundos. Los pagos son registros internos: no hay integración con un proveedor bancario. No incluye GPS ni mapas, conforme al documento.

## Base de datos

`transmetro_instalacion.sql` es para una base NUEVA. No volver a importarlo sobre la base existente. Las migraciones SQL están en `backend/prisma/migrations`. Antes de usar Prisma Migrate sobre la instalación manual, un administrador debe registrar las migraciones existentes con `prisma migrate resolve --applied` para cada migración que ya esté aplicada. La cuenta de ejecución de la aplicación no tiene permisos de cambio de estructura.

Las columnas generadas e índices únicos protegen los asientos y las asignaciones activas. No usar `prisma db push` para sustituir las migraciones SQL, pues no representa íntegramente las columnas calculadas. La base aislada del puerto 33317 utilizada durante el desarrollo es diferente de la instalación local del puerto 3306.

## Verificación

Backend y frontend se compilan con `npm run build`. La suite de integración necesita una base separada cuyo nombre termine en `_test`, con las migraciones aplicadas:

```bash
TEST_DATABASE_URL='mysql://usuario:clave@127.0.0.1:3306/transmetro_test' npm test
```

Prueba autenticación, CSRF, roles, asignaciones, doble venta concurrente, cobros y reembolsos, reservas, aforo, recorridos, guardias y bitácora. Sin TEST_DATABASE_URL la suite se omite. Nunca apuntarla a la base operativa.

## Docker

`node scripts/configure.cjs` genera la configuración para `docker compose up --build -d`. Ese despliegue crea su propia MariaDB en un volumen Docker, independiente de la instalación local. Incluye Nginx, phpMyAdmin y un respaldo diario con retención de 14 días. El despliegue completo en contenedores todavía no se ha verificado en este equipo.

## Publicación del código

El repositorio contiene el código y las migraciones; no incluye la base de datos local ni las credenciales. Copiar `backend/.env.example` a `backend/.env` y configurar valores privados al instalar en otro equipo. No publicar `.env`, `ACCESO_LOCAL.md`, `conexion_local.sql` ni respaldos.

La instalación SQL inicial debe complementarse con `actualizar_horarios.sql` si se utiliza la importación manual. Para una base nueva administrada por Prisma, aplicar todas las migraciones en orden.

El despliegue en Railway está pendiente de configuración y validación. Subir el repositorio a GitHub no publica automáticamente la aplicación ni copia los datos de MariaDB.
