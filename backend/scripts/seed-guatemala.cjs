// Escenario ficticio situado en Ciudad de Guatemala; no representa rutas ni tarifas oficiales.
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const marker = 'DEMO_GUATEMALA_V1';
async function main() {
 await db.$transaction(async tx => {
  const admin = await tx.usuarios.findUnique({where:{username:process.env.ADMIN_USERNAME || 'admin'}});
  if (!admin) throw new Error('Primero crea el administrador.');
  // Serializa ejecuciones para evitar cargas duplicadas.
  await tx.$queryRaw`SELECT id_usuario FROM usuarios WHERE id_usuario=${admin.id_usuario} FOR UPDATE`;
  if (await tx.bitacora.findFirst({where:{accion:marker}})) { console.log('Demostración ya cargada; no se duplica.'); return; }
  const now = new Date();
  const day = new Date(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guatemala',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)+'T00:00:00Z');
  const city = await tx.municipalidades.create({data:{nombre:'Municipalidad de Guatemala · Demo',direccion:'Ciudad de Guatemala, departamento de Guatemala'}});
  const cash = await tx.metodos_pago.upsert({where:{nombre:'Efectivo'},update:{},create:{nombre:'Efectivo'}});
  await tx.metodos_pago.upsert({where:{nombre:'Tarjeta'},update:{},create:{nombre:'Tarjeta'}});
  const people = [];
  for (let i=0;i<30;i++) people.push(await tx.pasajeros.create({data:{nombres:`${['Ana López','Luis García','María Pérez','José Morales','Sofía Ramírez','Diego Hernández','Lucía Castillo','Pedro Díaz','Elena Castro','Pablo Ruiz'][i%10]} · Demo ${i+1}`,documento:`DEMO-GUA-${i+1}`}}));
  for(let i=1;i<=5;i++){
   const card=await tx.tarjetas.create({data:{numero_tarjeta:`DEMO-GUA-${String(i).padStart(3,'0')}`,saldo:50}});
   await tx.recargas.create({data:{id_tarjeta:card.id_tarjeta,id_usuario:admin.id_usuario,id_metodo_pago:cash.id_metodo_pago,monto:50}});
  }
  const sectors = [
   {name:'Centro histórico',stops:['Plaza Barrios · Zona 1','Parque Central · Zona 1','Cerrito del Carmen · Zona 1']},
   {name:'Corredor central',stops:['Centro Cívico · Zona 1','Torre del Reformador · Zona 9','Plaza España · Zona 9']},
   {name:'Sector occidente',stops:['El Trébol · Zona 11','Mariscal · Zona 11','Roosevelt · Zona 11']}
  ];
  for(const [r,sector] of sectors.entries()){
   const code=`DEMO-GUA-${r+1}`;
   const line=await tx.lineas.create({data:{codigo:code,nombre:`${sector.name} · Demo`,descripcion:'Ruta ficticia para pruebas en Ciudad de Guatemala; no es un recorrido oficial.',estado:false}});
   await tx.municipalidad_linea.create({data:{id_municipalidad:city.id_municipalidad,id_linea:line.id_linea}});
   const stops=[];
   for(const [s,name] of sector.stops.entries()){
    const station=await tx.estaciones.create({data:{codigo:`DG-${r+1}-${s+1}`,nombre:`${name} · Demo`,capacidad_maxima:100,pasajeros_esperando:10+s*5}});stops.push(station);
    await tx.linea_estacion.create({data:{id_linea:line.id_linea,id_estacion:station.id_estacion,orden:s+1,distancia_anterior_km:s?1.5:0}});
    const access=await tx.accesos.create({data:{id_estacion:station.id_estacion,nombre:'Acceso principal · Demo'}});
    const guard=await tx.guardias.create({data:{nombres:`Guardia ${r+1}-${s+1}`,apellidos:'Demostración'}});
    await tx.guardia_acceso.create({data:{id_guardia:guard.id_guardia,id_acceso:access.id_acceso,fecha_inicio:now,turno:'Demostración'}});
   }
   const park=await tx.parqueos.create({data:{codigo:code,nombre:`Patio ${sector.name} · Demo`,ubicacion:'Ciudad de Guatemala · ubicación ficticia',capacidad:12}});
   let first;
   for(let b=0;b<3;b++){
    const bus=await tx.buses.create({data:{codigo:`DG-B${r+1}${b+1}`,placa:`DEMO-${r+1}${b+1}`,marca:'Demostración',modelo:'Urbano de prueba',capacidad_maxima:32}});first??=bus;
    await tx.bus_linea_historial.create({data:{id_bus:bus.id_bus,id_linea:line.id_linea,fecha_inicio:now}});
    await tx.bus_parqueo_historial.create({data:{id_bus:bus.id_bus,id_parqueo:park.id_parqueo,fecha_inicio:now}});
    await tx.asientos.createMany({data:Array.from({length:32},(_,i)=>({id_bus:bus.id_bus,numero_asiento:String(i+1)}))});
   }
   await tx.lineas.update({where:{id_linea:line.id_linea},data:{estado:true}});
   const pilot=await tx.pilotos.create({data:{nombres:['Carlos','Andrea','Miguel'][r],apellidos:'Piloto de demostración',residencia:'Ciudad de Guatemala'}});
   await tx.piloto_formacion.create({data:{id_piloto:pilot.id_piloto,nivel:'Capacitación',institucion:'Centro de formación ficticio',titulo:'Conducción urbana · Demo'}});
   const trip=await tx.recorridos.create({data:{id_linea:line.id_linea,id_bus:first.id_bus,id_piloto:pilot.id_piloto,fecha:day}});
   for(const [s,station] of stops.entries())await tx.recorrido_estacion.create({data:{id_recorrido:trip.id_recorrido,id_estacion:station.id_estacion,orden:s+1,hora_llegada:s===0?new Date(now.getTime()-600000):null}});
   const seats=await tx.asientos.findMany({where:{id_bus:first.id_bus},orderBy:{id_asiento:'asc'},take:8});
   for(const [i,seat] of seats.entries()){
    const ticket=await tx.tickets.create({data:{numero_ticket:`DEMO-GUA-${r+1}-${i+1}`,id_recorrido:trip.id_recorrido,id_asiento:seat.id_asiento,id_operador:admin.id_usuario,id_estacion_ingreso:stops[0].id_estacion,id_estacion_destino:stops[2].id_estacion,id_pasajero:people[r*10+i].id_pasajero,precio:1,estado:'EMITIDO'}});
    await tx.pagos.create({data:{id_ticket:ticket.id_ticket,id_metodo_pago:cash.id_metodo_pago,monto:1}});
   }
  }
  await tx.bitacora.create({data:{id_usuario:admin.id_usuario,accion:marker,detalle:'Datos ficticios: 3 rutas, 9 estaciones, 9 buses, 3 pilotos, 3 recorridos, 30 pasajeros, 24 tickets y pagos, 5 tarjetas con recargas. Precio de prueba Q1; rutas y distancias no oficiales.'}});
  console.log('Demostración de Ciudad de Guatemala creada correctamente.');
 },{timeout:30000});
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
