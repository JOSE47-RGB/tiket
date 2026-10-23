-- Solo DESPUÉS de desplegar la versión anterior del backend.
-- Elimina exclusivamente el indicador del tutorial, no usuarios ni boletos.
ALTER TABLE usuarios DROP COLUMN tutorial_visto;
-- Prisma no admite migrate down: ver docs/DESPLIEGUE_UX.md antes de usar.
