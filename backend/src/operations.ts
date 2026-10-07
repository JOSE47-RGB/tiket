import {scheduleWindow} from './schedule';
import { BadRequestException, Body, Controller, Get, Injectable, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, IsIn, Min, Max, Length, Matches } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { Db, Actor } from './db';
import { AuthGuard, authorize } from './auth';
const ops=['ADMINISTRADOR','SUPERVISOR','OPERADOR'];
const supervisors=['ADMINISTRADOR','SUPERVISOR'];
function fail(message:string):never{throw new BadRequestException(message);}
function bid(value:string){if(!/^\d{1,18}$/.test(value)||BigInt(value)<1n)fail('Identificador inválido.');return BigInt(value);}
class BusDto {
 @IsString() @Length(1,20) codigo!:string;
 @IsString() @Length(1,20) placa!:string;
 @IsInt() @Min(1) @Max(150) capacidad_maxima!:number;
 @IsInt() @Min(1) id_linea!:number;
 @IsInt() @Min(1) id_parqueo!:number;
}
class CapacityDto { @IsInt() @Min(1) @Max(150) capacidad_maxima!:number; }
class AssignmentDto { @IsInt() @Min(1) id_linea!:number; @IsInt() @Min(1) id_parqueo!:number; }
class TripDto {
 @IsString() @Matches(/^\d{2}:\d{2}$/) hora_salida!:string;
 @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/) llegada_estimada!:string;
 @IsInt() @Min(1) id_bus!:number;
 @IsInt() @Min(1) id_piloto!:number;
 @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) fecha!:string;
}
class TicketDto {
 @IsInt() @Min(1) id_asiento!:number;
 @IsInt() @Min(1) id_pasajero!:number;
 @IsInt() @Min(1) id_estacion_ingreso!:number;
 @IsInt() @Min(1) id_estacion_destino!:number;
 @IsIn(['RESERVADO','EMITIDO']) estado!:'RESERVADO'|'EMITIDO';
 @IsOptional() @IsInt() @Min(1) id_metodo_pago?:number;
 @IsOptional() @IsString() @Matches(/^\d{1,18}$/) id_tarjeta?:string;
}
class PaymentDto {
 @IsInt() @Min(1) id_metodo_pago!:number;
 @IsOptional() @IsString() @Matches(/^\d{1,18}$/) id_tarjeta?:string;
}
class RechargeDto {
 @IsString() @Matches(/^\d{1,18}$/) id_tarjeta!:string;
 @IsInt() @Min(1) id_metodo_pago!:number;
 @IsString() @Matches(/^\d{1,6}(\.\d{1,2})?$/) monto!:string;
}
class StationDto {@IsInt() @Min(0) @Max(100000) pasajeros!:number;}
class VisitDto { @IsInt() @Min(1) id_estacion!:number; @IsIn(['LLEGADA','SALIDA']) accion!:'LLEGADA'|'SALIDA'; }
class SeatDto { @IsIn(['HABILITADO','FUERA_SERVICIO']) estado!:'HABILITADO'|'FUERA_SERVICIO'; }
@Injectable()
export class Operations {
 constructor(private db:Db){}
 async audit(tx:any,actor:Actor,accion:string,table:string,id?:bigint|number,detalle?:string){await tx.bitacora.create({data:{id_usuario:actor.id_usuario,accion,tabla_afectada:table,registro_id:id===undefined?undefined:BigInt(id),detalle}});}
 async infra(tx:any){await tx.$queryRaw`SELECT id_linea FROM lineas ORDER BY id_linea FOR UPDATE`;}
 async tripLock(tx:any,id:bigint,actor:Actor){
  await tx.$queryRaw`SELECT id_recorrido FROM recorridos WHERE id_recorrido=${id} FOR UPDATE`;
  const trip=await tx.recorridos.findUnique({where:{id_recorrido:id}});if(!trip)throw new NotFoundException('Recorrido no encontrado.');
  if(actor.roles.length===1&&actor.roles.includes('PILOTO')&&trip.id_piloto!==actor.id_piloto)fail('Recorrido no asignado.');
  return trip;
 }
 async expire(tx:any,id:bigint){
  const expired=await tx.tickets.findMany({where:{id_recorrido:id,estado:'RESERVADO',reservado_hasta:{lte:new Date()}}});
  if(!expired.length)return;
  await tx.tickets.updateMany({where:{id_ticket:{in:expired.map((t:any)=>t.id_ticket)}},data:{estado:'CANCELADO'}});
  await tx.bitacora.createMany({data:expired.map((t:any)=>({id_usuario:t.id_operador,accion:'RESERVA_EXPIRADA',tabla_afectada:'tickets',registro_id:t.id_ticket,detalle:'Liberación automática al consultar u operar el recorrido.'}))});
 }
 async stationPermission(tx:any,actor:Actor,id:number){
  if(actor.roles.some(r=>supervisors.includes(r)))return;
  if(!await tx.operador_estacion.findFirst({where:{id_usuario:actor.id_usuario,id_estacion:id,fecha_inicio:{lte:new Date()},OR:[{fecha_fin:null},{fecha_fin:{gt:new Date()}}]}}))fail('No estás asignado a esta estación.');
 }
 async dashboard(actor:Actor){
  authorize(actor,[...ops,'SEGURIDAD','FINANCIERO','PILOTO']);
  const trips=await this.trips(actor);
  return {buses:await this.db.buses.count(),estaciones:await this.db.estaciones.count(),recorridos:trips.length,alertas:await this.db.alertas.count({where:{estado:'PENDIENTE'}}),trips};
 }
 async buses(actor:Actor){authorize(actor,supervisors);return this.db.buses.findMany({include:{bus_linea_historial:{where:{fecha_fin:null}},bus_parqueo_historial:{where:{fecha_fin:null}}},orderBy:{codigo:'asc'}});}
 async checkLine(tx:any,lid:number,delta:number){
  const line=await tx.lineas.findUnique({where:{id_linea:lid}});if(!line)fail('Línea inexistente.');
  const n=await tx.linea_estacion.count({where:{id_linea:lid}});
  const b=await tx.bus_linea_historial.count({where:{id_linea:lid,fecha_fin:null}})+delta;
  if(!n||b>2*n||(line.estado&&b<n))fail('La asignación incumple la cantidad de buses por estación. Prepara las líneas nuevas en estado inactivo.');
 }
 async parking(tx:any,id:number){
  await tx.$queryRaw`SELECT id_parqueo FROM parqueos WHERE id_parqueo=${id} FOR UPDATE`;
  const park=await tx.parqueos.findUnique({where:{id_parqueo:id}});if(!park?.estado)fail('Parqueo no disponible.');
  if(park.capacidad && await tx.bus_parqueo_historial.count({where:{id_parqueo:id,fecha_fin:null}})>=park.capacidad)fail('El parqueo está lleno.');
 }
 async createBus(body:BusDto,actor:Actor){authorize(actor,supervisors);return this.db.$transaction(async tx=>{
  await this.infra(tx);await this.checkLine(tx,body.id_linea,1);await this.parking(tx,body.id_parqueo);
  const bus=await tx.buses.create({data:{codigo:body.codigo,placa:body.placa,capacidad_maxima:body.capacidad_maxima}});
  await tx.bus_linea_historial.create({data:{id_bus:bus.id_bus,id_linea:body.id_linea,fecha_inicio:new Date()}});
  await tx.bus_parqueo_historial.create({data:{id_bus:bus.id_bus,id_parqueo:body.id_parqueo,fecha_inicio:new Date()}});
  await tx.asientos.createMany({data:Array.from({length:body.capacidad_maxima},(_,i)=>({id_bus:bus.id_bus,numero_asiento:String(i+1)}))});
  await this.audit(tx,actor,'CREAR_BUS','buses',bus.id_bus);return bus;
 });}
 async resizeBus(id:string,body:CapacityDto,actor:Actor){authorize(actor,supervisors);return this.db.$transaction(async tx=>{
  await this.infra(tx);const busId=Number(bid(id));
  const bus=await tx.buses.findUnique({where:{id_bus:busId}});if(!bus)throw new NotFoundException();
  if(bus.capacidad_maxima===body.capacidad_maxima)return bus;
  if(await tx.recorridos.count({where:{id_bus:busId,estado:{in:['PROGRAMADO','EN_CURSO']}}}))fail('Finaliza o cancela los recorridos pendientes antes de cambiar la cantidad de asientos.');
  const seats=await tx.asientos.findMany({where:{id_bus:busId}});
  const missing=Array.from({length:body.capacidad_maxima},(_,i)=>String(i+1)).filter(n=>!seats.some(s=>s.numero_asiento===n));
  if(missing.length)await tx.asientos.createMany({data:missing.map(numero_asiento=>({id_bus:busId,numero_asiento}))});
  // Conserva asientos anteriores para mantener las referencias de tickets históricos.
  const retired=seats.filter(s=>Number(s.numero_asiento)>body.capacidad_maxima).map(s=>s.id_asiento);
  if(retired.length)await tx.asientos.updateMany({where:{id_asiento:{in:retired}},data:{estado_operativo:'FUERA_SERVICIO'}});
  const restored=seats.filter(s=>Number(s.numero_asiento)>bus.capacidad_maxima&&Number(s.numero_asiento)<=body.capacidad_maxima).map(s=>s.id_asiento);
  if(restored.length)await tx.asientos.updateMany({where:{id_asiento:{in:restored}},data:{estado_operativo:'HABILITADO'}});
  const updated=await tx.buses.update({where:{id_bus:busId},data:{capacidad_maxima:body.capacidad_maxima}});
  await this.audit(tx,actor,'CAMBIAR_CAPACIDAD','buses',busId,`${bus.capacidad_maxima} → ${body.capacidad_maxima} asientos`);return updated;
 });}
 async assignBus(id:string,body:AssignmentDto,actor:Actor){authorize(actor,supervisors);return this.db.$transaction(async tx=>{
  await this.infra(tx);const busId=Number(bid(id));
  if(!await tx.buses.findUnique({where:{id_bus:busId}}))throw new NotFoundException();
  if(await tx.recorridos.count({where:{id_bus:busId,estado:{in:['PROGRAMADO','EN_CURSO']}}}))fail('El bus tiene recorridos pendientes.');
  const prev=await tx.bus_linea_historial.findFirst({where:{id_bus:busId,fecha_fin:null}});
  if(prev?.id_linea!==body.id_linea){
   if(prev)await this.checkLine(tx,prev.id_linea,-1);
   await this.checkLine(tx,body.id_linea,1);
   await tx.bus_linea_historial.updateMany({where:{id_bus:busId,fecha_fin:null},data:{fecha_fin:new Date()}});
   await tx.bus_linea_historial.create({data:{id_bus:busId,id_linea:body.id_linea,fecha_inicio:new Date()}});
  }
  const park=await tx.bus_parqueo_historial.findFirst({where:{id_bus:busId,fecha_fin:null}});
  if(park?.id_parqueo!==body.id_parqueo){await this.parking(tx,body.id_parqueo);await tx.bus_parqueo_historial.updateMany({where:{id_bus:busId,fecha_fin:null},data:{fecha_fin:new Date()}});await tx.bus_parqueo_historial.create({data:{id_bus:busId,id_parqueo:body.id_parqueo,fecha_inicio:new Date()}});}
  await this.audit(tx,actor,'REASIGNAR_BUS','buses',busId);return {ok:true};
 });}
 async trips(actor:Actor){return this.db.recorridos.findMany({where:actor.roles.length===1&&actor.roles.includes('PILOTO')?{id_piloto:actor.id_piloto??0}:{},include:{buses:true,lineas:true,pilotos:{select:{nombres:true,apellidos:true}}},orderBy:{id_recorrido:'desc'},take:200});}
 async createTrip(body:TripDto,actor:Actor){authorize(actor,supervisors);return this.db.$transaction(async tx=>{
  await this.infra(tx);const date=new Date(body.fecha+'T00:00:00Z');if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==body.fecha)fail('Fecha inválida.');
  const bus=await tx.buses.findUnique({where:{id_bus:body.id_bus}});if(bus?.estado!=='ACTIVO')fail('El bus no está activo.');
  const {departure,arrival}=scheduleWindow(body.fecha,body.hora_salida,body.llegada_estimada);
  const conflicts=await tx.recorridos.findMany({where:{estado:{in:['PROGRAMADO','EN_CURSO']},OR:[{id_bus:body.id_bus},{id_piloto:body.id_piloto}]}});
  for(const other of conflicts){
   if(!other.salida_programada||!other.llegada_estimada)fail('El bus o piloto tiene un recorrido pendiente sin horario. Finalízalo o cancélalo antes de programar.');
   if(departure<other.llegada_estimada&&arrival>other.salida_programada)fail('El bus o piloto ya está asignado a otro recorrido en ese horario.');
  }

  const assignment=await tx.bus_linea_historial.findFirst({where:{id_bus:body.id_bus,fecha_fin:null}});if(!assignment)fail('El bus no tiene línea.');
  const line=await tx.lineas.findUnique({where:{id_linea:assignment.id_linea}});if(!line?.estado)fail('Activa la línea antes de programar recorridos.');
  if(!await tx.pilotos.findFirst({where:{id_piloto:body.id_piloto,estado:true}}))fail('Piloto no disponible.');
  const stations=await tx.linea_estacion.findMany({where:{id_linea:assignment.id_linea},orderBy:{orden:'asc'}});if(stations.length<2)fail('El recorrido necesita al menos dos estaciones.');
  const trip=await tx.recorridos.create({data:{id_bus:body.id_bus,id_piloto:body.id_piloto,id_linea:assignment.id_linea,fecha:date,salida_programada:departure,llegada_estimada:arrival}});
  await tx.recorrido_estacion.createMany({data:stations.map(s=>({id_recorrido:trip.id_recorrido,id_estacion:s.id_estacion,orden:s.orden}))});
  await this.audit(tx,actor,'PROGRAMAR_RECORRIDO','recorridos',trip.id_recorrido);return trip;
 });}
 async seats(id:string,actor:Actor){authorize(actor,[...ops,'PILOTO']);return this.db.$transaction(async tx=>{
  const trip=await this.tripLock(tx,bid(id),actor);await this.expire(tx,trip.id_recorrido);
  const bus=await tx.buses.findUniqueOrThrow({where:{id_bus:trip.id_bus}});
  const seats=await tx.asientos.findMany({where:{id_bus:trip.id_bus}});
  const tickets=await tx.tickets.findMany({where:{id_recorrido:trip.id_recorrido,estado:{in:['EMITIDO','RESERVADO']}}});
  const stops=await tx.recorrido_estacion.findMany({where:{id_recorrido:trip.id_recorrido},include:{estaciones:true},orderBy:{orden:'asc'}});
  return {trip,stops,seats:seats.filter(s=>Number(s.numero_asiento)<=bus.capacidad_maxima||tickets.some(t=>t.id_asiento===s.id_asiento)).sort((a,b)=>Number(a.numero_asiento)-Number(b.numero_asiento)).map(s=>{const ticket=tickets.find(t=>t.id_asiento===s.id_asiento);return {...s,status:s.estado_operativo==='FUERA_SERVICIO'?'FUERA_SERVICIO':ticket?.estado??'DISPONIBLE',ticket:actor.roles.includes('PILOTO')&&actor.roles.length===1?undefined:ticket}})};
 });}
 async pay(tx:any,ticket:any,body:PaymentDto,actor:Actor){
  const method=await tx.metodos_pago.findUnique({where:{id_metodo_pago:body.id_metodo_pago??0}});if(!method?.estado)fail('Selecciona un método de pago activo.');
  const cardMethod=method.nombre.toLowerCase().includes('tarjeta');
  if(cardMethod&&!body.id_tarjeta)fail('Selecciona la tarjeta de transporte.');
  if(!cardMethod&&body.id_tarjeta)fail('La tarjeta requiere el método de pago Tarjeta.');
  const card=body.id_tarjeta?bid(body.id_tarjeta):null;
  if(card){
   const result=await tx.tarjetas.updateMany({where:{id_tarjeta:card,estado:'ACTIVA',saldo:{gte:ticket.precio}},data:{saldo:{decrement:ticket.precio}}});if(result.count!==1)fail('Tarjeta inactiva o saldo insuficiente.');
  }
  await tx.pagos.create({data:{id_ticket:ticket.id_ticket,id_metodo_pago:method.id_metodo_pago,id_tarjeta:card,monto:ticket.precio}});
  await this.audit(tx,actor,'PAGO_TICKET','tickets',ticket.id_ticket);
 }
 async ticket(id:string,body:TicketDto,actor:Actor){authorize(actor,ops);return this.db.$transaction(async tx=>{
  const trip=await this.tripLock(tx,bid(id),actor);if(!['PROGRAMADO','EN_CURSO'].includes(trip.estado))fail('El recorrido ya terminó.');
  await this.expire(tx,trip.id_recorrido);await this.stationPermission(tx,actor,body.id_estacion_ingreso);
  const stops=await tx.recorrido_estacion.findMany({where:{id_recorrido:trip.id_recorrido},orderBy:{orden:'asc'}});
  const origin=stops.find(s=>s.id_estacion===body.id_estacion_ingreso),dest=stops.find(s=>s.id_estacion===body.id_estacion_destino);
  if(!origin||!dest||dest.orden<=origin.orden||origin.hora_salida)fail('Ingreso y destino deben estar en el recorrido, en ese orden, y no haber pasado la estación de ingreso.');
  const seat=await tx.asientos.findUnique({where:{id_asiento:body.id_asiento}});if(!seat||seat.id_bus!==trip.id_bus||seat.estado_operativo!=='HABILITADO')fail('El asiento no está disponible en este bus.');
  if(await tx.tickets.count({where:{id_recorrido:trip.id_recorrido,id_asiento:body.id_asiento,estado:{in:['RESERVADO','EMITIDO']}}}))fail('Este asiento acaba de ser ocupado. Selecciona otro.');
  if(!await tx.pasajeros.findUnique({where:{id_pasajero:body.id_pasajero}}))fail('Pasajero inexistente.');
  if(await tx.tickets.count({where:{id_recorrido:trip.id_recorrido,id_pasajero:body.id_pasajero,estado:{in:['RESERVADO','EMITIDO']}}}))fail('El pasajero ya tiene un asiento en este recorrido.');
  const price=process.env.TICKET_PRICE??'1.00';if(!/^\d{1,6}(\.\d{1,2})?$/.test(price))fail('Tarifa no configurada.');
  const ticket=await tx.tickets.create({data:{...body,id_tarjeta:undefined,id_metodo_pago:undefined,id_operador:actor.id_usuario,id_recorrido:trip.id_recorrido,numero_ticket:'TM-'+randomUUID(),codigo_validacion:randomUUID(),precio:price,reservado_hasta:body.estado==='RESERVADO'?new Date(Date.now()+Number(process.env.RESERVATION_MINUTES??5)*60000):null} as any});
  if(body.estado==='EMITIDO')await this.pay(tx,ticket,body as PaymentDto,actor);
  await this.audit(tx,actor,body.estado==='RESERVADO'?'RESERVAR_ASIENTO':'EMITIR_TICKET','tickets',ticket.id_ticket);return ticket;
 });}
 async ticketAction(id:string,action:string,body:PaymentDto|undefined,actor:Actor){authorize(actor,ops);
  const previous=await this.db.tickets.findUnique({where:{id_ticket:bid(id)}});if(!previous)throw new NotFoundException();
  return this.db.$transaction(async tx=>{
   const trip=await this.tripLock(tx,previous.id_recorrido,actor);await this.expire(tx,trip.id_recorrido);
   const ticket=(await tx.tickets.findUnique({where:{id_ticket:previous.id_ticket}}))!;
   await this.stationPermission(tx,actor,action==='salida'?ticket.id_estacion_destino:ticket.id_estacion_ingreso);
   if(!['PROGRAMADO','EN_CURSO'].includes(trip.estado))fail('El recorrido ya terminó.');
   if(!['RESERVADO','EMITIDO'].includes(ticket.estado))fail('El ticket ya está cerrado.');
   let estado:'EMITIDO'|'CANCELADO'|'FINALIZADO';
   if(action==='confirmar'){
    if(ticket.estado!=='RESERVADO'||!body)fail('La reserva ya no está disponible.');
    const stop=await tx.recorrido_estacion.findFirst({where:{id_recorrido:trip.id_recorrido,id_estacion:ticket.id_estacion_ingreso}});if(stop?.hora_salida)fail('El bus ya salió de la estación de ingreso.');
    await this.pay(tx,ticket,body,actor);estado='EMITIDO';
   }else if(action==='cancelar'){
    if(trip.estado!=='PROGRAMADO')fail('Solo puedes cancelar antes del inicio del recorrido.');estado='CANCELADO';
    const payment=await tx.pagos.findUnique({where:{id_ticket:ticket.id_ticket}});
    if(payment&&payment.estado==='APROBADO'){
     if(payment.id_tarjeta)await tx.tarjetas.update({where:{id_tarjeta:payment.id_tarjeta},data:{saldo:{increment:payment.monto}}});
     await tx.pagos.update({where:{id_pago:payment.id_pago},data:{estado:payment.id_tarjeta?'REEMBOLSADO':'REEMBOLSO_PENDIENTE'}});
    }
   }else if(action==='salida'){
    if(trip.estado!=='EN_CURSO'||ticket.estado!=='EMITIDO')fail('Solo se registra salida de pasajeros durante un recorrido en curso.');estado='FINALIZADO';
   }else fail('Acción inválida.');
   const result=await tx.tickets.update({where:{id_ticket:ticket.id_ticket},data:{estado,reservado_hasta:null}});
   await this.audit(tx,actor,action.toUpperCase()+'_TICKET','tickets',ticket.id_ticket);return result;
  });
 }
 async tripAction(id:string,action:string,actor:Actor){authorize(actor,supervisors);return this.db.$transaction(async tx=>{
  await this.infra(tx);const trip=await this.tripLock(tx,bid(id),actor);
  if(action==='iniciar'){
   if(trip.estado!=='PROGRAMADO')fail('El recorrido no está programado.');
   await this.expire(tx,trip.id_recorrido);
   const bus=await tx.buses.findUnique({where:{id_bus:trip.id_bus}});if(bus?.estado!=='ACTIVO')fail('Bus no disponible.');
   if(!await tx.pilotos.findFirst({where:{id_piloto:trip.id_piloto,estado:true}}))fail('Piloto no disponible.');
   const waiting=await tx.recorrido_estacion.findFirst({where:{id_recorrido:trip.id_recorrido},orderBy:{orden:'asc'}});
   if(waiting&&!waiting.hora_llegada)fail('Registra la llegada del bus a la primera estación.');
   await this.waitRule(tx,trip,waiting!);
   await tx.recorridos.update({where:{id_recorrido:trip.id_recorrido},data:{estado:'EN_CURSO',hora_inicio:new Date()}});
  }else if(action==='finalizar'){
   if(trip.estado!=='EN_CURSO')fail('El recorrido no está en curso.');
   const last=await tx.recorrido_estacion.findFirst({where:{id_recorrido:trip.id_recorrido},orderBy:{orden:'desc'}});
   if(!last?.hora_llegada)fail('Registra la llegada a la estación final antes de finalizar.');
   await tx.recorridos.update({where:{id_recorrido:trip.id_recorrido},data:{estado:'FINALIZADO',hora_fin:new Date()}});
   await tx.tickets.updateMany({where:{id_recorrido:trip.id_recorrido,estado:'EMITIDO'},data:{estado:'FINALIZADO'}});
   await tx.tickets.updateMany({where:{id_recorrido:trip.id_recorrido,estado:'RESERVADO'},data:{estado:'CANCELADO'}});
  }else if(action==='cancelar'){
   if(trip.estado!=='PROGRAMADO'||await tx.tickets.count({where:{id_recorrido:trip.id_recorrido,estado:{in:['RESERVADO','EMITIDO']}}}))fail('Cancela primero los tickets del recorrido programado.');
   await tx.recorridos.update({where:{id_recorrido:trip.id_recorrido},data:{estado:'CANCELADO'}});
  }else fail('Acción inválida.');
  await this.audit(tx,actor,action.toUpperCase()+'_RECORRIDO','recorridos',trip.id_recorrido);return {ok:true};
 });}
 async waitRule(tx:any,trip:any,stop:any){
  const count=await tx.tickets.count({where:{id_recorrido:trip.id_recorrido,estado:'EMITIDO'}});
  const bus=await tx.buses.findUnique({where:{id_bus:trip.id_bus}});
  const minutes=Number(process.env.LOW_OCCUPANCY_WAIT_MINUTES??5);
  if(count/bus.capacidad_maxima<.25&&(!stop.hora_llegada||Date.now()-stop.hora_llegada.getTime()<minutes*60000))fail(`Ocupación menor al 25%: espera ${minutes} minutos desde la llegada.`);
 }
 async visit(id:string,body:VisitDto,actor:Actor){authorize(actor,ops);return this.db.$transaction(async tx=>{
  const trip=await this.tripLock(tx,bid(id),actor);if(!['PROGRAMADO','EN_CURSO'].includes(trip.estado))fail('El recorrido ya terminó.');
  await this.stationPermission(tx,actor,body.id_estacion);await this.expire(tx,trip.id_recorrido);
  const stops=await tx.recorrido_estacion.findMany({where:{id_recorrido:trip.id_recorrido},orderBy:{orden:'asc'}});
  const index=stops.findIndex(s=>s.id_estacion===body.id_estacion);if(index<0)fail('Estación fuera del recorrido.');const stop=stops[index];
  if(body.accion==='LLEGADA'){
   if(stop.hora_llegada||(index>0&&(!stops[index-1].hora_salida||trip.estado!=='EN_CURSO')))fail('Registra las visitas en orden.');
   await tx.recorrido_estacion.update({where:{id_recorrido_estacion:stop.id_recorrido_estacion},data:{hora_llegada:new Date()}});
   await tx.tickets.updateMany({where:{id_recorrido:trip.id_recorrido,id_estacion_destino:body.id_estacion,estado:'EMITIDO'},data:{estado:'FINALIZADO'}});
  }else{
   if(!stop.hora_llegada||stop.hora_salida||trip.estado!=='EN_CURSO')fail('Primero registra la llegada e inicia el recorrido.');
   await this.waitRule(tx,trip,stop);
   await tx.tickets.updateMany({where:{id_recorrido:trip.id_recorrido,id_estacion_ingreso:body.id_estacion,estado:'RESERVADO'},data:{estado:'CANCELADO'}});
   await tx.recorrido_estacion.update({where:{id_recorrido_estacion:stop.id_recorrido_estacion},data:{hora_salida:new Date()}});
  }
  await this.audit(tx,actor,body.accion,'recorrido_estacion',stop.id_recorrido_estacion);return {ok:true};
 });}
 async recharge(body:RechargeDto,actor:Actor){authorize(actor,['ADMINISTRADOR','FINANCIERO']);if(Number(body.monto)<=0)fail('El monto debe ser positivo.');return this.db.$transaction(async tx=>{
  if(!await tx.metodos_pago.findFirst({where:{id_metodo_pago:body.id_metodo_pago,estado:true}}))fail('Método no disponible.');
  const result=await tx.tarjetas.updateMany({where:{id_tarjeta:bid(body.id_tarjeta),estado:'ACTIVA'},data:{saldo:{increment:body.monto}}});if(result.count!==1)fail('Tarjeta inactiva.');
  const row=await tx.recargas.create({data:{id_tarjeta:bid(body.id_tarjeta),id_usuario:actor.id_usuario,id_metodo_pago:body.id_metodo_pago,monto:body.monto}});
  await this.audit(tx,actor,'RECARGA','recargas',row.id_recarga);return row;
 });}
 async station(id:string,body:StationDto,actor:Actor){authorize(actor,ops);return this.db.$transaction(async tx=>{
  const sid=Number(bid(id));await this.stationPermission(tx,actor,sid);
  await tx.$queryRaw`SELECT id_estacion FROM estaciones WHERE id_estacion=${sid} FOR UPDATE`;
  const station=await tx.estaciones.update({where:{id_estacion:sid},data:{pasajeros_esperando:body.pasajeros}});
  if(station.capacidad_maxima&&body.pasajeros>station.capacidad_maxima*1.5){
   if(!await tx.alertas.findFirst({where:{id_estacion:sid,tipo:'SOBRECUPO',estado:'PENDIENTE'}}))await tx.alertas.create({data:{id_estacion:sid,tipo:'SOBRECUPO',descripcion:`${body.pasajeros} pasajeros; capacidad ${station.capacidad_maxima}.`}});
  }else await tx.alertas.updateMany({where:{id_estacion:sid,tipo:'SOBRECUPO',estado:'PENDIENTE'},data:{estado:'RESUELTA'}});
  await this.audit(tx,actor,'ACTUALIZAR_OCUPACION','estaciones',sid);return station;
 });}
 async setSeat(id:string,body:SeatDto,actor:Actor){authorize(actor,supervisors);return this.db.$transaction(async tx=>{
  await this.infra(tx);const sid=Number(bid(id));const seat=await tx.asientos.findUnique({where:{id_asiento:sid}});if(!seat)throw new NotFoundException();
  const bus=await tx.buses.findUnique({where:{id_bus:seat.id_bus}});if(!bus||Number(seat.numero_asiento)>bus.capacidad_maxima)fail('Este asiento excede la capacidad actual del bus.');
  const pending=await tx.recorridos.findMany({where:{id_bus:seat.id_bus,estado:{in:['PROGRAMADO','EN_CURSO']}}});
  for(const t of pending){await this.tripLock(tx,t.id_recorrido,actor);await this.expire(tx,t.id_recorrido);}
  if(await tx.tickets.count({where:{id_asiento:sid,estado:{in:['EMITIDO','RESERVADO']}}}))fail('El asiento tiene tickets activos.');
  await this.audit(tx,actor,'ESTADO_ASIENTO','asientos',sid,body.estado);return tx.asientos.update({where:{id_asiento:sid},data:{estado_operativo:body.estado}});
 });}
 async report(name:string,actor:Actor){
  const tables:Record<string,string[]>={tickets:ops,pagos:['ADMINISTRADOR','FINANCIERO'],recargas:['ADMINISTRADOR','FINANCIERO'],alertas:[...supervisors,'SEGURIDAD'],bitacora:['ADMINISTRADOR'],bus_linea_historial:supervisors,bus_parqueo_historial:supervisors,recorrido_estacion:ops};
  if(!tables[name])throw new NotFoundException();authorize(actor,tables[name]);
  // Los operadores solo consultan tickets y visitas de sus estaciones asignadas.
  let where:any={};if(!actor.roles.some(r=>supervisors.includes(r))&&['tickets','recorrido_estacion'].includes(name)){
   const assignments=await this.db.operador_estacion.findMany({where:{id_usuario:actor.id_usuario,fecha_inicio:{lte:new Date()},OR:[{fecha_fin:null},{fecha_fin:{gt:new Date()}}]}});
   where={[name==='tickets'?'id_estacion_ingreso':'id_estacion']:{in:assignments.map(a=>a.id_estacion)}};
  }
  const pk={tickets:'id_ticket',pagos:'id_pago',recargas:'id_recarga',alertas:'id_alerta',bitacora:'id_bitacora',bus_linea_historial:'id_asignacion',bus_parqueo_historial:'id_asignacion',recorrido_estacion:'id_recorrido_estacion'}[name]!;
  return (this.db as any)[name].findMany({where,take:1000,orderBy:{[pk]:'desc'}});
 }
 async closeGuard(id:string,actor:Actor){authorize(actor,['ADMINISTRADOR','SEGURIDAD']);return this.db.$transaction(async tx=>{
  await this.infra(tx);const assignment=await tx.guardia_acceso.findUnique({where:{id_asignacion:bid(id)}});if(!assignment||assignment.fecha_fin)fail('Asignación cerrada o inexistente.');
  if(!await tx.guardia_acceso.count({where:{id_acceso:assignment.id_acceso,id_asignacion:{not:assignment.id_asignacion},fecha_fin:null,fecha_inicio:{lte:new Date()},guardias:{estado:true}}}))fail('Asigna el guardia de reemplazo antes de cerrar este turno.');
  await this.audit(tx,actor,'CERRAR_TURNO','guardia_acceso',assignment.id_asignacion);return tx.guardia_acceso.update({where:{id_asignacion:assignment.id_asignacion},data:{fecha_fin:new Date()}});
 });}
 async refund(id:string,actor:Actor){authorize(actor,['ADMINISTRADOR','FINANCIERO']);return this.db.$transaction(async tx=>{
  const result=await tx.pagos.updateMany({where:{id_pago:bid(id),estado:'REEMBOLSO_PENDIENTE'},data:{estado:'REEMBOLSADO'}});if(!result.count)fail('El pago no tiene reembolso pendiente.');
  await this.audit(tx,actor,'CONFIRMAR_REEMBOLSO_EFECTIVO','pagos',bid(id));return {ok:true};
 });}
}
@Controller() @UseGuards(AuthGuard)
export class OperationsController {
 constructor(private o:Operations){}
 @Get('dashboard') dashboard(@Req() r:any){return this.o.dashboard(r.actor);}
 @Get('buses') buses(@Req() r:any){return this.o.buses(r.actor);}
 @Post('buses/:id/capacidad') capacity(@Param('id') id:string,@Body() b:CapacityDto,@Req() r:any){return this.o.resizeBus(id,b,r.actor);}
 @Post('buses') bus(@Body() b:BusDto,@Req() r:any){return this.o.createBus(b,r.actor);}
 @Post('buses/:id/asignar') assign(@Param('id') id:string,@Body() b:AssignmentDto,@Req() r:any){return this.o.assignBus(id,b,r.actor);}
 @Get('recorridos') trips(@Req() r:any){return this.o.trips(r.actor);}
 @Post('recorridos') trip(@Body() b:TripDto,@Req() r:any){return this.o.createTrip(b,r.actor);}
 @Get('recorridos/:id/asientos') seats(@Param('id') id:string,@Req() r:any){return this.o.seats(id,r.actor);}
 @Post('recorridos/:id/tickets') ticket(@Param('id') id:string,@Body() b:TicketDto,@Req() r:any){return this.o.ticket(id,b,r.actor);}
 @Post('recorridos/:id/visitas') visit(@Param('id') id:string,@Body() b:VisitDto,@Req() r:any){return this.o.visit(id,b,r.actor);}
 @Post('recorridos/:id/:action') action(@Param('id') id:string,@Param('action') a:string,@Req() r:any){return this.o.tripAction(id,a,r.actor);}
 @Post('tickets/:id/confirmar') confirm(@Param('id') id:string,@Body() b:PaymentDto,@Req() r:any){return this.o.ticketAction(id,'confirmar',b,r.actor);}
 @Post('tickets/:id/:action') ticketAction(@Param('id') id:string,@Param('action') a:string,@Req() r:any){return this.o.ticketAction(id,a,undefined,r.actor);}
 @Post('recargas') recharge(@Body() b:RechargeDto,@Req() r:any){return this.o.recharge(b,r.actor);}
 @Post('estaciones/:id/ocupacion') station(@Param('id') id:string,@Body() b:StationDto,@Req() r:any){return this.o.station(id,b,r.actor);}
 @Post('asientos/:id/estado') seat(@Param('id') id:string,@Body() b:SeatDto,@Req() r:any){return this.o.setSeat(id,b,r.actor);}
 @Get('reportes/:name') report(@Param('name') n:string,@Req() r:any){return this.o.report(n,r.actor);}
 @Post('guardias/asignaciones/:id/cerrar') guard(@Param('id') id:string,@Req() r:any){return this.o.closeGuard(id,r.actor);}
 @Post('pagos/:id/reembolso') refund(@Param('id') id:string,@Req() r:any){return this.o.refund(id,r.actor);}
}
