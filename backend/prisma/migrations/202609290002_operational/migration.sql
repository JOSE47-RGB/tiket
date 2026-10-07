-- Extensiones explícitas a las 28 tablas del documento.
CREATE TABLE pasajeros (
 id_pasajero INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nombres VARCHAR(150) NOT NULL,
 documento VARCHAR(30) NULL,
 telefono VARCHAR(20) NULL
) ENGINE=InnoDB;
ALTER TABLE tickets ADD id_pasajero INT UNSIGNED NOT NULL,
 ADD reservado_hasta DATETIME NULL,
 ADD CONSTRAINT fk_ticket_pasajero FOREIGN KEY (id_pasajero) REFERENCES pasajeros(id_pasajero),
 ADD asiento_activo INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado IN ('RESERVADO','EMITIDO') THEN id_asiento ELSE NULL END) STORED,
 ADD UNIQUE KEY uk_ticket_asiento_activo (id_recorrido, asiento_activo);
ALTER TABLE bus_linea_historial ADD bus_actual INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN fecha_fin IS NULL THEN id_bus ELSE NULL END) STORED,
 ADD UNIQUE KEY uk_bus_linea_actual (bus_actual);
ALTER TABLE bus_parqueo_historial ADD bus_actual INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN fecha_fin IS NULL THEN id_bus ELSE NULL END) STORED,
 ADD UNIQUE KEY uk_bus_parqueo_actual (bus_actual);
ALTER TABLE recorridos ADD bus_en_curso INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado = 'EN_CURSO' THEN id_bus ELSE NULL END) STORED,
 ADD UNIQUE KEY uk_bus_en_curso (bus_en_curso),
 ADD piloto_en_curso INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado = 'EN_CURSO' THEN id_piloto ELSE NULL END) STORED,
 ADD UNIQUE KEY uk_piloto_en_curso (piloto_en_curso);
ALTER TABLE estaciones ADD pasajeros_esperando INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD id_piloto INT UNSIGNED NULL UNIQUE,
 ADD CONSTRAINT fk_usuario_piloto FOREIGN KEY (id_piloto) REFERENCES pilotos(id_piloto);
ALTER TABLE pagos ADD UNIQUE KEY uk_pago_ticket (id_ticket);
