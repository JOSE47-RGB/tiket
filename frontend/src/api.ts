export async function api(path:string,method='GET',body?:unknown){
 const csrf=document.cookie.split('; ').find(x=>x.startsWith('csrf='))?.split('=').slice(1).join('=')??'';
 let r:Response;
 try {r=await fetch('/api/'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});} catch {throw new Error('No pudimos conectar con el sistema. Revisa tu conexión e inténtalo de nuevo.');}
 if(r.status>=500)throw new Error('No pudimos completar la operación. Inténtalo de nuevo; si continúa, avisa al administrador.');
 if(r.status===429)throw new Error('Has realizado varias acciones seguidas. Espera un momento e inténtalo de nuevo.');
 const result=await r.json().catch(()=>{throw new Error('No pudimos leer la respuesta del sistema. Actualiza la pantalla antes de volver a guardar.');});
 if(!r.ok){if(r.status===401&&path!=='auth/login')window.dispatchEvent(new Event('session-expired'));throw new Error(Array.isArray(result.message)?result.message.join(' · '):result.message??'No se pudo completar la operación.');}return result;
}
export function csv(rows:Record<string,unknown>[],name:string){
 if(!rows.length)return;
 const keys=Object.keys(rows[0]).filter(k=>typeof rows[0][k]!=='object'||rows[0][k]===null);
 const cell=(v:unknown)=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
 const data='\uFEFF'+[keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n');
 const url=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export const label=(s:string)=>s.replace(/^id_/,'').replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
