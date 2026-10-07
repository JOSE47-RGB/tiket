-- 1. MUNICIPALIDADES
CREATE TABLE municipalidades (
    id_municipalidad INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR (150),
    telefono VARCHAR(20),
    estado TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
-- 2. LINEAS
CREATE TABLE lineas (
    id_linea INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200),
    estado TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
-- 3. ESTACIONES
CREATE TABLE estaciones (
    id_estacion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    capacidad_maxima INT UNSIGNED,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
-- 4. RELACION MUNICIPALIDAD - LINEA
CREATE TABLE municipalidad_linea (
    id_municipalidad INT UNSIGNED NOT NULL,
    id_linea INT UNSIGNED NOT NULL,
    PRIMARY KEY (id_municipalidad, id_linea),
    CONSTRAINT fk_municipalidad_linea_municipalidad
        FOREIGN KEY (id_municipalidad)
        REFERENCES municipalidades(id_municipalidad)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_municipalidad_linea_linea
        FOREIGN KEY (id_linea)
        REFERENCES lineas(id_linea)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
-- 5. RELACION LINEA - ESTACION
CREATE TABLE linea_estacion (
    id_linea INT UNSIGNED NOT NULL,
    id_estacion INT UNSIGNED NOT NULL,
    orden INT UNSIGNED NOT NULL,
    distancia_anterior_km DECIMAL(8,2),
    PRIMARY KEY (id_linea, id_estacion),
    UNIQUE KEY uk_linea_orden (id_linea, orden),
    CONSTRAINT fk_linea_estacion_linea
        FOREIGN KEY (id_linea)
        REFERENCES lineas(id_linea)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_linea_estacion_estacion
        FOREIGN KEY (id_estacion)
        REFERENCES estaciones(id_estacion)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
-- 6. ACCESOS
CREATE TABLE accesos (
    id_acceso INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_estacion INT UNSIGNED NOT NULL,
    nombre VARCHAR(100),
    descripcion VARCHAR(150),
    estado TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_acceso_estacion
        FOREIGN KEY (id_estacion)
        REFERENCES estaciones(id_estacion)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
-- 7. GUARDIAS
CREATE TABLE guardias (
    id_guardia INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    estado TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;
-- 8. ASIGNACION GUARDIA - ACCESO
CREATE TABLE guardia_acceso (
    id_asignacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_guardia INT UNSIGNED NOT NULL,
    id_acceso INT UNSIGNED NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    turno VARCHAR(30),
    CONSTRAINT fk_guardia_acceso_guardia
        FOREIGN KEY (id_guardia)
        REFERENCES guardias(id_guardia)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_guardia_acceso_acceso
        FOREIGN KEY (id_acceso)
        REFERENCES accesos(id_acceso)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
-- 9. PARQUEOS
CREATE TABLE parqueos (
    id_parqueo INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(150),
    capacidad INT UNSIGNED,
    estado TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;
-- 10. BUSES
CREATE TABLE buses (
    id_bus INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    placa VARCHAR(20) NOT NULL UNIQUE,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    capacidad_maxima INT UNSIGNED NOT NULL,
    estado ENUM(
        'ACTIVO',
        'INACTIVO',
        'MANTENIMIENTO',
        'FUERA_SERVICIO'
    ) NOT NULL DEFAULT 'ACTIVO'
) ENGINE=InnoDB;

-- 11. HISTORIAL BUS - LINEA
CREATE TABLE bus_linea_historial (
    id_asignacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_bus INT UNSIGNED NOT NULL,
    id_linea INT UNSIGNED NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    INDEX idx_bus_linea_bus (id_bus),
    INDEX idx_bus_linea_linea (id_linea),
    CONSTRAINT fk_bus_linea_bus
        FOREIGN KEY (id_bus)
        REFERENCES buses(id_bus)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_bus_linea_linea
        FOREIGN KEY (id_linea)
        REFERENCES lineas(id_linea)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
-- 12. HISTORIAL BUS - PARQUEO
CREATE TABLE bus_parqueo_historial (
    id_asignacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_bus INT UNSIGNED NOT NULL,
    id_parqueo INT UNSIGNED NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    INDEX idx_bus_parqueo_bus (id_bus),
    INDEX idx_bus_parqueo_parqueo (id_parqueo),
    CONSTRAINT fk_bus_parqueo_bus
        FOREIGN KEY (id_bus)
        REFERENCES buses(id_bus)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_bus_parqueo_parqueo
        FOREIGN KEY (id_parqueo)
        REFERENCES parqueos(id_parqueo)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
-- 13. ASIENTOS
CREATE TABLE asientos (
    id_asiento INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_bus INT UNSIGNED NOT NULL,
    numero_asiento VARCHAR(10) NOT NULL,
    estado_operativo ENUM(
        'HABILITADO',
        'FUERA_SERVICIO'
    ) NOT NULL DEFAULT 'HABILITADO',
    UNIQUE KEY uk_bus_asiento (id_bus, numero_asiento),
    CONSTRAINT fk_asiento_bus
        FOREIGN KEY (id_bus)
        REFERENCES buses(id_bus)
        ON UPDATE RESTRICT
        ON DELETE CASCADE
) ENGINE=InnoDB;
-- 14. PILOTOS
CREATE TABLE pilotos (
    id_piloto INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    dpi VARCHAR(20) UNIQUE,
    residencia VARCHAR(150),
    telefono VARCHAR(20),
    correo VARCHAR(120),
    estado TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;
-- 15. FORMACION DEL PILOTO
CREATE TABLE piloto_formacion (
    id_formacion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_piloto INT UNSIGNED NOT NULL,
    nivel VARCHAR(50),
    institucion VARCHAR(150),
    titulo VARCHAR(150),
    fecha_finalizacion DATE,
    CONSTRAINT fk_formacion_piloto
        FOREIGN KEY (id_piloto)
        REFERENCES pilotos(id_piloto)
        ON UPDATE RESTRICT
        ON DELETE CASCADE
) ENGINE=InnoDB;
-- 16. USUARIOS
CREATE TABLE usuarios (
    id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombres VARCHAR(100),
    apellidos VARCHAR(100),
    estado TINYINT(1) NOT NULL DEFAULT 1,
    ultimo_acceso DATETIME NULL
) ENGINE=InnoDB;
-- 17. ROLES
CREATE TABLE roles (
    id_rol INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150)
) ENGINE=InnoDB;
-- 18. USUARIO - ROL
CREATE TABLE usuario_rol (
    id_usuario INT UNSIGNED NOT NULL,
    id_rol INT UNSIGNED NOT NULL,

    PRIMARY KEY (id_usuario, id_rol),
    CONSTRAINT fk_usuario_rol_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,
    CONSTRAINT fk_usuario_rol_rol
        FOREIGN KEY (id_rol)
        REFERENCES roles(id_rol)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
-- 19. OPERADOR - ESTACION
CREATE TABLE operador_estacion (
    id_asignacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT UNSIGNED NOT NULL,
    id_estacion INT UNSIGNED NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,

    CONSTRAINT fk_operador_estacion_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_operador_estacion_estacion
        FOREIGN KEY (id_estacion)
        REFERENCES estaciones(id_estacion)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
-- 20. RECORRIDOS
CREATE TABLE recorridos (
    id_recorrido BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_linea INT UNSIGNED NOT NULL,
    id_bus INT UNSIGNED NOT NULL,
    id_piloto INT UNSIGNED NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME,
    estado ENUM(
        'PROGRAMADO',
        'EN_CURSO',
        'FINALIZADO',
        'CANCELADO'
    ) NOT NULL DEFAULT 'PROGRAMADO',
    INDEX idx_recorrido_fecha (fecha),
    INDEX idx_recorrido_bus (id_bus),
    CONSTRAINT fk_recorrido_linea
        FOREIGN KEY (id_linea)
        REFERENCES lineas(id_linea)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_recorrido_bus
        FOREIGN KEY (id_bus)
        REFERENCES buses(id_bus)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_recorrido_piloto
        FOREIGN KEY (id_piloto)
        REFERENCES pilotos(id_piloto)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
-- 21. RECORRIDO - ESTACION
CREATE TABLE recorrido_estacion (
    id_recorrido_estacion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_recorrido BIGINT UNSIGNED NOT NULL,
    id_estacion INT UNSIGNED NOT NULL,
    orden INT UNSIGNED NOT NULL,
    hora_llegada DATETIME NULL,
    hora_salida DATETIME NULL,
    UNIQUE KEY uk_recorrido_estacion (id_recorrido, id_estacion),
    UNIQUE KEY uk_recorrido_orden (id_recorrido, orden),
    CONSTRAINT fk_recorrido_estacion_recorrido
        FOREIGN KEY (id_recorrido)
        REFERENCES recorridos(id_recorrido)
        ON UPDATE RESTRICT
        ON DELETE CASCADE,
    CONSTRAINT fk_recorrido_estacion_estacion
        FOREIGN KEY (id_estacion)
        REFERENCES estaciones(id_estacion)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
-- 22. METODOS DE PAGO
CREATE TABLE metodos_pago (
    id_metodo_pago INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150),
    estado TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;
-- 23. TARJETAS
CREATE TABLE tarjetas (
    id_tarjeta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero_tarjeta VARCHAR(50) NOT NULL UNIQUE,
    saldo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado ENUM(
        'ACTIVA',
        'BLOQUEADA',
        'INACTIVA'
    ) NOT NULL DEFAULT 'ACTIVA',
    CHECK (saldo >= 0)
) ENGINE=InnoDB;
-- 24. TICKETS
CREATE TABLE tickets (
    id_ticket BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero_ticket VARCHAR(50) NOT NULL UNIQUE,
    id_recorrido BIGINT UNSIGNED NOT NULL,
    id_asiento INT UNSIGNED NOT NULL,
    id_operador INT UNSIGNED NOT NULL,
    id_estacion_ingreso INT UNSIGNED NOT NULL,
    id_estacion_destino INT UNSIGNED NOT NULL,
    fecha_hora_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    precio DECIMAL(10,2) NOT NULL,
    codigo_validacion VARCHAR(100) UNIQUE,

    estado ENUM(
        'RESERVADO',
        'EMITIDO',
        'CANCELADO',
        'FINALIZADO'
    ) NOT NULL DEFAULT 'EMITIDO',
    INDEX idx_ticket_recorrido (id_recorrido),
    INDEX idx_ticket_asiento (id_asiento),
    INDEX idx_ticket_operador (id_operador),
    CONSTRAINT fk_ticket_recorrido
        FOREIGN KEY (id_recorrido)
        REFERENCES recorridos(id_recorrido)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_ticket_asiento
        FOREIGN KEY (id_asiento)
        REFERENCES asientos(id_asiento)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_ticket_operador
        FOREIGN KEY (id_operador)
        REFERENCES usuarios(id_usuario)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_ticket_estacion_ingreso
        FOREIGN KEY (id_estacion_ingreso)
        REFERENCES estaciones(id_estacion)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_ticket_estacion_destino
        FOREIGN KEY (id_estacion_destino)
        REFERENCES estaciones(id_estacion)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CHECK (precio >= 0),
    CHECK (id_estacion_ingreso <> id_estacion_destino)
) ENGINE=InnoDB;
-- 25. RECARGAS
CREATE TABLE recargas (
    id_recarga BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_tarjeta BIGINT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    id_metodo_pago INT UNSIGNED NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'APLICADA',
    CHECK (monto > 0),
    CONSTRAINT fk_recarga_tarjeta
        FOREIGN KEY (id_tarjeta)
        REFERENCES tarjetas(id_tarjeta)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_recarga_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_recarga_metodo_pago
        FOREIGN KEY (id_metodo_pago)
        REFERENCES metodos_pago(id_metodo_pago)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
-- 26. PAGOS
CREATE TABLE pagos (
    id_pago BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_ticket BIGINT UNSIGNED NOT NULL,
    id_metodo_pago INT UNSIGNED NOT NULL,
    id_tarjeta BIGINT UNSIGNED NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'APROBADO',
    CHECK (monto >= 0),
    CONSTRAINT fk_pago_ticket
        FOREIGN KEY (id_ticket)
        REFERENCES tickets(id_ticket)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,

    CONSTRAINT fk_pago_metodo_pago
        FOREIGN KEY (id_metodo_pago)
        REFERENCES metodos_pago(id_metodo_pago)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_pago_tarjeta
        FOREIGN KEY (id_tarjeta)
        REFERENCES tarjetas(id_tarjeta)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
-- 27. ALERTAS
CREATE TABLE alertas (
    id_alerta BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_bus INT UNSIGNED NULL,
    id_estacion INT UNSIGNED NULL,
    tipo VARCHAR(50) NOT NULL,
    descripcion VARCHAR(200),
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT fk_alerta_bus
        FOREIGN KEY (id_bus)
        REFERENCES buses(id_bus)
        ON UPDATE RESTRICT
        ON DELETE SET NULL,
    CONSTRAINT fk_alerta_estacion
        FOREIGN KEY (id_estacion)
        REFERENCES estaciones(id_estacion)
        ON UPDATE RESTRICT
        ON DELETE SET NULL
) ENGINE=InnoDB;
              -- 28. BITACORA
CREATE TABLE bitacora (
    id_bitacora BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT UNSIGNED NOT NULL,
    accion VARCHAR(100) NOT NULL,
    tabla_afectada VARCHAR(50),
    registro_id BIGINT UNSIGNED,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    detalle TEXT,
    INDEX idx_bitacora_usuario (id_usuario),
    INDEX idx_bitacora_fecha (fecha_hora),
    CONSTRAINT fk_bitacora_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB;
