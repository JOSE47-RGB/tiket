import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {api} from './api';
type Step={title:string;text:string;target:string;page:string};
export function tutorialSteps(roles:string[]):Step[]{
 const has=(...names:string[])=>roles.some(r=>names.includes(r));
 const operational=has('ADMINISTRADOR','SUPERVISOR','OPERADOR','PILOTO');
 const page=operational?'trips':has('FINANCIERO')?'finance':'stations';
 const steps:Step[]=[{title:'Bienvenido a Transmetro',text:'Aquí organizas los viajes y atiendes a los pasajeros según tus permisos. Este recorrido no registra ventas ni cambia datos.',target:'.start-guide',page:'dashboard'},
 {title:operational?'Encuentra tu viaje':page==='finance'?'Consulta saldo y recargas':'Revisa las estaciones',text:operational?'Abre un recorrido para consultar el bus, la ruta y su estado. Solo verás las tareas que permite tu cuenta.':'En esta pantalla encontrarás las tareas de tu jornada. La ayuda explica cada paso.',target:`[data-tour="nav-${page}"]`,page},
 {title:has('ADMINISTRADOR','SUPERVISOR','OPERADOR')?'Vende un boleto':has('PILOTO')?'Consulta los asientos':page==='finance'?'Registra una recarga':'Consulta los accesos',text:has('ADMINISTRADOR','SUPERVISOR','OPERADOR')?'Elige el viaje, un asiento y los datos del pasajero. Revisa el cobro antes de emitir el boleto.':has('PILOTO')?'Abre tu viaje para ver los asientos y el avance. Tu cuenta de piloto es de consulta.':'Revisa los datos antes de guardar. No es necesario completar ninguna operación durante el tutorial.',target:operational?'[data-tour="nav-boarding"]':'[data-tour="page-heading"]',page:operational?'boarding':page},
 {title:'Busca y consulta el estado',text:has('PILOTO')&&!has('ADMINISTRADOR','SUPERVISOR','OPERADOR')?'Escribe un bus o ruta para encontrar tu recorrido y revisar su estado.':'Usa la búsqueda para encontrar movimientos y revisar su estado; no modifica los registros.',target:has('PILOTO')&&!has('ADMINISTRADOR','SUPERVISOR','OPERADOR','FINANCIERO','SEGURIDAD')?'[data-tour="trip-search"]':'[aria-label="Buscar en reporte"]',page:has('PILOTO')&&!has('ADMINISTRADOR','SUPERVISOR','OPERADOR','FINANCIERO','SEGURIDAD')?'trips':'reports'}];
 if(has('ADMINISTRADOR'))steps.push({title:'Administra los accesos',text:'Crea una cuenta para cada persona y elige los permisos que necesita. Las fichas de pilotos se preparan en Pilotos.',target:'[data-tour="nav-users"]',page:'users'});
 steps.push({title:'La ayuda siempre está disponible',text:'Abre “Cómo usar esta pantalla” cuando tengas dudas. Puedes repetir este recorrido con “Ver tutorial de nuevo”.',target:'[data-tour="help"]',page:'dashboard'},
 {title:'Termina tu jornada',text:'Cierra sesión al terminar, especialmente si compartes el equipo. Al finalizar u omitir esta guía no volverá a abrirse automáticamente.',target:'[data-tour="logout"]',page:'dashboard'});
 return steps;
}
export function Tutorial({user,page,onGo,onClose}:{user:{id_usuario:number;roles:string[]};page:string;onGo:(p:string)=>void;onClose:()=>void}){
 const [index,setIndex]=useState(0),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 const [rect,setRect]=useState<DOMRect|null>(null);const dialog=useRef<HTMLElement>(null),previousFocus=useRef(document.activeElement as HTMLElement|null),initialPage=useRef(page);
 const steps=tutorialSteps(user.roles),step=steps[index];
 useEffect(()=>{onGo(step.page)},[index]);
 useLayoutEffect(()=>{
  const measure=()=>{const el=document.querySelector<HTMLElement>(step.target);setRect(el?.getBoundingClientRect()??null)};
  const timer=setTimeout(()=>{document.querySelector(step.target)?.scrollIntoView({block:'center',inline:'center',behavior:'instant'});measure();if(!dialog.current?.contains(document.activeElement))dialog.current?.focus()},80);
  window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
  return()=>{clearTimeout(timer);window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true)};
 },[index,page]);
 useEffect(()=>()=>{previousFocus.current?.focus()},[]);
 async function finish(){
  if(busy)return;setBusy(true);setFailure('');
  try{await api('auth/tutorial','POST');try{localStorage.removeItem('transmetro-tour:'+user.id_usuario)}catch{}onGo(initialPage.current);onClose()}
  catch{try{localStorage.setItem('transmetro-tour:'+user.id_usuario,'pending')}catch{}setFailure('No pudimos guardar tu preferencia en la cuenta. Puedes reintentar o cerrar; conservaremos un respaldo en este navegador si está disponible.');setBusy(false)}
 }
 return <div className="tour-layer"><div className="tour-shade"/>{rect&&<div className="tour-highlight" style={{left:Math.max(2,rect.left-4),top:Math.max(2,rect.top-4),width:Math.min(rect.width+8,window.innerWidth-8),height:Math.min(rect.height+8,window.innerHeight-8)}}/>}<section className="tour-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text" tabIndex={-1} onKeyDown={e=>{
 if(e.key==='Escape'){e.preventDefault();void finish()}
 if(e.key==='Tab'){const buttons=Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
 }}><p className="tour-count" aria-live="polite">Paso {index+1} de {steps.length}</p><progress max={steps.length} value={index+1} aria-label="Progreso del tutorial"/><h2 id="tour-title">{step.title}</h2><p id="tour-text">{step.text}</p>{failure&&<p role="alert">{failure}</p>}<div className="row-actions"><button className="secondary" disabled={busy||index===0} onClick={()=>setIndex(i=>i-1)}>Atrás</button><button className="primary" disabled={busy} onClick={()=>index===steps.length-1?void finish():setIndex(i=>i+1)}>{busy?'Guardando…':index===steps.length-1?'Finalizar':'Siguiente'}</button><button className="text-button" disabled={busy} onClick={()=>void finish()}>{failure?'Reintentar guardado':'Omitir'}</button>{failure&&<button className="secondary" onClick={()=>{onGo(initialPage.current);onClose()}}>Cerrar por ahora</button>}</div></section></div>
}
