import { BadRequestException, Body, Controller, Get, Injectable, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Db, Actor } from './db';
import { authorize, AuthGuard } from './auth';
import { catalogMeta } from './catalog-meta';
import { hash } from 'bcrypt';
import { IsArray, IsInt, IsOptional, IsString, Length, ArrayNotEmpty, ArrayUnique, IsIn, Min } from 'class-validator';
const roles=['ADMINISTRADOR','SUPERVISOR','OPERADOR','SEGURIDAD','FINANCIERO','PILOTO'];
class UserDto {
 @IsString() @Length(3,50) username!:string;
 @IsString() @Length(12,72) password!:string;
 @IsString() @Length(1,100) nombres!:string;
 @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsIn(roles,{each:true}) roles!:string[];
 @IsOptional() @IsInt() @Min(1) id_piloto?:number;
}
@Injectable()
export class Catalog {
 constructor(private db:Db){}
 metadata(actor:Actor){return Object.fromEntries(Object.entries(catalogMeta).map(([n,m])=>[n,{...m,writable:m.roles.some((r:string)=>actor.roles.includes(r))}]))}
 async list(name:string,actor:Actor){
  const m=catalogMeta[name];if(!m) throw new NotFoundException();
  authorize(actor,['ADMINISTRADOR','SUPERVISOR','OPERADOR','SEGURIDAD','FINANCIERO']);
  return (this.db as any)[name].findMany({take:1000,orderBy:m.keys.map((k:string)=>({[k]:'asc'}))});
 }
 async save(name:string,id:string|undefined,body:any,actor:Actor){
  const m=catalogMeta[name];if(!m) throw new NotFoundException();authorize(actor,m.roles);
  if(!body || typeof body!=='object' || Array.isArray(body))throw new BadRequestException('Datos inválidos.');
  const permitted=m.fields.map((f:any)=>f.name).concat(name==='accesos'?['id_guardia']:[]);
  if(Object.keys(body).some(k=>!permitted.includes(k)))throw new BadRequestException('Hay campos no permitidos.');
  const data:any={};
  for(const f of m.fields){
   let v=body[f.name];
   if(v===undefined || v===''){if(f.required&&!id)throw new BadRequestException(`Completa ${f.name}.`);continue;}
   if(v===null){if(f.required)throw new BadRequestException('Campo obligatorio.');data[f.name]=null;continue;}
   if(f.options){if(!f.options.includes(v))throw new BadRequestException('Estado inválido.');}
   else if(['INT','BIGINT','TINYINT','DECIMAL'].includes(f.type)){
    if(!/^\d+(\.\d{1,2})?$/.test(String(v))||!Number.isFinite(Number(v)))throw new BadRequestException(`Valor numérico inválido: ${f.name}.`);
    if(f.type!=='DECIMAL'&&!Number.isSafeInteger(Number(v)))throw new BadRequestException('Se requiere un entero.');
    v=f.type==='BIGINT'?BigInt(v):Number(v);
    if((f.name.startsWith('id_')||f.name.includes('capacidad')||f.name==='orden')&&Number(v)<1)throw new BadRequestException('El valor debe ser mayor que cero.');
    if(f.type==='TINYINT'){if(![0,1].includes(v))throw new BadRequestException('Estado inválido.');v=Boolean(v);}
   }else if(['DATE','DATETIME','TIMESTAMP'].includes(f.type)){
    v=new Date(v);if(Number.isNaN(v.getTime()))throw new BadRequestException('Fecha inválida.');
   }else if(typeof v!=='string'||v.length>(f.max??200)||!v.trim())throw new BadRequestException(`Texto inválido: ${f.name}.`);
   data[f.name]=v;
  }
  const parts=id?.split('~');
  const key=parts?Object.fromEntries(m.keys.map((k:string,i:number)=>{if(!/^\d+$/.test(parts[i]??''))throw new BadRequestException('Identificador inválido.');return [k,['id_asignacion','id_tarjeta'].includes(k)?BigInt(parts[i]):Number(parts[i])]})):null;
  const where=key?(m.keys.length===1?key:{[m.keys.join('_')]:key}):undefined;
  return this.db.$transaction(async(tx:any)=>{
   // Un cerrojo común serializa cambios de infraestructura y asignaciones.
   await tx.$queryRaw`SELECT id_linea FROM lineas ORDER BY id_linea FOR UPDATE`;
   const old=where?await tx[name].findUnique({where}):null;
   if(id&&!old)throw new NotFoundException('Registro no encontrado.');
   if(id&&m.keys.some((k:string)=>data[k]!==undefined&&String(data[k])!==String(old[k])))throw new BadRequestException('No se puede cambiar la identidad del registro.');
   if(name==='lineas'&&!id && data.estado===undefined)data.estado=false;
   if(name==='accesos'){
    const guard=Number(body.id_guardia);
    if(!id && (!Number.isSafeInteger(guard)||guard<1||!await tx.guardias.findFirst({where:{id_guardia:guard,estado:true}})))throw new BadRequestException('Selecciona un guardia activo para el acceso.');
    if(id&&data.estado===true&&!(await tx.guardia_acceso.count({where:{id_acceso:old.id_acceso,fecha_fin:null,fecha_inicio:{lte:new Date()},guardias:{estado:true}}})))throw new BadRequestException('El acceso necesita un guardia activo.');
   }
   if(name==='guardias'&&data.estado===false&&await tx.guardia_acceso.count({where:{id_guardia:old?.id_guardia,fecha_fin:null}}))throw new BadRequestException('Reasigna sus accesos antes de desactivar al guardia.');
   if(name==='guardia_acceso'){
    if(id)throw new BadRequestException('Usa el cierre de asignación y registra un nuevo turno.');
    if(new Date(data.fecha_inicio)>new Date()||!await tx.guardias.findFirst({where:{id_guardia:data.id_guardia,estado:true}}))throw new BadRequestException('El guardia debe estar activo y el turno haber comenzado.');
   }
   if(name==='linea_estacion'){
    const lid=data.id_linea??old?.id_linea;
    const sid=data.id_estacion??old?.id_estacion;
    if(!await tx.estaciones.findFirst({where:{id_estacion:sid,estado:true}}))throw new BadRequestException('Selecciona una estación activa.');
    if(id&&(data.id_linea!==undefined&&data.id_linea!==old.id_linea||data.id_estacion!==undefined&&data.id_estacion!==old.id_estacion))throw new BadRequestException('No se puede cambiar la identidad de una relación.');
    if(await tx.recorridos.count({where:{id_linea:lid,estado:{in:['PROGRAMADO','EN_CURSO']}}}))throw new BadRequestException('Finaliza los recorridos pendientes antes de modificar la ruta.');
   }
   if(name==='estaciones'&&id&&data.estado===false&&await tx.linea_estacion.count({where:{id_estacion:old?.id_estacion}}))throw new BadRequestException('La estación pertenece a una línea.');
   if(name==='parqueos'&&id){
    const used=await tx.bus_parqueo_historial.count({where:{id_parqueo:old.id_parqueo,fecha_fin:null}});
    if((data.estado===false&&used>0)||(data.capacidad!==undefined&&data.capacidad<used))throw new BadRequestException('El parqueo tiene buses asignados.');
   }
   const row=where?await tx[name].update({where,data}):await tx[name].create({data});
   if(name==='accesos'&&!id)await tx.guardia_acceso.create({data:{id_acceso:row.id_acceso,id_guardia:Number(body.id_guardia),fecha_inicio:new Date(),turno:'Inicial'}});
   if(name==='lineas'||name==='linea_estacion'){
    const lid=name==='lineas'?row.id_linea:row.id_linea;
    const line=await tx.lineas.findUnique({where:{id_linea:lid}});
    if(line.estado){
     const stations=await tx.linea_estacion.count({where:{id_linea:lid}});
     const buses=await tx.bus_linea_historial.count({where:{id_linea:lid,fecha_fin:null}});
     if(!stations||buses<stations||buses>stations*2)throw new BadRequestException('Para activar la línea debe tener entre uno y dos buses por estación.');
    }
   }
   await tx.bitacora.create({data:{id_usuario:actor.id_usuario,accion:id?'ACTUALIZAR':'CREAR',tabla_afectada:name,detalle:JSON.stringify(data,(_,v)=>typeof v==='bigint'?v.toString():v)}});
   return row;
  });
 }
 async users(actor:Actor){authorize(actor,['ADMINISTRADOR']);return this.db.usuarios.findMany({select:{id_usuario:true,username:true,nombres:true,estado:true,id_piloto:true,usuario_rol:{include:{roles:true}}}});}
 async createUser(body:UserDto,actor:Actor){
  authorize(actor,['ADMINISTRADOR']);
  if(Buffer.byteLength(body.password,'utf8')>72)throw new BadRequestException('Contraseña demasiado larga.');
  if(body.roles.includes('PILOTO')&&!body.id_piloto)throw new BadRequestException('Vincula el usuario con su piloto.');
  const password_hash=await hash(body.password,12);
  return this.db.$transaction(async tx=>{
   const row=await tx.usuarios.create({data:{username:body.username,nombres:body.nombres,password_hash,id_piloto:body.id_piloto,usuario_rol:{create:body.roles.map(nombre=>({roles:{connect:{nombre}}}))}},select:{id_usuario:true,username:true}});
   await tx.bitacora.create({data:{id_usuario:actor.id_usuario,accion:'CREAR_USUARIO',tabla_afectada:'usuarios',registro_id:BigInt(row.id_usuario)}});return row;
  });
 }
}
@Controller() @UseGuards(AuthGuard)
export class CatalogController {
 constructor(private catalog:Catalog){}
 @Get('catalogos') meta(@Req() req:any){return this.catalog.metadata(req.actor);}
 @Get('catalogos/:name') list(@Param('name') name:string,@Req() req:any){return this.catalog.list(name,req.actor);}
 @Post('catalogos/:name') create(@Param('name') name:string,@Body() body:any,@Req() req:any){return this.catalog.save(name,undefined,body,req.actor);}
 @Patch('catalogos/:name/:id') edit(@Param('name') name:string,@Param('id') id:string,@Body() body:any,@Req() req:any){return this.catalog.save(name,id,body,req.actor);}
 @Get('usuarios') users(@Req() req:any){return this.catalog.users(req.actor);}
 @Post('usuarios') user(@Body() body:UserDto,@Req() req:any){return this.catalog.createUser(body,req.actor);}
}
