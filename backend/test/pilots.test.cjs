const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Operations}=require('../dist/operations');
function setup({pilot=true,bus=true,line=true,pending=0}={}){
 const writes=[];const tx={$queryRaw:async()=>[],$executeRaw:async(...a)=>{writes.push(a);return 1},pilotos:{findFirst:async()=>pilot?{}:null},buses:{findFirst:async()=>bus?{}:null},bus_linea_historial:{findFirst:async()=>line?{id_linea:7,lineas:{estado:true}}:null},recorridos:{count:async()=>pending},bitacora:{create:async a=>{writes.push(a)}}};
 return {service:new Operations({$transaction:fn=>fn(tx)}),writes};
}
const admin={id_usuario:1,roles:['ADMINISTRADOR']};
test('Asignar piloto guarda bus y registra ruta en bitácora',async()=>{const {service,writes}=setup();assert.deepEqual(await service.assignPilot('1',{id_bus:2},admin),{ok:true});assert.equal(writes.length,2);assert.match(writes[1].data.detalle,/línea 7/)});
test('Piloto o bus inactivo, ruta no activa y viajes incompatibles no se guardan',async()=>{for(const options of [{pilot:false},{bus:false},{line:false},{pending:1}]){const {service,writes}=setup(options);await assert.rejects(()=>service.assignPilot('1',{id_bus:2},admin));assert.equal(writes.length,0)}});
test('Operador no puede asignar pilotos',async()=>{const {service,writes}=setup();await assert.rejects(()=>service.assignPilot('1',{id_bus:2},{roles:['OPERADOR']}));assert.equal(writes.length,0)});
