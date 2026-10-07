ALTER TABLE recorridos
  ADD COLUMN salida_programada DATETIME(0) NULL,
  ADD COLUMN llegada_estimada DATETIME(0) NULL;
CREATE INDEX idx_recorrido_salida ON recorridos(salida_programada);
