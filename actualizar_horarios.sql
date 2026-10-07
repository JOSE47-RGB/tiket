USE transmetro_db;
ALTER TABLE recorridos
  ADD COLUMN IF NOT EXISTS salida_programada DATETIME(0) NULL,
  ADD COLUMN IF NOT EXISTS llegada_estimada DATETIME(0) NULL;
CREATE INDEX IF NOT EXISTS idx_recorrido_salida ON recorridos(salida_programada);
