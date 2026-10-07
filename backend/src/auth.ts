import { Body, CanActivate, Controller, ExecutionContext, ForbiddenException, Get, Injectable, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { IsString, Length, Matches } from 'class-validator';
import { compare } from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { Db, Actor } from './db';
import type { Response, Request } from 'express';
export class LoginDto {
 @IsString() @Length(1,50) username!:string;
 @IsString() @Length(1,72) password!:string;
}
export function authorize(actor:Actor, roles:string[]){
 if(!actor.roles.some(r=>roles.includes(r))) throw new ForbiddenException('No tienes permiso para esta operación.');
}
@Injectable()
export class AuthGuard implements CanActivate {
 constructor(private db:Db, private jwt:JwtService){}
 async canActivate(context:ExecutionContext){
  const req=context.switchToHttp().getRequest();
  try {
   const data=await this.jwt.verifyAsync(req.cookies?.session ?? '', {algorithms:['HS256']});
   const user=await this.db.usuarios.findUnique({where:{id_usuario:Number(data.sub)},include:{usuario_rol:{include:{roles:true}}}});
   if(!user?.estado) throw new Error();
   req.actor={id_usuario:user.id_usuario,username:user.username,id_piloto:user.id_piloto,roles:user.usuario_rol.map(r=>r.roles.nombre)};
  } catch { throw new UnauthorizedException('Inicia sesión para continuar.'); }
  if(!['GET','HEAD','OPTIONS'].includes(req.method) && (!req.cookies.csrf || req.headers['x-csrf-token']!==req.cookies.csrf)) throw new ForbiddenException('Sesión de formulario inválida. Vuelve a iniciar sesión.');
  return true;
 }
}
@Controller('auth')
export class AuthController {
 constructor(private db:Db,private jwt:JwtService){}
 @Post('login') @Throttle({default:{limit:10,ttl:60000}}) async login(@Body() body:LoginDto,@Req() req:Request,@Res({passthrough:true}) res:Response){
  if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host && req.headers.origin!==process.env.APP_ORIGIN) throw new ForbiddenException('Origen no permitido.');
  const user=await this.db.usuarios.findUnique({where:{username:body.username},include:{usuario_rol:{include:{roles:true}}}});
  const valid=await compare(body.password,user?.password_hash ?? '$2b$12$Juq75/3Il71phznENlrHWOfKuOxGr6CmaQQCuFOnPHFEcYCqaFFvC');
  if(!user?.estado || !valid) throw new UnauthorizedException('Usuario o contraseña incorrectos.');
  const token=await this.jwt.signAsync({sub:user.id_usuario},{expiresIn:'8h'});
  const opts={secure:process.env.COOKIE_SECURE==='true',sameSite:'strict' as const,path:'/',maxAge:8*60*60*1000};
  res.cookie('session',token,{...opts,httpOnly:true});
  res.cookie('csrf',randomBytes(32).toString('hex'),opts);
  await this.db.usuarios.update({where:{id_usuario:user.id_usuario},data:{ultimo_acceso:new Date()}});
  await this.db.bitacora.create({data:{id_usuario:user.id_usuario,accion:'INICIO_SESION',tabla_afectada:'usuarios',registro_id:BigInt(user.id_usuario)}});
  return {username:user.username,roles:user.usuario_rol.map(r=>r.roles.nombre)};
 }
 @Get('me') @UseGuards(AuthGuard) me(@Req() req:any){return req.actor;}
 @Post('logout') @UseGuards(AuthGuard) logout(@Res({passthrough:true}) res:Response){res.clearCookie('session',{path:'/'});res.clearCookie('csrf',{path:'/'});return {ok:true};}
}
