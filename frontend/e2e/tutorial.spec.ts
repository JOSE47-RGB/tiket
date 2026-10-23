import {test,expect,Page} from '@playwright/test';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {PrismaClient}=require('../../backend/node_modules/@prisma/client');
const db=new PrismaClient({datasources:{db:{url:process.env.TEST_DATABASE_URL}}});
test.afterAll(()=>db.$disconnect());
async function login(page:Page,role:string){await page.goto('/');await page.getByLabel('Usuario',{exact:true}).fill('ux_'+role);await page.getByLabel('Contraseña',{exact:true}).fill(process.env.TEST_UI_PASSWORD!);await page.getByRole('button',{name:'Ingresar al sistema'}).click()}
for(const role of ['admin','supervisor','operator','finance','security','pilot'])test(`${role}: guía por rol, teclado y vista móvil`,async({page})=>{
 await db.usuarios.update({where:{username:'ux_'+role},data:{tutorial_visto:false}});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 if(['supervisor','finance','pilot'].includes(role))await page.setViewportSize({width:390,height:844});
 await login(page,role);const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 const total=role==='admin'?7:6;
 for(let i=1;i<=total;i++){
 await expect(dialog.getByText(`Paso ${i} de ${total}`)).toBeVisible();await expect(page.locator('.tour-highlight')).toBeVisible();
 await page.waitForTimeout(150);
 if(i===2){await dialog.getByRole('button',{name:'Atrás',exact:true}).click();await expect(dialog.getByText(`Paso 1 de ${total}`)).toBeVisible();await dialog.getByRole('button',{name:'Siguiente',exact:true}).click()}
 if(i<total)await dialog.getByRole('button',{name:'Siguiente',exact:true}).click();
 }
 await page.screenshot({path:`test-results/tutorial-${role}.png`,fullPage:true});
 await dialog.getByRole('button',{name:'Finalizar',exact:true}).click();await expect(dialog).toBeHidden();
 await page.reload();await expect(page.getByRole('button',{name:'Ver tutorial de nuevo'})).toBeVisible();await expect(dialog).toBeHidden();
 await page.getByRole('button',{name:'Ver tutorial de nuevo'}).click();await expect(dialog).toBeVisible();await dialog.press('Escape');await expect(dialog).toBeHidden();
 await expect(page.getByRole('button',{name:'Cerrar sesión',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();expect(errors).toEqual([]);
});
test('Omitir persiste en una sesión nueva y el diálogo contiene el foco',async({page,browser})=>{
 await db.usuarios.update({where:{username:'ux_operator'},data:{tutorial_visto:false}});await login(page,'operator');const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await dialog.getByRole('button',{name:'Omitir',exact:true}).focus();await page.keyboard.press('Tab');await expect(dialog.getByRole('button',{name:'Siguiente',exact:true})).toBeFocused();await dialog.getByRole('button',{name:'Omitir',exact:true}).click();await expect(dialog).toBeHidden();
 const context=await browser.newContext();const other=await context.newPage();await other.goto('http://127.0.0.1:5199/');await other.getByLabel('Usuario',{exact:true}).fill('ux_operator');await other.getByLabel('Contraseña',{exact:true}).fill(process.env.TEST_UI_PASSWORD!);await other.getByRole('button',{name:'Ingresar al sistema'}).click();await expect(other.getByRole('button',{name:'Ver tutorial de nuevo'})).toBeVisible();await expect(other.getByRole('dialog')).toBeHidden();await context.close();
});
test('Venta: destino posterior, tarjeta condicional y boleto',async({page})=>{
 await login(page,'admin');await page.getByRole('button',{name:'Venta de tickets y abordaje',exact:true}).click();await page.getByRole('button',{name:/Asiento \d+, DISPONIBLE/}).first().click();
 await expect(page.getByLabel('¿Dónde baja?')).toBeDisabled();await page.getByLabel('¿Quién viaja?').selectOption({index:1});await page.getByLabel('¿Dónde sube?').selectOption({index:1});await page.getByLabel('¿Dónde baja?').selectOption({index:1});
 expect(await page.getByLabel('¿Dónde sube?').inputValue()).not.toEqual(await page.getByLabel('¿Dónde baja?').inputValue());
 await page.getByLabel('Forma de pago').selectOption({label:'Tarjeta de transporte'});await expect(page.getByLabel('Tarjeta del pasajero')).toBeVisible();await page.getByLabel('Forma de pago').selectOption({label:'Efectivo'});await expect(page.getByLabel('Tarjeta del pasajero')).toHaveCount(0);
 await page.getByRole('button',{name:'Confirmar cobro y emitir boleto'}).click();await expect(page.getByRole('dialog',{name:'Ticket de viaje'})).toBeVisible();await page.screenshot({path:'test-results/venta-boleto.png',fullPage:true});await page.getByRole('button',{name:'Cerrar',exact:true}).click();
});
test('Sin red: mensaje claro y respaldo local del tutorial',async({page})=>{
 await login(page,'admin');await page.getByRole('button',{name:'Ver tutorial de nuevo'}).click();await page.route('**/api/auth/tutorial',r=>r.abort());await page.getByRole('button',{name:'Omitir',exact:true}).click();await expect(page.getByRole('alert')).toContainText('No pudimos guardar');await page.getByRole('button',{name:'Cerrar por ahora'}).click();await expect(page.getByRole('dialog')).toBeHidden();
});
test('@navigation Navegación disponible para los seis roles sin errores de carga',async({page})=>{
 for(const role of ['admin','supervisor','operator','finance','security','pilot']){
  await page.context().clearCookies();await db.usuarios.update({where:{username:'ux_'+role},data:{tutorial_visto:true}});await login(page,role);await expect(page.getByRole('button',{name:'Ver tutorial de nuevo'})).toBeVisible();
  const pages=await page.locator('nav button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-tour')!));
  for(const name of pages){await page.locator(`[data-tour="${name}"]`).click();await page.waitForTimeout(200);await expect(page.locator('[role="alert"]')).toHaveCount(0)}
 }
});
