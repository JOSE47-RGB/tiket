# Revisión y despliegue del tutorial

## Qué cambia
Se añade `usuarios.tutorial_visto BOOLEAN NOT NULL DEFAULT FALSE`. Las cuentas existentes y nuevas ven la guía la próxima vez que entren. Completar, omitir o Escape la marca como vista para el usuario autenticado; volver a verla no borra esa marca. No se alteran boletos, pagos, contraseñas, roles ni asignaciones. La API requiere sesión y CSRF; no acepta un identificador de otra cuenta.

Sin conexión se intenta guardar `transmetro-tour:<id_usuario>=pending` en localStorage (no contiene credenciales). Se informa del fallo; al siguiente inicio se reintenta sincronizar. Si el navegador bloquea el almacenamiento, no se puede garantizar la persistencia sin conexión. Entre dispositivos la garantía depende del guardado correcto en MariaDB.

No hay variables nuevas de producción. Solo pruebas: TEST_DATABASE_URL y TEST_UI_PASSWORD. La guía usa React sin bibliotecas adicionales; Playwright es una dependencia exclusiva de desarrollo para probar el navegador.

## Antes de integrar
1. Revisar PR y capturas. No desplegar esta rama sobre la base operativa como una vista previa: usar una base independiente.
2. Confirmar en Railway que la rama de producción es main y que las vistas previas no comparten variables/base de producción. Esta configuración privada no se ha inspeccionado.
3. Guardar un respaldo de MariaDB y verificar que puede restaurarse en otra base. Identificar versión anterior de backend y frontend para volver atrás.
4. Verificar que las cinco migraciones anteriores ya constan en `_prisma_migrations`. Si la instalación fue manual, comparar su estructura y establecer la línea base con el responsable; no ejecutar las migraciones iniciales a ciegas.

## Orden de publicación (lo ejecuta el responsable)
1. Construir la versión revisada (`npm ci`, `npx prisma generate`, `npm run build` dentro de backend; instalación/compilación equivalente en frontend).
2. En el contexto del servicio backend y con la conexión migradora correcta, ejecutar `npx prisma migrate deploy`. La cuenta debe poder ALTER TABLE; no dar ese permiso a la cuenta normal de aplicación. Esta migración añade una columna con valor por defecto; puede bloquear brevemente la tabla según tamaño/configuración, por lo que conviene una ventana de baja actividad.
3. Desplegar backend, verificar `/api/health` y `auth/me`, y después frontend. El script Docker `backend/scripts/start.sh` ya ejecuta migrate deploy al iniciar: si se usa, evitar un segundo mecanismo concurrente de migración. No activar SEED_DEMO en producción.
4. Entrar con una cuenta de prueba autorizada, omitir la guía, cerrar sesión y volver a entrar; repetir manualmente desde Ayuda. Comprobar venta solo con datos/operaciones autorizados, sin introducir pruebas ficticias en producción.
5. El merge lo realiza el propietario, porque dispara Railway. Esta tarea no hace merge ni modifica la configuración de Railway.

## Volver atrás
La reversión preferida es redeplegar backend y frontend anteriores **conservando la columna nueva**. El código anterior la ignora y se conservan tanto los datos operativos como la preferencia del tutorial. No restaurar un respaldo sobre ventas nuevas: perdería actividad posterior.

Para eliminar también el esquema, primero volver al código anterior y verificar que ninguna instancia nueva consulta la columna. `docs/sql/revertir_tutorial.sql` contiene el ALTER inverso; elimina las preferencias, no los usuarios. Incorporarlo como una NUEVA migración de reversión revisada y desplegarla con Prisma, conservando el historial. No editar ni borrar a mano `_prisma_migrations`, ni esperar que Prisma vuelva a aplicar una migración ya registrada. Si se reactiva el tutorial después de eliminar la columna, crear una nueva migración ADD y los usuarios volverán a verla.

## Pruebas locales reproducibles
Requisitos: Node 22, MariaDB 10.11 local, base vacía terminada en `_test`. Usar credenciales exclusivas de prueba. Nunca copiar variables de Railway.

```bash
npm run install:all
npm run db:generate --prefix backend
npm run build
# Exportar TEST_DATABASE_URL con una base local exclusiva terminada en _test.
# Para integración, aplicar migraciones con DATABASE_URL apuntando a ESA base.
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate --prefix backend
npm test
# Para navegador, usar otra base _test vacía y generar una clave efímera.
export TEST_UI_PASSWORD="$(node -e 'process.stdout.write(require("crypto").randomBytes(24).toString("hex"))')"
node scripts/prepare-ui-test.cjs
cd frontend
npx playwright install chromium
npm run test:e2e
```

El preparador se niega a usar un host distinto de localhost/127.0.0.1 o una base sin sufijo `_test`. Crea seis cuentas `ux_*` de prueba; no muestra contraseñas. Los puertos 3149 y 5199 deben estar libres. La suite inicia y detiene sus servidores. Para repetir una venta, usar una base nueva porque las pruebas conservan los boletos que emiten.
