export const catalogMeta: Record<string, any> = {
  "municipalidades": {
    "label": "Municipalidades",
    "keys": [
      "id_municipalidad"
    ],
    "fields": [
      {
        "name": "nombre",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 100,
        "ref": null
      },
      {
        "name": "direccion",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      },
      {
        "name": "telefono",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 20,
        "ref": null
      },
      {
        "name": "estado",
        "type": "TINYINT",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR"
    ]
  },
  "lineas": {
    "label": "Líneas",
    "keys": [
      "id_linea"
    ],
    "fields": [
      {
        "name": "codigo",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 20,
        "ref": null
      },
      {
        "name": "nombre",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 100,
        "ref": null
      },
      {
        "name": "descripcion",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 200,
        "ref": null
      },
      {
        "name": "estado",
        "type": "TINYINT",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR"
    ]
  },
  "estaciones": {
    "label": "Estaciones",
    "keys": [
      "id_estacion"
    ],
    "fields": [
      {
        "name": "codigo",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 20,
        "ref": null
      },
      {
        "name": "nombre",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 100,
        "ref": null
      },
      {
        "name": "capacidad_maxima",
        "type": "INT",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      },
      {
        "name": "estado",
        "type": "TINYINT",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR"
    ]
  },
  "municipalidad_linea": {
    "label": "Municipios por línea",
    "keys": [
      "id_municipalidad",
      "id_linea"
    ],
    "fields": [
      {
        "name": "id_municipalidad",
        "type": "INT",
        "required": true,
        "options": null,
        "max": null,
        "ref": "municipalidades"
      },
      {
        "name": "id_linea",
        "type": "INT",
        "required": true,
        "options": null,
        "max": null,
        "ref": "lineas"
      }
    ],
    "roles": [
      "ADMINISTRADOR"
    ]
  },
  "linea_estacion": {
    "label": "Estaciones por línea",
    "keys": [
      "id_linea",
      "id_estacion"
    ],
    "fields": [
      {
        "name": "id_linea",
        "type": "INT",
        "required": true,
        "options": null,
        "max": null,
        "ref": "lineas"
      },
      {
        "name": "id_estacion",
        "type": "INT",
        "required": true,
        "options": null,
        "max": null,
        "ref": "estaciones"
      },
      {
        "name": "orden",
        "type": "INT",
        "required": true,
        "options": null,
        "max": null,
        "ref": null
      },
      {
        "name": "distancia_anterior_km",
        "type": "DECIMAL",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR"
    ]
  },
  "accesos": {
    "label": "Accesos",
    "keys": [
      "id_acceso"
    ],
    "fields": [
      {
        "name": "id_estacion",
        "type": "INT",
        "required": true,
        "options": null,
        "max": null,
        "ref": "estaciones"
      },
      {
        "name": "nombre",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 100,
        "ref": null
      },
      {
        "name": "descripcion",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 150,
        "ref": null
      },
      {
        "name": "estado",
        "type": "TINYINT",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR",
      "SEGURIDAD"
    ]
  },
  "guardias": {
    "label": "Guardias",
    "keys": [
      "id_guardia"
    ],
    "fields": [
      {
        "name": "nombres",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 100,
        "ref": null
      },
      {
        "name": "apellidos",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 100,
        "ref": null
      },
      {
        "name": "telefono",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 20,
        "ref": null
      },
      {
        "name": "estado",
        "type": "TINYINT",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR",
      "SEGURIDAD"
    ]
  },
  "guardia_acceso": {
    "label": "Guardias por acceso",
    "keys": [
      "id_asignacion"
    ],
    "fields": [
      {
        "name": "id_guardia",
        "type": "INT",
        "required": true,
        "options": null,
        "max": null,
        "ref": "guardias"
      },
      {
        "name": "id_acceso",
        "type": "INT",
        "required": true,
        "options": null,
        "max": null,
        "ref": "accesos"
      },
      {
        "name": "fecha_inicio",
        "type": "DATETIME",
        "required": true,
        "options": null,
        "max": null,
        "ref": null
      },
      {
        "name": "turno",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 30,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR",
      "SEGURIDAD"
    ]
  },
  "parqueos": {
    "label": "Parqueos",
    "keys": [
      "id_parqueo"
    ],
    "fields": [
      {
        "name": "codigo",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 20,
        "ref": null
      },
      {
        "name": "nombre",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 100,
        "ref": null
      },
      {
        "name": "ubicacion",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 150,
        "ref": null
      },
      {
        "name": "capacidad",
        "type": "INT",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      },
      {
        "name": "estado",
        "type": "TINYINT",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR"
    ]
  },
  "pilotos": {
    "label": "Pilotos",
    "keys": [
      "id_piloto"
    ],
    "fields": [
      {
        "name": "nombres",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 100,
        "ref": null
      },
      {
        "name": "apellidos",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 100,
        "ref": null
      },
      {
        "name": "dpi",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 20,
        "ref": null
      },
      {
        "name": "residencia",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 150,
        "ref": null
      },
      {
        "name": "telefono",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 20,
        "ref": null
      },
      {
        "name": "correo",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 120,
        "ref": null
      },
      {
        "name": "estado",
        "type": "TINYINT",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR"
    ]
  },
  "piloto_formacion": {
    "label": "Formación de pilotos",
    "keys": [
      "id_formacion"
    ],
    "fields": [
      {
        "name": "id_piloto",
        "type": "INT",
        "required": true,
        "options": null,
        "max": null,
        "ref": "pilotos"
      },
      {
        "name": "nivel",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 50,
        "ref": null
      },
      {
        "name": "institucion",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 150,
        "ref": null
      },
      {
        "name": "titulo",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 150,
        "ref": null
      },
      {
        "name": "fecha_finalizacion",
        "type": "DATE",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR"
    ]
  },
  "operador_estacion": {
    "label": "Operadores por estación",
    "keys": [
      "id_asignacion"
    ],
    "fields": [
      {
        "name": "id_usuario",
        "type": "INT",
        "required": true,
        "options": null,
        "max": null,
        "ref": "usuarios"
      },
      {
        "name": "id_estacion",
        "type": "INT",
        "required": true,
        "options": null,
        "max": null,
        "ref": "estaciones"
      },
      {
        "name": "fecha_inicio",
        "type": "DATETIME",
        "required": true,
        "options": null,
        "max": null,
        "ref": null
      },
      {
        "name": "fecha_fin",
        "type": "DATETIME",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR"
    ]
  },
  "metodos_pago": {
    "label": "Métodos de pago",
    "keys": [
      "id_metodo_pago"
    ],
    "fields": [
      {
        "name": "nombre",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 50,
        "ref": null
      },
      {
        "name": "descripcion",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 150,
        "ref": null
      },
      {
        "name": "estado",
        "type": "TINYINT",
        "required": false,
        "options": null,
        "max": null,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR",
      "FINANCIERO"
    ]
  },
  "tarjetas": {
    "label": "Tarjetas",
    "keys": [
      "id_tarjeta"
    ],
    "fields": [
      {
        "name": "numero_tarjeta",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 50,
        "ref": null
      },
      {
        "name": "estado",
        "type": "ENUM",
        "required": false,
        "options": [
          "ACTIVA"
        ],
        "max": null,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR",
      "FINANCIERO"
    ]
  },
  "pasajeros": {
    "label": "Pasajeros",
    "keys": [
      "id_pasajero"
    ],
    "fields": [
      {
        "name": "nombres",
        "type": "VARCHAR",
        "required": true,
        "options": null,
        "max": 150,
        "ref": null
      },
      {
        "name": "documento",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 30,
        "ref": null
      },
      {
        "name": "telefono",
        "type": "VARCHAR",
        "required": false,
        "options": null,
        "max": 20,
        "ref": null
      }
    ],
    "roles": [
      "ADMINISTRADOR",
      "OPERADOR",
      "SUPERVISOR"
    ]
  }
};
