const {test}=require('node:test');
const assert=require('node:assert/strict');
const {scheduleWindow}=require('../dist/schedule');
test('Convierte horarios de Guatemala y admite llegada al día siguiente',()=>{
 assert.equal(scheduleWindow('2026-10-06','06:00','2026-10-06T07:00').departure.toISOString(),'2026-10-06T12:00:00.000Z');
 assert.equal(scheduleWindow('2026-10-06','23:00','2026-10-07T01:00').arrival.toISOString(),'2026-10-07T07:00:00.000Z');
});
test('Rechaza fechas imposibles, horas inválidas y llegada anterior o igual',()=>{
 for(const values of [['2026-02-30','06:00','2026-03-01T07:00'],['2026-10-06','24:00','2026-10-07T01:00'],['2026-10-06','06:00','2026-10-06T05:00'],['2026-10-06','06:00','2026-10-06T06:00']])assert.throws(()=>scheduleWindow(...values));
});
