-- Cuentas existentes y nuevas reciben el recorrido guiado una vez.
ALTER TABLE usuarios ADD COLUMN tutorial_visto BOOLEAN NOT NULL DEFAULT FALSE;
