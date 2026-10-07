import {BadRequestException} from '@nestjs/common';
// Guatemala usa UTC-06:00; la fecha del servicio permanece como fecha local.
export function scheduleWindow(date:string,time:string,end:string){
 const valid=(value:string)=>{
  if(!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value))throw new BadRequestException('Horario inválido.');
  const instant=new Date(value+':00-06:00');
  if(Number.isNaN(instant.getTime())||new Date(instant.getTime()-6*3600000).toISOString().slice(0,16)!==value)throw new BadRequestException('Fecha del horario inválida.');
  return instant;
 };
 const departure=valid(date+'T'+time),arrival=valid(end);
 if(arrival<=departure)throw new BadRequestException('La llegada estimada debe ser posterior a la salida.');
 return {departure,arrival};
}
