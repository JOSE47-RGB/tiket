CREATE TABLE configuracion_tarifa (
 id INT PRIMARY KEY,
 precio DECIMAL(10,2) NOT NULL,
 CHECK (precio >= 0)
) ENGINE=InnoDB;
