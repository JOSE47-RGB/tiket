const fs=require('node:fs');
const path=require('node:path');
const {randomBytes}=require('node:crypto');
const file=path.join(__dirname,'..','.env');
if(fs.existsSync(file)){console.log('El archivo .env ya existe; se conserva la configuración.');process.exit(0);}
const hex=()=>randomBytes(24).toString('hex');
fs.writeFileSync(file,[`DB_PASSWORD=${hex()}`,`DB_ROOT_PASSWORD=${hex()}`,`JWT_SECRET=${hex()}`,'ADMIN_USERNAME=admin',`ADMIN_PASSWORD=${randomBytes(18).toString('base64url')}`,'COOKIE_SECURE=false','BIND_ADDRESS=127.0.0.1','WEB_PORT=8080','PMA_PORT=8081','TICKET_PRICE=1.00','RESERVATION_MINUTES=5','LOW_OCCUPANCY_WAIT_MINUTES=5','SEED_DEMO=true',''].join('\n'),{mode:0o600,flag:'wx'});
console.log('Configuración creada en .env. Consulta ADMIN_USERNAME y ADMIN_PASSWORD para ingresar.');
