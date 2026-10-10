const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {PrismaClient}=require('@prisma/client');
const {hash}=require('bcrypt');
const {randomBytes}=require('node:crypto');
const url=process.env.TEST_DATABASE_URL;
const enabled=Boolean(url);
if(enabled&&!new URL(url).pathname.endsWith('_test'))throw new Error('Las pruebas requieren una base cuyo nombre termine en _test.');
const db=enabled?new PrismaClient({datasources:{db:{url}}}):null;
const port=Number(process.env.TEST_PORT??3108),base=`http://127.0.0.1:${port}/api`;
let server,admin,operator,pilotUser,finance,fixture={},output='';
const suffix=randomBytes(4).toString('hex'),password='Test-'+randomBytes(14).toString('hex');
async function request(path,method='GET',body,session,csrf=true){
 const res=await fetch(base+'/'+path,{method,headers:{'Content-Type':'application/json',...(session?{Cookie:session.cookie,...(csrf?{'X-CSRF-Token':session.csrf}:{})}:{})},body:body?JSON.stringify(body):undefined});
 const data=await res.json();return {status:res.status,data,headers:res.headers};
}
async function ok(path,method='GET',body,session=admin){const r=await request(path,method,body,session);assert.ok(r.status<300,`${method} ${path}: ${r.status} ${JSON.stringify(r.data)}`);return r.data;}
async function login(username){const r=await request('auth/login','POST',{username,password});assert.equal(r.status,201,JSON.stringify(r.data));const cookies=r.headers.getSetCookie().map(s=>s.split(';')[0]);return {cookie:cookies.join('; '),csrf:cookies.find(s=>s.startsWith('csrf=')).slice(5)};}
before(async()=>{
 if(!enabled)return;
 await db.$connect();
 await db.$transaction(async tx=>{
  for(const nombre of ['ADMINISTRADOR','OPERADOR','SUPERVISOR','FINANCIERO','PILOTO','SEGURIDAD'])await tx.roles.upsert({where:{nombre},update:{},create:{nombre}});
  fixture.pilot=await tx.pilotos.create({data:{nombres:'Prueba',apellidos:suffix}});
  fixture.otherPilot=await tx.pilotos.create({data:{nombres:'Otro',apellidos:suffix}});
  for(const [tag,role] of [['admin','ADMINISTRADOR'],['operator','OPERADOR'],['finance','FINANCIERO'],['pilot','PILOTO']]){
   fixture[tag==='pilot'?'pilotAccount':tag]=await tx.usuarios.create({data:{username:tag+suffix,password_hash:await hash(password,4),...(tag==='pilot'?{id_piloto:fixture.otherPilot.id_piloto}:{}),usuario_rol:{create:{roles:{connect:{nombre:role}}}}}});
  }
  fixture.line=await tx.lineas.create({data:{codigo:'T'+suffix,nombre:'Línea prueba',estado:false}});
  fixture.stations=[];
  for(let i=1;i<=2;i++){const s=await tx.estaciones.create({data:{codigo:'S'+i+suffix,nombre:'Estación '+i,capacidad_maxima:100}});fixture.stations.push(s);await tx.linea_estacion.create({data:{id_linea:fixture.line.id_linea,id_estacion:s.id_estacion,orden:i}});}
  fixture.park=await tx.parqueos.create({data:{codigo:'P'+suffix,nombre:'Parqueo prueba',capacidad:10}});
  fixture.park2=await tx.parqueos.create({data:{codigo:'Q'+suffix,nombre:'Parqueo destino',capacidad:10}});
  fixture.cash=await tx.metodos_pago.upsert({where:{nombre:'Efectivo'},update:{},create:{nombre:'Efectivo'}});
  fixture.cardMethod=await tx.metodos_pago.upsert({where:{nombre:'Tarjeta'},update:{},create:{nombre:'Tarjeta'}});
  fixture.card=await tx.tarjetas.create({data:{numero_tarjeta:'C'+suffix,saldo:20}});
  fixture.emptyCard=await tx.tarjetas.create({data:{numero_tarjeta:'Z'+suffix,saldo:0}});
  fixture.passengers=[];
  for(let i=0;i<8;i++)fixture.passengers.push(await tx.pasajeros.create({data:{nombres:'Pasajero prueba '+i}}));
 },{timeout:20000});
 server=spawn(process.execPath,['dist/main.js'],{env:{...process.env,DATABASE_URL:url,JWT_SECRET:randomBytes(32).toString('hex'),HOST:'127.0.0.1',PORT:String(port),LOW_OCCUPANCY_WAIT_MINUTES:'5',TICKET_PRICE:'1.00'}});
 server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
 let ready=false;
 for(let i=0;i<60;i++){try{const r=await fetch(base+'/health');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(ready,output);
 admin=await login('admin'+suffix);operator=await login('operator'+suffix);finance=await login('finance'+suffix);pilotUser=await login('pilot'+suffix);
});
after(async()=>{if(server){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));}if(db)await db.$disconnect();});
test('Flujos integrales con MariaDB 10.11',{skip:!enabled},async t=>{
 await t.test('Autenticación, CSRF y roles',async()=>{
  assert.equal((await request('dashboard')).status,401);
  assert.equal((await request('catalogos/pasajeros','POST',{nombres:'Sin CSRF'},admin,false)).status,403);
  assert.equal((await request('usuarios','POST',{username:'intruso',password:'Contraseña123456',nombres:'X',roles:['ADMINISTRADOR']},operator)).status,403);
  assert.deepEqual(await ok('recorridos','GET',undefined,pilotUser),[]);
 });
 await t.test('Catálogos validan números, campos y activación prematura',async()=>{
  assert.equal((await request(`catalogos/lineas/${fixture.line.id_linea}`,'PATCH',{estado:'1'},admin)).status,400);
  assert.equal((await request('catalogos/estaciones','POST',{codigo:'BAD'+suffix,nombre:'X',capacidad_maxima:'-1'},admin)).status,400);
  assert.equal((await request('catalogos/tarjetas','POST',{numero_tarjeta:'BAD'+suffix,saldo:999},admin)).status,400);
  const p=await ok('catalogos/pasajeros','POST',{nombres:'Creado desde API'});assert.ok(p.id_pasajero);
 });
 await t.test('Flota exige parqueo y respeta máximo y mínimo por línea',async()=>{
  const make=i=>({codigo:'B'+i+suffix,placa:'PL'+i+suffix,capacidad_maxima:4,id_linea:fixture.line.id_linea,id_parqueo:fixture.park.id_parqueo});
  fixture.bus=await ok('buses','POST',make(1));fixture.bus2=await ok('buses','POST',make(2));
  assert.equal((await request('buses','POST',{...make(3),id_parqueo:999999},admin)).status,400);
  await ok(`catalogos/lineas/${fixture.line.id_linea}`,'PATCH',{estado:'1'});
  assert.equal(await db.bus_parqueo_historial.count({where:{id_bus:fixture.bus.id_bus,fecha_fin:null}}),1);
 });
 await t.test('Programación copia estaciones y valida fecha y piloto',async()=>{
  const b={id_bus:fixture.bus.id_bus,id_piloto:fixture.pilot.id_piloto,fecha:'2026-09-29',hora_salida:'06:00',llegada_estimada:'2026-09-29T08:00'};
  assert.equal((await request('recorridos','POST',{...b,fecha:'2026-02-31'},admin)).status,400);
  assert.equal((await request('recorridos','POST',b,admin)).status,400);
  await ok(`pilotos/${fixture.pilot.id_piloto}/asignar`,'POST',{id_bus:fixture.bus.id_bus});
  fixture.trip=await ok('recorridos','POST',b);
  const data=await ok(`recorridos/${fixture.trip.id_recorrido}/asientos`);fixture.seats=data.seats;
  assert.equal(data.stops.length,2);assert.equal(data.seats.length,4);
  assert.equal((await request(`recorridos/${fixture.trip.id_recorrido}/asientos`,'GET',undefined,pilotUser)).status,400);
 });
 const ticket=(seat=0,passenger=0,extra={})=>({id_asiento:fixture.seats[seat].id_asiento,id_pasajero:fixture.passengers[passenger].id_pasajero,id_estacion_ingreso:fixture.stations[0].id_estacion,id_estacion_destino:fixture.stations[1].id_estacion,estado:'EMITIDO',id_metodo_pago:fixture.cash.id_metodo_pago,...extra});
 const issue=(data,session=admin)=>request(`recorridos/${fixture.trip.id_recorrido}/tickets`,'POST',data,session);
 await t.test('El operador solo emite desde su estación',async()=>{
  assert.equal((await issue(ticket(),operator)).status,400);
  await ok('catalogos/operador_estacion','POST',{id_usuario:String(fixture.operator.id_usuario),id_estacion:String(fixture.stations[0].id_estacion),fecha_inicio:new Date(Date.now()-1000).toISOString()});
 });
 await t.test('Cobro insuficiente revierte ticket, asiento y pago',async()=>{
  const r=await issue(ticket(0,0,{id_metodo_pago:fixture.cardMethod.id_metodo_pago,id_tarjeta:String(fixture.emptyCard.id_tarjeta)}));assert.equal(r.status,400,JSON.stringify(r.data));
  assert.equal(await db.tickets.count({where:{id_recorrido:BigInt(fixture.trip.id_recorrido)}}),0);
 });
 await t.test('Concurrencia: solo un operador obtiene el mismo asiento',async()=>{
  const results=await Promise.all([issue(ticket(0,0),operator),issue(ticket(0,1),operator)]);
  assert.equal(results.filter(r=>r.status===201).length,1,JSON.stringify(results.map(r=>({status:r.status,data:r.data}))));
  assert.equal(await db.tickets.count({where:{id_recorrido:BigInt(fixture.trip.id_recorrido),estado:'EMITIDO'}}),1);
  fixture.ticket=results.find(r=>r.status===201).data;
 });
 await t.test('Cancelación libera asiento y deja efectivo por devolver',async()=>{
  await ok(`tickets/${fixture.ticket.id_ticket}/cancelar`,'POST');
  const payment=await db.pagos.findUnique({where:{id_ticket:BigInt(fixture.ticket.id_ticket)}});assert.equal(payment.estado,'REEMBOLSO_PENDIENTE');
  await ok(`pagos/${payment.id_pago}/reembolso`,'POST',undefined,finance);
  assert.equal((await db.pagos.findUnique({where:{id_pago:payment.id_pago}})).estado,'REEMBOLSADO');
 });
 await t.test('Débito de tarjeta y reembolso atómicos',async()=>{
  const r=await issue(ticket(0,0,{id_metodo_pago:fixture.cardMethod.id_metodo_pago,id_tarjeta:String(fixture.card.id_tarjeta)}));assert.equal(r.status,201,JSON.stringify(r.data));
  assert.equal(Number((await db.tarjetas.findUnique({where:{id_tarjeta:fixture.card.id_tarjeta}})).saldo),19);
  await ok(`tickets/${r.data.id_ticket}/cancelar`,'POST');
  assert.equal(Number((await db.tarjetas.findUnique({where:{id_tarjeta:fixture.card.id_tarjeta}})).saldo),20);
 });
 await t.test('Reserva caduca y no se puede cobrar después',async()=>{
  const r=await issue(ticket(0,0,{estado:'RESERVADO'}));assert.equal(r.status,201,JSON.stringify(r.data));
  assert.equal(await db.pagos.count({where:{id_ticket:BigInt(r.data.id_ticket)}}),0);
  await db.tickets.update({where:{id_ticket:BigInt(r.data.id_ticket)},data:{reservado_hasta:new Date(Date.now()-10000)}});
  const seats=await ok(`recorridos/${fixture.trip.id_recorrido}/asientos`);assert.equal(seats.seats[0].status,'DISPONIBLE');
  assert.equal((await request(`tickets/${r.data.id_ticket}/confirmar`,'POST',{id_metodo_pago:fixture.cash.id_metodo_pago},admin)).status,400);
 });
 await t.test('Asiento fuera de servicio y origen/destino inválidos',async()=>{
  await ok(`asientos/${fixture.seats[0].id_asiento}/estado`,'POST',{estado:'FUERA_SERVICIO'});
  assert.equal((await issue(ticket())).status,400);
  await ok(`asientos/${fixture.seats[0].id_asiento}/estado`,'POST',{estado:'HABILITADO'});
  assert.equal((await issue(ticket(0,0,{id_estacion_destino:fixture.stations[0].id_estacion}))).status,400);
 });
 await t.test('No permite iniciar sin llegada ni sin espera por baja ocupación',async()=>{
  assert.equal((await request(`recorridos/${fixture.trip.id_recorrido}/iniciar`,'POST',undefined,admin)).status,400);
  await ok(`recorridos/${fixture.trip.id_recorrido}/visitas`,'POST',{id_estacion:fixture.stations[0].id_estacion,accion:'LLEGADA'});
  assert.equal((await request(`recorridos/${fixture.trip.id_recorrido}/iniciar`,'POST',undefined,admin)).status,400);
 });
 await t.test('Capacidad completa impide duplicaciones y libera al llegar al destino',async()=>{
  for(let i=0;i<4;i++){const r=await issue(ticket(i,i));assert.equal(r.status,201,JSON.stringify(r.data));if(i===0)fixture.current=r.data;}
  assert.equal((await issue(ticket(0,5))).status,400);
  await ok(`recorridos/${fixture.trip.id_recorrido}/iniciar`,'POST');
  assert.equal((await request(`tickets/${fixture.current.id_ticket}/cancelar`,'POST',undefined,admin)).status,400);
  assert.equal((await request(`recorridos/${fixture.trip.id_recorrido}/finalizar`,'POST',undefined,admin)).status,400);
  await ok(`recorridos/${fixture.trip.id_recorrido}/visitas`,'POST',{id_estacion:fixture.stations[0].id_estacion,accion:'SALIDA'});
  await ok(`recorridos/${fixture.trip.id_recorrido}/visitas`,'POST',{id_estacion:fixture.stations[1].id_estacion,accion:'LLEGADA'});
  await ok(`recorridos/${fixture.trip.id_recorrido}/finalizar`,'POST');
  assert.equal(await db.tickets.count({where:{id_recorrido:BigInt(fixture.trip.id_recorrido),estado:'EMITIDO'}}),0);
  assert.equal((await issue(ticket())).status,400);
 });
 await t.test('Cambio de parqueo conserva historial y asignación única',async()=>{
  await ok(`buses/${fixture.bus.id_bus}/asignar`,'POST',{id_linea:fixture.line.id_linea,id_parqueo:fixture.park2.id_parqueo});
  assert.equal(await db.bus_parqueo_historial.count({where:{id_bus:fixture.bus.id_bus}}),2);
  assert.equal(await db.bus_parqueo_historial.count({where:{id_bus:fixture.bus.id_bus,fecha_fin:null}}),1);
 });
 await t.test('Alerta de sobrecupo: >150%, sin duplicación y resolución',async()=>{
  const endpoint=`estaciones/${fixture.stations[0].id_estacion}/ocupacion`;
  await ok(endpoint,'POST',{pasajeros:150});assert.equal(await db.alertas.count({where:{id_estacion:fixture.stations[0].id_estacion}}),0);
  await ok(endpoint,'POST',{pasajeros:151});await ok(endpoint,'POST',{pasajeros:180});
  assert.equal(await db.alertas.count({where:{id_estacion:fixture.stations[0].id_estacion,estado:'PENDIENTE'}}),1);
  await ok(endpoint,'POST',{pasajeros:100});assert.equal(await db.alertas.count({where:{id_estacion:fixture.stations[0].id_estacion,estado:'PENDIENTE'}}),0);
 });
 await t.test('Acceso con guardia obligatorio y relevo sin quedar descubierto',async()=>{
  const guard=await ok('catalogos/guardias','POST',{nombres:'Guardia',apellidos:suffix});
  assert.equal((await request('catalogos/accesos','POST',{id_estacion:String(fixture.stations[0].id_estacion),nombre:'Sin guardia'},admin)).status,400);
  const access=await ok('catalogos/accesos','POST',{id_estacion:String(fixture.stations[0].id_estacion),nombre:'Con guardia',id_guardia:String(guard.id_guardia)});
  const assignment=await db.guardia_acceso.findFirst({where:{id_acceso:access.id_acceso}});
  assert.equal((await request(`guardias/asignaciones/${assignment.id_asignacion}/cerrar`,'POST',undefined,admin)).status,400);
  assert.equal((await request(`catalogos/guardias/${guard.id_guardia}`,'PATCH',{estado:'0'},admin)).status,400);
 });
 await t.test('Recarga financiera y bitácora',async()=>{
  await ok('recargas','POST',{id_tarjeta:String(fixture.card.id_tarjeta),id_metodo_pago:fixture.cash.id_metodo_pago,monto:'5.50'},finance);
  assert.equal(Number((await db.tarjetas.findUnique({where:{id_tarjeta:fixture.card.id_tarjeta}})).saldo),25.5);
  assert.equal((await request('reportes/bitacora','GET',undefined,operator)).status,403);
  assert.ok((await ok('reportes/bitacora')).length>0);
 });
});
