/* global document, window, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_URL || 'http://127.0.0.1:5199';
const output = process.env.QA_OUTPUT || join(tmpdir(), 'campus-explorer-qa');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], results = [], contexts = [];
const hintKey = 'smk-campus-drag-understood-v1';
const expected = { 'gedung-d-1': 'gor', 'gedung-d-2': 'kelas-d', parkiran: 'parkiran', 'gedung-c': 'kelas-c', 'gedung-b': 'kelas-b', 'rps-selatan': 'rps-selatan', 'rps-utara': 'rps-utara', 'lapangan-apel': 'lapangan-apel', 'gedung-a': 'kelas-a', dlg: 'dlg', perpustakaan: 'perpustakaan', aula: 'aula' };
async function create(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', ...options }); contexts.push(context);
  context.on('page', page => { page.setDefaultTimeout(12000); page.on('pageerror', error => errors.push(error.message)); });
  await context.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await context.route('**/rest/v1/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  return context;
}
const viewport = page => page.locator('.campus-viewport');
const slider = page => page.locator('.campus-slider');
const point = (page, id) => page.locator(`[data-campus-hotspot="${id}"]`);
const position = page => viewport(page).evaluate(node => Number(node.dataset.pan));
async function setSlider(page, key) {
  await slider(page).press(key);
  await page.waitForFunction(key => {
    const view = document.querySelector('.campus-viewport'), input = document.querySelector('.campus-slider');
    const expected = key === 'Home' ? 0 : Number(view.dataset.panMax);
    return Number(input.value) === (key === 'Home' ? 0 : 1000) && Math.abs(Number(view.dataset.pan) - expected) < 0.1;
  }, key);
}
async function open(page) {
  await page.goto(base + '/fasilitas'); await viewport(page).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.campus-viewport')?.dataset.mapReady === 'true');
  await page.evaluate(() => document.fonts.ready);
}
async function drag(page, dx, dy = 0, target) {
  await (target || viewport(page)).scrollIntoViewIfNeeded();
  const box = await (target || viewport(page)).boundingBox();
  const x = box.x + box.width / 2, y = target ? box.y + box.height / 2 : box.y + box.height * 0.65;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 12 }); await page.mouse.up();
}
async function coords(page) {
  return viewport(page).evaluate(view => {
    const stage = view.querySelector('[data-campus-stage]'), image = stage.querySelector('img[draggable="false"]'), box = stage.getBoundingClientRect();
    return { left: Number(view.dataset.pan), inset: Number(view.dataset.panInset), max: Number(view.dataset.panMax), width: view.clientWidth, stageWidth: box.width, stageHeight: box.height, ratio: box.width / box.height, imageWidth: image?.naturalWidth, imageHeight: image?.naturalHeight,
      points: [...stage.querySelectorAll('[data-campus-hotspot]')].map(pin => { const rect = pin.getBoundingClientRect(); return { id: pin.dataset.campusHotspot, x: (rect.left + rect.width / 2 - box.left) / box.width, y: (rect.bottom - box.top) / box.height, width: rect.width, height: rect.height }; }) };
  });
}
try {
  const context = await create(), page = await context.newPage(); await open(page);
  assert.equal(await page.locator('[data-campus-hotspot]').count(), 12);
  assert.equal(await page.locator('[data-campus-hint]').isVisible(), true);
  const original = await coords(page); assert.ok(original.left === 0 && original.max > 0); assert.equal(original.imageWidth, 2164); assert.equal(original.imageHeight, 727);
  await page.locator('#school-tour img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  assert.ok(Math.abs(original.inset - original.stageWidth * 83 / 3142) < 0.05, 'Initial offset derives from Figma geometry');
  await page.locator('#school-tour').screenshot({ path: join(output, 'initial-1440.png') });
  await viewport(page).hover(); assert.equal(await page.locator('[data-campus-hint]').getAttribute('data-dismissed'), 'false');
  await drag(page, -6); assert.ok(Math.abs(await position(page) - original.left) < 1); assert.equal(await page.locator('[data-campus-hint]').getAttribute('data-dismissed'), 'false');
  await setSlider(page, 'Home'); assert.equal(await position(page), 0);
  await drag(page, 150); assert.equal(await position(page), 0); assert.equal(await page.locator('[data-campus-hint]').getAttribute('data-dismissed'), 'false', 'No map movement means no learned hint');
  await drag(page, -200);
  assert.ok(Math.abs(await position(page) - 200) < 2, 'Mouse release preserves the exact dragged position');
  await page.waitForTimeout(400); assert.ok(Math.abs(await position(page) - 200) < 2, 'No delayed snapping');
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-campus-hint]')).visibility === 'hidden');
  assert.equal(await page.evaluate(key => localStorage.getItem(key), hintKey), '1');
  const moved = await coords(page);
  for (const pin of original.points) { const next = moved.points.find(item => item.id === pin.id); assert.ok(Math.abs(pin.x - next.x) < 0.0001 && Math.abs(pin.y - next.y) < 0.0001, 'Pins share the image coordinate system'); }
  assert.ok(Math.abs(Number(await slider(page).inputValue()) - moved.left / moved.max * 1000) < 2);
  await setSlider(page, 'End'); assert.ok(Math.abs(await position(page) - moved.max) < 1, JSON.stringify({ pan: await position(page), movedMax: moved.max, now: await coords(page) }));
  await drag(page, -350); assert.ok(Math.abs(await position(page) - moved.max) < 1);
  await setSlider(page, 'Home'); await viewport(page).scrollIntoViewIfNeeded();
  const blank = await viewport(page).boundingBox(); await page.mouse.move(blank.x + blank.width / 2, blank.y + blank.height * 0.65);
  const y = await page.evaluate(() => window.scrollY), left = await position(page);
  await page.mouse.wheel(0, 180); await page.waitForFunction(y => window.scrollY > y + 20, y); assert.ok(Math.abs(await position(page) - left) < 1, 'Vertical wheel remains page scrolling');
  await viewport(page).scrollIntoViewIfNeeded(); const wheelBox = await viewport(page).boundingBox(); await page.mouse.move(wheelBox.x + wheelBox.width / 2, wheelBox.y + wheelBox.height * 0.65);
  await page.mouse.wheel(180, 0); await page.waitForFunction(() => Number(document.querySelector('.campus-viewport').dataset.pan) > 150);
  await viewport(page).focus(); const keyStart = await position(page); await page.keyboard.press('ArrowRight'); assert.ok(await position(page) > keyStart);
  await page.reload(); await viewport(page).scrollIntoViewIfNeeded(); await page.waitForFunction(() => document.querySelector('.campus-viewport')?.dataset.mapReady === 'true');
  assert.equal(await page.locator('[data-campus-hint]').isVisible(), false, 'Learned hint stays hidden after refresh');
  await point(page, 'gedung-d-1').focus();
  await drag(page, -120, 0, point(page, 'gedung-d-1')); assert.equal(await page.locator('[data-campus-preview]').count(), 0, 'Drag starting on a pin must not click it');
  await point(page, 'gedung-d-2').click(); await page.locator('[data-campus-preview="kelas-d"]').waitFor();
  await page.keyboard.press('Escape'); await page.locator('[data-campus-preview]').waitFor({ state: 'hidden' });
  for (const [id, facility] of Object.entries(expected)) {
    const pin = point(page, id); await pin.focus(); await page.keyboard.press('Enter');
    const preview = page.locator(`[data-campus-preview="${facility}"]`); await preview.waitFor(); assert.equal(await page.locator('[data-campus-hotspot][data-active="true"]').count(), 1);
    assert.equal(await preview.getAttribute('aria-modal'), 'true');
    await preview.locator('.campus-photo-main .campus-preview-photo').first().evaluate(image => image.decode());
    assert.equal(await preview.locator('[data-campus-photo-fallback]').count(), 0);
    const before = await position(page); await page.keyboard.press('Escape'); await preview.waitFor({ state: 'hidden' }); assert.ok(Math.abs(await position(page) - before) < 1, 'Closing details does not reset panning');
  }
  await point(page, 'gedung-c').focus(); await point(page, 'gedung-c').locator('.campus-hotspot-label').click();
  await page.locator('[data-campus-preview="kelas-c"]').waitFor(); await page.keyboard.press('Escape'); await page.locator('[data-campus-preview]').waitFor({ state: 'hidden' });
  const sliderBox = await slider(page).boundingBox(); await page.mouse.click(sliderBox.x + sliderBox.width / 2, sliderBox.y + sliderBox.height / 2);
  const trackPosition = await coords(page); assert.ok(Math.abs(trackPosition.left / trackPosition.max - 0.5) < 0.03, 'Track click controls the actual map position');
  assert.ok(Math.abs(await slider(page).evaluate(node => parseFloat(getComputedStyle(node).getPropertyValue('--campus-fraction'))) - trackPosition.left / trackPosition.max) < 0.001, 'Red progress is synchronized');
  await point(page, 'gedung-a').click(); await page.locator('[data-campus-preview="kelas-a"]').waitFor();
  const movedWhileOpen = await position(page);
  await page.getByRole('button', { name: 'Tutup informasi fasilitas', exact: true }).click(); await page.locator('[data-campus-preview]').waitFor({ state: 'hidden' });
  assert.ok(Math.abs(await position(page) - movedWhileOpen) < 1, 'Returning focus cannot pan back to an offscreen marker');
  await point(page, 'gedung-b').focus(); await page.keyboard.press('Enter'); await page.getByRole('button', { name: 'Lihat daftar fasilitas', exact: true }).click();
  await page.waitForURL('**/fasilitas?kategori=Kelas'); await page.waitForFunction(() => document.querySelectorAll('[data-facility-card]').length === 16);
  await page.locator('[data-facility-card="kelas-b-1"]').getByRole('button').click(); await page.locator('dialog[open]').waitFor();
  await page.getByRole('button', { name: 'Lihat lokasi di peta', exact: true }).click(); await page.locator('dialog[open]').waitFor({ state: 'hidden' });
  await page.locator('[data-campus-preview="kelas-b"]').waitFor();
  assert.equal(await point(page, 'gedung-b').getAttribute('data-located'), 'true');
  await page.waitForFunction(() => !document.querySelector('[data-campus-hotspot][data-located="true"]'));
  await page.locator('#school-tour').screenshot({ path: join(output, 'preview-1440.png') });
  await page.setViewportSize({ width: 390, height: 1100 }); await page.locator('#school-tour').screenshot({ path: join(output, 'preview-390.png') });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.keyboard.press('Escape'); await page.locator('[data-campus-preview]').waitFor({ state: 'hidden' });
  for (const width of [1920, 1440, 1024, 768, 390, 375, 320]) for (const language of ['id', 'en']) {
    await page.setViewportSize({ width, height: 1100 });
    if (await page.locator('html').getAttribute('lang') !== language) await page.locator('header').getByRole('button', { name: /^Switch to / }).click();
    await viewport(page).scrollIntoViewIfNeeded(); await setSlider(page, 'Home'); await page.evaluate(() => document.fonts.ready);
    const geometry = await coords(page);
    assert.ok(geometry.left >= 0 && geometry.left <= geometry.max); assert.ok(Math.abs(geometry.ratio - 3142 / 1051) < 0.01);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    for (const pin of geometry.points) assert.ok(pin.width >= 43.9 && pin.height >= 43.9);
    await page.locator('#school-tour').screenshot({ path: join(output, `campus-${width}-${language}-left.png`) });
    await setSlider(page, 'End'); await page.locator('#school-tour').screenshot({ path: join(output, `campus-${width}-${language}-right.png`) });
    results.push({ width, language, ...geometry });
  }
  const portraitFraction = (await position(page)) / (await coords(page)).max;
  await page.setViewportSize({ width: 768, height: 650 }); await viewport(page).scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
  assert.ok(Math.abs((await position(page)) / (await coords(page)).max - portraitFraction) < 0.02, 'Resize preserves panning fraction');
  await page.setViewportSize({ width: 3840, height: 1400 }); await page.waitForTimeout(80);
  assert.equal((await coords(page)).stageWidth, 1600); assert.equal((await coords(page)).width, 1280);
  assert.equal(await slider(page).isDisabled(), false); assert.ok(await position(page) <= (await coords(page)).max);
  await page.setViewportSize({ width: 1440, height: 1100 });
  // Browser-emulated touch: assert the real Pointer Events path, native page scroll and orientation resize.
  const touchContext = await create({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const touch = await touchContext.newPage(); await open(touch);
  const cdp = await touchContext.newCDPSession(touch);
  const touchStart = await position(touch);
  let touchBox = await viewport(touch).boundingBox(); let tx = touchBox.x + 250, ty = Math.max(100, touchBox.y + touchBox.height * 0.65);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
  for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx - i * 12, y: ty }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok(await position(touch) > 120);
  assert.ok(Math.abs(await position(touch) - touchStart - 144) < 2, 'Touch release preserves the exact dragged position');
  assert.equal(await touch.locator('[data-campus-hint]').getAttribute('data-dismissed'), 'true');
  touchBox = await viewport(touch).boundingBox(); tx = touchBox.x + 160; ty = touchBox.y + touchBox.height * 0.65;
  const touchY = await touch.evaluate(() => window.scrollY), touchLeft = await position(touch);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
  for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx, y: ty - i * 12 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touch.waitForFunction(y => window.scrollY > y + 20, touchY); assert.ok(Math.abs(await position(touch) - touchLeft) < 2);
  await touch.setViewportSize({ width: 844, height: 390 }); const landscape = await coords(touch); assert.ok(landscape.left >= 0 && landscape.left <= landscape.max);
  await cdp.detach();
  // Storage failure is nonfatal and still dismisses for this mounted session.
  const blockedContext = await create(); await blockedContext.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('Blocked'); }; Storage.prototype.setItem = () => { throw new Error('Blocked'); }; });
  const blocked = await blockedContext.newPage(); await open(blocked); assert.equal(await blocked.locator('[data-campus-hint]').isVisible(), true); await drag(blocked, -80); assert.equal(await blocked.locator('[data-campus-hint]').getAttribute('data-dismissed'), 'true');
  const failContext = await create(); await failContext.route('**/*campus-map*.webp', route => route.fulfill({ status: 404, body: '' })); const fail = await failContext.newPage(); await fail.goto(base + '/fasilitas'); await viewport(fail).scrollIntoViewIfNeeded();
  await fail.getByText('Peta belum tersedia. Daftar fasilitas tetap dapat dibuka di bawah.', { exact: true }).waitFor(); assert.equal(await fail.locator('[data-campus-hotspot]').count(), 0); assert.equal(await fail.locator('[data-facility-card]').count(), 24); assert.equal(await slider(fail).isDisabled(), true);
  await failContext.unroute('**/*campus-map*.webp'); await viewport(fail).getByRole('button', { name: 'Coba lagi', exact: true }).click(); await fail.waitForFunction(() => document.querySelector('.campus-viewport').dataset.mapReady === 'true');
  const photoContext = await create(); await photoContext.route('**/*kelas-b*.webp', route => route.fulfill({ status: 404, body: '' })); const photo = await photoContext.newPage(); await open(photo); await point(photo, 'gedung-b').click(); await photo.locator('.campus-photo-main [data-campus-photo-fallback]').waitFor();
  // Actual fonts and normal/reduced motion on rendered UI.
  const motionContext = await create({ reducedMotion: 'no-preference' }), motion = await motionContext.newPage(); await open(motion); await point(motion, 'gedung-a').click();
  assert.equal(await motion.locator('[data-campus-preview]').evaluate(node => getComputedStyle(node).animationDuration), '0.28s');
  assert.equal(await motion.locator('.campus-photo-main .campus-preview-photo').first().evaluate(node => getComputedStyle(node).transitionDuration), '0.3s');
  const floorOffset = () => motion.locator('.campus-floor').evaluate(node => new window.DOMMatrixReadOnly(getComputedStyle(node).transform).m41);
  const floorBefore = await floorOffset(); await drag(motion, -100); await motion.waitForTimeout(50);
  assert.ok(await floorOffset() >= floorBefore && await floorOffset() <= 16, 'Parallax is confined to the floor and capped at 16px');
  await motion.emulateMedia({ reducedMotion: 'reduce' }); assert.equal(await floorOffset(), 0);
  await motion.emulateMedia({ reducedMotion: 'no-preference' });
  await point(motion, 'gedung-b').click(); await motion.locator('[data-campus-preview="kelas-b"]').waitFor();
  await motion.getByRole('button', { name: 'Tutup informasi fasilitas', exact: true }).click(); assert.equal(await motion.locator('[data-campus-preview]').getAttribute('data-closing'), 'true'); await motion.locator('[data-campus-preview]').waitFor({ state: 'hidden' });
  const fontSession = await motionContext.newCDPSession(motion); await fontSession.send('DOM.enable'); await fontSession.send('CSS.enable'); const { root } = await fontSession.send('DOM.getDocument');
  for (const [selector, family] of [['#school-tour-title', 'Plus Jakarta Sans'], ['#school-tour header p', 'Plus Jakarta Sans']]) { const { nodeId } = await fontSession.send('DOM.querySelector', { nodeId: root.nodeId, selector }); const { fonts } = await fontSession.send('CSS.getPlatformFontsForNode', { nodeId }); assert.ok(fonts.some(font => font.familyName.startsWith(family) && font.glyphCount > 0)); }
  await fontSession.detach(); await motion.emulateMedia({ reducedMotion: 'reduce' });
  await motion.waitForFunction(() => document.querySelector('[data-wave-text]').getAttribute('startOffset') === '0');
  const staticOffset = await motion.locator('[data-wave-text]').first().getAttribute('startOffset'); await motion.waitForTimeout(150); assert.equal(await motion.locator('[data-wave-text]').first().getAttribute('startOffset'), staticOffset);
  assert.deepEqual(errors, []);
  console.log('PASS campus mouse/touch/trackpad/keyboard, bounded pan/resize, drag-click separation, persistent hint/storage failure, 12 shared hotspots/previews, list/map links, image/error/retry, 14 viewport/language checks, motion and rendered fonts.');
} catch (error) { for (let i = 0; i < contexts.length; i++) for (const [j, page] of contexts[i].pages().entries()) await page.screenshot({ path: join(output, `failure-${i}-${j}.png`), fullPage: true }).catch(() => {}); throw error; }
finally { await writeFile(join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2)); await browser.close(); }
