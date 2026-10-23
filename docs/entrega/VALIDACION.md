# Validación de los entregables 12 al 17

Cierre documental: 21 de octubre de 2026. Evidencias obtenidas el 20 de octubre, hora de Guatemala.
Versión base: e6385c8, con las correcciones locales incluidas en esta entrega. No se ha creado un nuevo commit ni realizado push.

## Resultado comprobado

- Backend y frontend compilan.
- Cinco migraciones se aplicaron en una MariaDB 10.11.16 nueva y aislada.
- Veinte escenarios de integración y cinco pruebas unitarias aprobados. TAP reporta 26 porque incluye el contenedor de integración. Cero fallos y cero omisiones.
- Venta realizada desde la interfaz: bus TM-001, asiento 1, Centra Sur a Plaza Barrios, efectivo, Q1.00; pasajero ficticio.
- Restauración de 32 tablas (31 de aplicación y `_prisma_migrations`), con checksums idénticos.
- Carga puntual con una sesión: 20 solicitudes concurrentes a cada endpoint, 40 respuestas correctas. P95: panel 52.36 ms y asientos 171.77 ms. No representa una prueba sostenida con usuarios reales.

## Defectos corregidos

1. Programar un recorrido rechazaba una asignación válida: el entero de una consulta SQL sin modelo puede llegar como BigInt. Se normaliza a Number antes de compararlo con el DTO.
2. Cambiar la capacidad fallaba en una base con charset latin1 al registrar una flecha Unicode en la bitácora. La descripción ahora usa texto compatible. Las instalaciones nuevas deben crearse con utf8mb4.
3. El seed de demostración no vinculaba piloto con bus ni fijaba horas; ahora crea la asignación y un horario de 12:00 a 14:00 de Guatemala.

## Repetir las pruebas

Requisitos: Node.js 22, MariaDB 10.11, dependencias instaladas, una cuenta autorizada para crear y migrar una base EXCLUSIVA de ensayos. Nunca usar transmetro_db para integración.

1. Crear una base nueva llamada `transmetro_test`, con CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci.
2. Desde backend, definir DATABASE_URL y TEST_DATABASE_URL con la conexión de esa base. Mantener contraseñas fuera del repositorio y del historial compartido.
3. Ejecutar `npm run db:generate`, `npm run db:migrate`, `npm run build` y `npm test`.
4. Desde frontend, ejecutar `npm run build`.
5. Guardar la salida TAP. El nombre de la base debe terminar en `_test`. Los ensayos generan datos ficticios que permanecen en la base de pruebas.
6. Para una demo limpia, usar otra base vacía, aplicar migraciones y ejecutar `node scripts/seed.cjs --demo` con ADMIN_USERNAME y ADMIN_PASSWORD propios. El seed omite datos demo si ya existen líneas.

Para repetir restauración: generar un dump con `mariadb-dump --single-transaction`, importarlo en otra base vacía y comparar `CHECKSUM TABLE ... EXTENDED` de cada tabla. No distribuir respaldos que contengan cuentas o datos privados.

## Alcance pendiente de intervención humana

- Probar con cinco usuarios nuevos y registrar si completan diez tareas sin ayuda; objetivo ≥90 %. Una prueba realizada por el desarrollador no sustituye esa evaluación.
- Responsable del proyecto: revisar evidencia y firmar la carta de aceptación.
- Si se exige publicación: validar Docker/Railway y la instalación en otra computadora. La ejecución aislada en este equipo no acredita esos entornos.

Los archivos de evidencias contienen resultados reales. No incluyen contraseñas, cookies, tokens ni respaldos de la base operativa. Los documentos y la presentación se encuentran en el paquete de entrega final fuera del repositorio de la aplicación.
