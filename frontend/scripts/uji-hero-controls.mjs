/* global document, window */
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out=process.env.QA_OUTPUT || 'outputs/hero-controls';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:'[]'}));
const base=process.env.QA_URL || 'http://127.0.0.1:5173';
const root=page.locator('[data-hero-carousel]').first(),prev=root.locator('.hero-carousel-previous'),next=root.locator('.hero-carousel-next');
const selected=i=>page.waitForFunction(i=>document.querySelector('[data-hero-carousel]').dataset.heroIndex===String(i),i);
try {
for(const width of [1440,768,390,320])for(const route of ['/','/fasilitas','/profil-sekolah','/profil-sekolah/guru','/jurusan','/prestasi','/bkk','/berita','/pengumuman','/kalender','/ekstrakurikuler']){
 await page.setViewportSize({width,height:1000});await page.goto(base+route);await next.waitFor();
 for(const lang of ['id','en']){
  if(await page.locator('html').getAttribute('lang')!==lang)await page.getByRole('button',{name:/^Switch to /}).first().click();
  assert.equal(await root.locator('.hero-carousel-navigation').count(),0);
  assert.equal(await root.locator('.hero-carousel-controls button').count(),2);
  const count=await root.locator('[data-hero-slide]').count();
  await prev.click();await selected(count-1);await next.click();await selected(0);await next.click();await selected(1);await prev.click();await selected(0);
  const geometry=await root.evaluate(root=>{const bounds=root.getBoundingClientRect();return [...root.querySelectorAll('.hero-carousel-controls button')].map(button=>{const b=button.getBoundingClientRect();return {x:b.x,right:b.right,w:b.width,h:b.height,center:Math.abs(b.y+b.height/2-bounds.y-bounds.height/2)};});});
  for(const g of geometry)assert.ok(g.x>=0&&g.right<=width&&g.w>=32&&g.h>=32&&g.center<1,JSON.stringify({width,route,geometry}));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  if((route==='/'||route==='/fasilitas')&&lang==='id')await root.screenshot({path:`${out}/${width}-${route==='/'?'home':'facilities'}.png`});
 }
}
console.log('PASS 11 routes, four viewport widths, ID/EN, click in both directions, wrap, centered placement and no dots/overflow');
await page.setViewportSize({width:1440,height:1000});await page.goto(base);await next.waitFor();
await next.focus();await page.keyboard.press('ArrowRight');await selected(1);await page.keyboard.press('ArrowLeft');await selected(0);
await page.emulateMedia({reducedMotion:'no-preference'});await next.evaluate(n=>n.blur());await next.hover();
await page.waitForTimeout(7000);assert.equal(await root.getAttribute('data-hero-index'),'0');
await page.mouse.move(5,5);await selected(1);
await next.focus();await page.waitForTimeout(7000);assert.equal(await root.getAttribute('data-hero-index'),'1');
await next.click();await next.click();await selected(3);
assert.deepEqual(errors,[]);console.log('PASS keyboard, hover/focus pause, autoplay resume, queued clicks, reduced motion and no exceptions');
}finally{await browser.close();}
