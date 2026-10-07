require('dotenv/config');
const { PrismaClient }=require('@prisma/client');
const bcrypt=require('bcrypt');
const db=new PrismaClient();
async function main(){
 const password=process.env.ADMIN_PASSWORD;
 if(!password||password.length<12||Buffer.byteLength(password)>72)throw new Error('Define ADMIN_PASSWORD entre 12 y 72 bytes.');
 const roleNames=['ADMINISTRADOR','SUPERVISOR','OPERADOR','SEGURIDAD','FINANCIERO','PILOTO'];
 await db.$transaction(async tx=>{
  for(const nombre of roleNames)await tx.roles.upsert({where:{nombre},update:{},create:{nombre}});
  const username=process.env.ADMIN_USERNAME||'admin';
  if(!await tx.usuarios.findUnique({where:{username}}))await tx.usuarios.create({data:{username,password_hash:await bcrypt.hash(password,12),nombres:'Administrador',usuario_rol:{create:{roles:{connect:{nombre:'ADMINISTRADOR'}}}}}});
 });
 if(!process.argv.includes('--demo')){console.log('Administrador inicial preparado.');return;}
 if(await db.lineas.count()){console.log('Datos existentes: se omite la demostración.');return;}
 await db.$transaction(async tx=>{
  const city=await tx.municipalidades.create({data:{nombre:'Municipalidad de Guatemala',direccion:'Ciudad de Guatemala'}});
  const line=await tx.lineas.create({data:{codigo:'L12',nombre:'Línea 12 · Eje Sur',descripcion:'Datos de demostración',estado:false}});
  await tx.municipalidad_linea.create({data:{id_municipalidad:city.id_municipalidad,id_linea:line.id_linea}});
  const guard=await tx.guardias.create({data:{nombres:'Guardia',apellidos:'Demostración'}});
  const stations=[];
  for(const [i,nombre] of ['Centra Sur','El Trébol','Plaza Barrios'].entries()){
   const station=await tx.estaciones.create({data:{codigo:`EST-${i+1}`,nombre,capacidad_maxima:200}});stations.push(station);
   await tx.linea_estacion.create({data:{id_linea:line.id_linea,id_estacion:station.id_estacion,orden:i+1,distancia_anterior_km:i?3.5:0}});
   const access=await tx.accesos.create({data:{id_estacion:station.id_estacion,nombre:'Acceso principal'}});
   await tx.guardia_acceso.create({data:{id_guardia:guard.id_guardia,id_acceso:access.id_acceso,fecha_inicio:new Date(),turno:'Demostración'}});
  }
  const park=await tx.parqueos.create({data:{codigo:'P-SUR',nombre:'Patio Sur',capacidad:20,ubicacion:'Guatemala'}});
  const pilot=await tx.pilotos.create({data:{nombres:'Carlos',apellidos:'Pérez · Demo',residencia:'Guatemala'}});
  let first;
  for(let i=1;i<=3;i++){
   const bus=await tx.buses.create({data:{codigo:`TM-${String(i).padStart(3,'0')}`,placa:`DEMO-${i}`,marca:'Demostración',capacidad_maxima:32}});first??=bus;
   await tx.bus_linea_historial.create({data:{id_bus:bus.id_bus,id_linea:line.id_linea,fecha_inicio:new Date()}});
   await tx.bus_parqueo_historial.create({data:{id_bus:bus.id_bus,id_parqueo:park.id_parqueo,fecha_inicio:new Date()}});
   await tx.asientos.createMany({data:Array.from({length:32},(_,j)=>({id_bus:bus.id_bus,numero_asiento:String(j+1)}))});
  }
  await tx.lineas.update({where:{id_linea:line.id_linea},data:{estado:true}});
  const trip=await tx.recorridos.create({data:{id_linea:line.id_linea,id_bus:first.id_bus,id_piloto:pilot.id_piloto,fecha:new Date(new Date().toISOString().slice(0,10))}});
  for(let i=0;i<stations.length;i++)await tx.recorrido_estacion.create({data:{id_recorrido:trip.id_recorrido,id_estacion:stations[i].id_estacion,orden:i+1}});
  await tx.metodos_pago.createMany({data:[{nombre:'Efectivo'},{nombre:'Tarjeta'}]});
  await tx.tarjetas.create({data:{numero_tarjeta:'DEMO-001',saldo:25}});
  for(const nombres of ['Ana López','Luis García','María Gómez','José Morales','Sofía Ramírez','Diego Pérez','Lucía Torres','Pedro Díaz','Elena Castro','Pablo Ruiz'])await tx.pasajeros.create({data:{nombres:nombres+' · Demo'}});
 });
 console.log('Demostración creada: 1 línea, 3 estaciones, 3 buses y 1 recorrido.');
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
