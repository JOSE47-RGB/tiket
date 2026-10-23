// Solo bases aisladas locales: nunca toma DATABASE_URL del archivo privado.
const {PrismaClient}=require('../backend/node_modules/@prisma/client');
const {hash}=require('../backend/node_modules/bcrypt');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const url=new URL(process.env.TEST_DATABASE_URL||'invalid:');
if(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw Error('Se requiere TEST_DATABASE_URL local terminada en _test.');
if(!process.env.TEST_UI_PASSWORD)throw Error('Genera TEST_UI_PASSWORD para estas pruebas.');
const env={...process.env,DATABASE_URL:url.href,ADMIN_USERNAME:'ux_admin',ADMIN_PASSWORD:process.env.TEST_UI_PASSWORD};
for(const args of [['node_modules/prisma/build/index.js','migrate','deploy'],['scripts/seed.cjs','--demo']]){
 const r=spawnSync(process.execPath,args,{cwd:path.join(__dirname,'../backend'),env,stdio:'inherit'});if(r.status)process.exit(r.status);
}
const db=new PrismaClient({datasources:{db:{url:url.href}}});
(async()=>{
 const pilot=await db.pilotos.findFirst();const stations=await db.estaciones.findMany();
 for(const [name,role] of [['admin','ADMINISTRADOR'],['supervisor','SUPERVISOR'],['operator','OPERADOR'],['finance','FINANCIERO'],['security','SEGURIDAD'],['pilot','PILOTO']]){
 const data={password_hash:await hash(process.env.TEST_UI_PASSWORD,4),tutorial_visto:false,...(name==='pilot'?{id_piloto:pilot.id_piloto}:{})};
 const u=await db.usuarios.upsert({where:{username:'ux_'+name},update:data,create:{username:'ux_'+name,...data,usuario_rol:{create:{roles:{connect:{nombre:role}}}}}});
 if(name==='operator')for(const s of stations)if(!await db.operador_estacion.findFirst({where:{id_usuario:u.id_usuario,id_estacion:s.id_estacion}}))await db.operador_estacion.create({data:{id_usuario:u.id_usuario,id_estacion:s.id_estacion,fecha_inicio:new Date('2020-01-01')}});
 }
})().finally(()=>db.$disconnect());
