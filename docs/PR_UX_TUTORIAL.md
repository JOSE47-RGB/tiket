# Mejorar la venta y añadir un tutorial guiado por usuario

El personal debe poder encontrar sus tareas y vender boletos sin aprender códigos internos. Esta rama añade un recorrido guiado de 6 pasos (7 para administrador), con controles de teclado, progreso, repetición y preferencia guardada por cuenta. Las pantallas de cada rol muestran acciones pertinentes; se mantiene la identidad verde.

La venta explica asiento → pasajero/destino → cobro, filtra destinos posteriores al origen y solo pide tarjeta cuando se usa saldo de transporte. Se mantiene el cobro interno existente; no se integra un proveedor bancario. Se aclaran errores de red/validación y estados, se confirman cancelaciones/finalización y se recupera el cierre de sesión en celular. Se evitan peticiones duplicadas de usuarios.

Incluye un commit separado con correcciones locales anteriores (asignación de piloto y capacidad), preservadas antes del trabajo UX.

## Pantallas para revisar
- Inicio: acciones por rol y cantidad de recorridos pendientes.
- Guía: objetivo real resaltado, progreso, Atrás/Siguiente/Omitir; Escape omite y guarda.
- Venta: destinos válidos, efectivo/tarjeta y total antes de emitir.
- Celular: navegación horizontal y perfil/cierre de sesión visibles.

## Migración y variables
Aplicar `202610220001_tutorial` antes del backend nuevo. Cuentas existentes reciben false y ven el tutorial. No hay nuevas variables de producción. Ver [plan de despliegue y reversión](DESPLIEGUE_UX.md); reversión preferida: código anterior conservando la columna. No mezclar esta rama ni desplegarla a producción automáticamente.

## Pruebas
Ver [resultados de validación UX](PRUEBAS_UX.md) y pasos reproducibles en DESPLIEGUE_UX.md. La producción no se ha usado para pruebas ni se han cambiado sus datos.

Resultados: compilación aprobada, 28 entradas TAP de backend (27 comprobaciones independientes), 10 escenarios de navegador y reversión de esquema comprobada en una base local. Capturas: [escritorio](capturas-ux/tutorial-escritorio.png), [celular](capturas-ux/tutorial-celular.png) y [boleto](capturas-ux/boleto.png).
