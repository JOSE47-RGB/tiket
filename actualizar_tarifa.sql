USE transmetro_db;
CREATE TABLE IF NOT EXISTS configuracion_tarifa (
 id INT PRIMARY KEY,
 precio DECIMAL(10,2) NOT NULL,
 CHECK (precio >= 0)
) ENGINE=InnoDB;
