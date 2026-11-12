/* global document, window, getComputedStyle */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const out=process.env.QA_OUTPUT || join(tmpdir(),'smk-facilities-design-qa');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(12000);
const results=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
const check=async(name,fn)=>{try{results.push({name,passed:true,detail:await fn()});console.log('PASS',name);}catch(error){results.push({name,passed:false,error:error.message});console.error('FAIL',name,error.message);}};
const server=await createServer({appType:'custom',logLevel:'silent',server:{middlewareMode:true}});
const {fasilitasViews}=await server.ssrLoadModule('/src/data/fasilitasPageData.js');const {translate}=await server.ssrLoadModule('/src/utils/language.js');await server.close();
const typography=el=>{const s=getComputedStyle(el);return{font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,tracking:s.letterSpacing,color:s.color};};
const getCard=()=>page.locator('[data-facility-card]').first().evaluate(card=>{const s=getComputedStyle(card),h=getComputedStyle(card.querySelector('h4')),p=getComputedStyle(card.querySelector('p'));return{radius:s.borderRadius,border:s.borderWidth,bg:s.backgroundColor,shadow:s.boxShadow,heading:{font:h.fontFamily,size:h.fontSize,weight:h.fontWeight,line:h.lineHeight,tracking:h.letterSpacing,color:h.color},body:{font:p.fontFamily,size:p.fontSize,weight:p.fontWeight,line:p.lineHeight,tracking:p.letterSpacing,color:p.color}};});
try{
 await page.goto(base+'/');await page.locator('a[href="/jurusan/rpl"]').first().waitFor();
 const reference=await page.locator('a[href="/jurusan/rpl"]').first().evaluate(a=>{const card=a.closest('article'),s=getComputedStyle(card),h=getComputedStyle(card.querySelector('h3')),p=getComputedStyle(card.querySelector('p'));return{radius:s.borderRadius,border:s.borderWidth,bg:s.backgroundColor,shadow:s.boxShadow,heading:{font:h.fontFamily,size:h.fontSize,weight:h.fontWeight,line:h.lineHeight,tracking:h.letterSpacing,color:h.color},body:{font:p.fontFamily,size:p.fontSize,weight:p.fontWeight,line:p.lineHeight,tracking:p.letterSpacing,color:p.color}};});
 const footerReference=await page.locator('footer .font-heading').first().evaluate(typography);
 for(const width of [1920,1440,768,390,375]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'/jurusan');await page.locator('h1').waitFor();const heroReference=await page.locator('h1').evaluate(typography);
  for(const lang of ['id','en'])await check('Konsistensi visual '+width+' '+lang,async()=>{
   await page.goto(base+'/fasilitas');await page.waitForFunction(()=>document.querySelectorAll('[data-facility-card]').length===24);
   if(lang==='en'){await page.getByRole('button',{name:'Switch to English',exact:true}).click();await page.locator('#fasilitas-title').filter({hasText:'School'}).waitFor();}
   assert.equal(await page.locator('[data-facility-card]').count(),24);
   const actual=await getCard(); assert.equal(actual.heading.color,'rgb(205, 11, 32)'); assert.equal(actual.heading.font,reference.heading.font); assert.equal(actual.body.font,reference.body.font);assert.deepEqual(await page.locator('h1').evaluate(typography),heroReference);
   assert.deepEqual(await page.locator('footer .font-heading').first().evaluate(typography),footerReference);
   const geometry=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,columns:getComputedStyle(document.querySelector('[data-facility-grid]')).gridTemplateColumns.split(' ').length}));
   assert.ok(geometry.scroll<=geometry.client);assert.equal(geometry.columns,width>=1024?4:width>=640?2:1);
   assert.equal(await page.locator('#stela').count(),1);assert.equal(await page.locator('#ppdb').count(),1);
   assert.equal(await page.locator('#stela').evaluate(el=>el.nextElementSibling?.id),'ppdb');
   for(const [name,count] of [['Laboratorium',6],['Kelas',16],['Perpustakaan',4],['Aula',4],['GOR',4],['Parkiran',4],['Semua',24]]){
    await page.getByRole('button',{name:translate(name,lang),exact:true}).click();
    await page.waitForFunction(count=>document.querySelectorAll('[data-facility-card]').length===count,count);
    assert.equal(await page.locator('[data-facility-card]').count(),count);
    assert.equal(new URL(page.url()).searchParams.get('kategori'),name==='Semua'?null:name);
    assert.equal(await page.getByRole('button',{name:translate(name,lang),exact:true}).getAttribute('aria-pressed'),'true');
    if(width===1440 && lang==='id' && name!=='Semua'){
     await page.locator('#fasilitas-grid').scrollIntoViewIfNeeded();
     await page.waitForFunction(()=>[...document.querySelectorAll('[data-facility-card] img')].every(img=>img.complete&&img.naturalWidth>0));
     await page.locator('#fasilitas-grid').screenshot({path:out+'/category-'+name+'.png',animations:'disabled',style:'header { visibility: hidden; }'});
    }
   }
   await page.locator('#fasilitas-grid').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>[...document.querySelectorAll('[data-facility-card] img')].every(img=>img.complete&&img.naturalWidth>0));
   await page.mouse.move(0,0);
   await page.locator('#fasilitas-grid').screenshot({path:out+'/grid-'+lang+'-'+width+'.png',animations:'disabled',style:'header { visibility: hidden; }'});
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await page.waitForFunction(()=>window.scrollY<1);
   await page.screenshot({path:out+'/page-'+lang+'-'+width+'.png',fullPage:true,animations:'disabled'});
   if(lang==='en'){
    await page.getByRole('button',{name:'Switch to Indonesian',exact:true}).click();
    await page.waitForFunction(()=>document.documentElement.lang==='id');
   }
   return geometry;
  });
 }
 for(const lang of ['id','en'])await check('Semua kategori dan modal, keyboard, bahasa '+lang,async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/fasilitas');await page.locator('[data-facility-card]').first().waitFor();
  if(lang==='en')await page.getByRole('button',{name:'Switch to English',exact:true}).click();
  for(const [category,groups] of Object.entries(fasilitasViews)){
   await page.getByRole('button',{name:translate(category,lang),exact:true}).click();
   await page.waitForFunction(count=>document.querySelectorAll('[data-facility-card]').length===count,groups.flatMap(g=>g.items).length);
   for(const item of groups.flatMap(group=>group.items)){
   const button=page.locator('[data-facility-card="'+item.id+'"] button');await button.focus();await page.keyboard.press('Enter');
   const dialog=page.getByRole('dialog');await dialog.waitFor();await dialog.getByRole('heading',{name:translate(item.name,lang),exact:true}).waitFor();
   assert.ok((await dialog.innerText()).includes(translate(item.preview,lang)));
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   await page.waitForFunction(()=>document.body.style.overflow==='');
   assert.equal(await button.evaluate(el=>document.activeElement===el),true);assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  }
  }
  if(lang==='en')await page.getByRole('button',{name:'Switch to Indonesian',exact:true}).click();
 });
 await check('Placeholder gagal gambar ID/EN dan modal',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:1000}});const p=await context.newPage();
  await p.route(/\/.*p1250087[^/]*\.webp$/,r=>r.abort());
  try{
   await p.goto(base+'/fasilitas');const card=p.locator('[data-facility-card="semua-lab-1"]');await card.scrollIntoViewIfNeeded();
   await card.getByRole('img',{name:'Foto belum tersedia',exact:true}).waitFor();
   const size=await card.locator('[role="img"]').boundingBox();assert.ok(size.height>0&&Math.abs(size.width/size.height-16/9)<0.05);
   await p.getByRole('button',{name:'Switch to English',exact:true}).click();await card.getByRole('img',{name:'Photo unavailable',exact:true}).waitFor();
   await card.locator('button').click();await p.getByRole('dialog').getByRole('img',{name:'Photo unavailable',exact:true}).waitFor();
   await p.getByRole('dialog').screenshot({path:out+'/placeholder-modal-en.png',animations:'disabled'});await p.keyboard.press('Escape');
  }finally{await context.close();}
 });
 await check('Hover dengan reduced motion',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/fasilitas');const image=page.locator('[data-facility-card] img').first();await image.hover();assert.equal(await image.evaluate(el=>getComputedStyle(el).transform),'none');await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await check('Navigasi anchor dan SPMB',async()=>{
  await page.goto(base+'/fasilitas');await page.getByRole('link',{name:'Lihat Fasilitas',exact:true}).click();await page.waitForURL(base+'/fasilitas#daftar-fasilitas');
  await page.getByRole('link',{name:'Masuk SPMB',exact:true}).filter({visible:true}).last().click();await page.waitForURL(base+'/spmb/masuk');
 });
 await check('Tanpa exception JavaScript',async()=>assert.deepEqual(errors,[]));
}finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify({passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,out}));
if(results.some(r=>!r.passed))process.exitCode=1;
