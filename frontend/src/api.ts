export async function api(path:string,method='GET',body?:unknown){
 const csrf=document.cookie.split('; ').find(x=>x.startsWith('csrf='))?.split('=').slice(1).join('=')??'';
 const r=await fetch('/api/'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});
 const result=await r.json().catch(()=>({message:'El servidor no está disponible.'}));
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
