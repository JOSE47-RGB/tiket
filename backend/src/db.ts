import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
@Injectable()
export class Db extends PrismaClient implements OnModuleInit, OnModuleDestroy {
 async onModuleInit(){ await this.$connect(); }
 async onModuleDestroy(){ await this.$disconnect(); }
}
export type Actor = { id_usuario:number; username:string; roles:string[]; id_piloto:number|null };
