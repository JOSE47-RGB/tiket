import 'reflect-metadata';
import 'dotenv/config';
import { ArgumentsHost, Controller, Get, Catch, ExceptionFilter, HttpException, Module, ValidationPipe } from '@nestjs/common';
import { NestFactory, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { Db } from './db';
import { AuthController, AuthGuard } from './auth';
import { OperationsController, Operations } from './operations';
import { CatalogController, Catalog } from './catalog';
if(!process.env.JWT_SECRET || process.env.JWT_SECRET.length<32) throw new Error('JWT_SECRET requiere al menos 32 caracteres.');
(BigInt.prototype as any).toJSON=function(){return this.toString()};
@Catch()
class Errors implements ExceptionFilter {
 catch(error:any,host:ArgumentsHost){
  const res=host.switchToHttp().getResponse();
  if(error instanceof HttpException) return res.status(error.getStatus()).json(error.getResponse());
  const conflict=['P2002','P2003','P2025','P2034'].includes(error.code);
  if(!conflict) console.error(error);
  res.status(conflict?409:500).json({message:conflict?'El registro cambió, ya existe o tiene relaciones activas. Actualiza e inténtalo de nuevo.':'No se pudo completar la operación.'});
 }
}
@Controller('health')
class HealthController{constructor(private db:Db){} @Get() async get(){await this.db.$queryRaw`SELECT 1`;return {status:'ok'};}}
@Module({imports:[JwtModule.register({global:true,secret:process.env.JWT_SECRET}),ThrottlerModule.forRoot([{ttl:60000,limit:120}])],controllers:[HealthController,AuthController,OperationsController,CatalogController],providers:[Db,AuthGuard,Operations,Catalog,{provide:APP_GUARD,useClass:ThrottlerGuard}]})
class AppModule{}
async function bootstrap(){
 const app=await NestFactory.create(AppModule);
 app.setGlobalPrefix('api');
 app.use(cookieParser());
 app.use((req:any,res:any,next:any)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');next();});
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 app.useGlobalFilters(new Errors());
 app.enableShutdownHooks();
 await app.listen(Number(process.env.PORT??3000),process.env.HOST??'0.0.0.0');
}
bootstrap();
