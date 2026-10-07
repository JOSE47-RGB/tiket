const {spawn}=require('node:child_process');
const {existsSync}=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
if(!existsSync(path.join(root,'backend','.env'))){console.error('Falta backend/.env. Configura primero la conexión con MariaDB.');process.exit(1);}
const children=[];
let closing=false;
function stop(code=0){if(closing)return;closing=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code;}
function run(command,args,cwd,env={}){const child=spawn(command,args,{cwd,env:{...process.env,...env},stdio:'inherit'});children.push(child);child.on('error',e=>{console.error(e.message);stop(1)});child.on('exit',code=>{if(!closing)stop(code??1)});return child;}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
run(process.execPath,['dist/main.js'],path.join(root,'backend'));
run(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5187','--strictPort'],path.join(root,'frontend'),{BACKEND_URL:'http://127.0.0.1:3107'});
console.log('Transmetro local: http://127.0.0.1:5187 · API: http://127.0.0.1:3107/api/health');
