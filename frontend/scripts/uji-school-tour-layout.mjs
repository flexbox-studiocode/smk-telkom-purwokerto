/* global document, window, getComputedStyle, requestAnimationFrame */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_URL || 'http://127.0.0.1:5173';
const output = process.env.QA_OUTPUT || join(tmpdir(), 'school-tour-layout');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [], results = [];
const screenshotStyle = 'header.sticky,header.sticky *,[aria-controls="stela-widget-panel"] {visibility:hidden !important} .campus-slider:focus-visible {outline:none}';
async function create(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', ...options });
  await context.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/fasilitas');
  await page.locator('#school-tour').scrollIntoViewIfNeeded();
  await page.locator('[data-map-ready="true"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}
const slider = page => page.locator('.campus-slider');
async function geometry(page) {
  return page.locator('.campus-controls').evaluate(controls => {
    const input = controls.querySelector('input'), rect = input.getBoundingClientRect();
    const view = document.querySelector('.campus-viewport');
    const thumb = input.parentElement.querySelector('.campus-slider-arrows').getBoundingClientRect().width / .66;
    return { x: rect.x, y: rect.y + rect.height / 2, travel: rect.width - thumb, thumb,
      value: Number(input.value) / 1000, pan: Number(view.dataset.pan), max: Number(view.dataset.panMax),
      fraction: Number(getComputedStyle(controls).getPropertyValue('--campus-fraction')) };
  });
}
async function sync(page) {
  const g = await geometry(page);
  assert.ok(Math.abs(g.pan / g.max - g.value) <= .0011);
  assert.ok(Math.abs(g.pan / g.max - g.fraction) < .00001);
  return g;
}
try {
  const { page } = await create();
  assert.equal(await page.locator('[data-wave-marquee]').count(), 1, 'Reuse one marquee');
  assert.equal(await page.locator('#school-tour').evaluate(node => node.parentElement.lastElementChild.hasAttribute('data-wave-marquee')), true);
  for (const width of [1847, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    await slider(page).press('Home');
    for (const lang of ['id', 'en']) {
      if (await page.locator('html').getAttribute('lang') !== lang) await page.getByRole('button', { name: /^Switch to / }).first().click();
      await page.locator('#school-tour img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      const layout = await page.locator('.campus-tour-composition').evaluate(root => {
        const view = root.querySelector('.campus-viewport').getBoundingClientRect();
        const nav = root.querySelector('.campus-navigation').getBoundingClientRect();
        const hint = root.querySelector('[data-campus-hint]');
        const wave = root.querySelector('[data-wave-marquee]').getBoundingClientRect();
        const track = root.querySelector('.campus-track');
        const scenery = root.querySelector('.campus-scenery');
        const floor = root.querySelector('.campus-floor').getBoundingClientRect();
        return { viewWidth: view.width, navWidth: nav.width, navHeight: nav.height, centered: Math.abs(nav.x + nav.width / 2 - window.innerWidth / 2),
          waveBelow: wave.top >= nav.bottom, hintFits: hint.scrollWidth <= hint.clientWidth,
          roundedTrack: parseFloat(getComputedStyle(track).borderTopLeftRadius) >= track.getBoundingClientRect().height / 2,
          floorCoversViewport: floor.left <= 0 && floor.right >= window.innerWidth,
          fullWidthWave: Math.abs(wave.width - window.innerWidth) < 1,
          fullWidthBackground: Math.abs(parseFloat(getComputedStyle(scenery, '::before').width) - window.innerWidth) < 1 && !scenery.closest('.campus-viewport'),
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
      });
      assert.ok(layout.viewWidth <= 1280 && layout.centered < 7);
      assert.ok(layout.hintFits && layout.waveBelow && layout.roundedTrack && layout.fullWidthWave && layout.fullWidthBackground && layout.floorCoversViewport && !layout.overflow, JSON.stringify({ width, lang, layout }));
      assert.ok(Math.abs(layout.navHeight - Math.max(28, 74 * layout.navWidth / 1334)) < 1);
      await page.locator('.campus-tour-composition').screenshot({ path: join(output, `tour-${width}-${lang}.png`), style: screenshotStyle });
      results.push({ width, lang, ...layout });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  for (const [key, redX, handleX] of [['Home', 330, 539], ['End', 1086, 1295]]) {
    await slider(page).press(key);
    await page.waitForTimeout(100);
    const measured = await page.locator('.campus-range').evaluate(range => {
      const view = document.querySelector('.campus-viewport').getBoundingClientRect(), unit = view.width / 1847;
      const rect = range.getBoundingClientRect(), red = getComputedStyle(range, '::after');
      const arrows = range.querySelector('.campus-slider-arrows').getBoundingClientRect();
      return { redX: (rect.left + parseFloat(red.left) - view.left) / unit, width: parseFloat(red.width) / unit, handleX: (arrows.left + arrows.width / 2 - view.left) / unit };
    });
    assert.ok(Math.abs(measured.redX - redX) < 1 && Math.abs(measured.handleX - handleX) < 1 && Math.abs(measured.width - 418) < 1, JSON.stringify(measured));
  }
  await page.locator('.campus-tour-composition').screenshot({ path: join(output, 'tour-right-1440.png'), style: screenshotStyle });
  assert.equal(await page.locator('[data-campus-hotspot="dlg"] .campus-hotspot-label').isVisible(), true);
  assert.equal(await page.locator('[data-campus-hotspot="aula"] .campus-hotspot-label').isVisible(), true);
  await slider(page).press('Home');
  let g = await geometry(page);
  await page.mouse.move(g.x + g.thumb / 2, g.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(g.x + g.thumb / 2 + g.travel * i / 10, g.y);
    await sync(page);
  }
  await page.mouse.up();
  const released = await sync(page); await page.waitForTimeout(400);
  assert.equal((await geometry(page)).pan, released.pan, 'No release snapping');
  await page.setViewportSize({ width: 768, height: 1100 }); await page.waitForTimeout(100);
  assert.ok(Math.abs((await sync(page)).fraction - released.fraction) < .001, 'Resize preserves handle fraction');
  assert.equal(await page.locator('[data-campus-hint]').getAttribute('data-dismissed'), 'true');
  await page.reload(); await page.locator('#school-tour').scrollIntoViewIfNeeded();
  await page.locator('[data-map-ready="true"]').waitFor();
  assert.equal(await page.locator('[data-campus-hint]').getAttribute('data-dismissed'), 'true', 'The first-interaction hint stays dismissed after reload');
  console.log('PASS compact layout, 12 viewport/language captures, mouse handle drag, resize and no snapping');
  const { context, page: touch } = await create({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const cdp = await context.newCDPSession(touch);
  await slider(touch).press('Home'); g = await geometry(touch);
  const x = g.x + g.thumb / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: g.y }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + g.travel * i * .075, y: g.y }] });
    await sync(touch);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok(Math.abs((await sync(touch)).fraction - .75) < .015, 'Touch moves the actual handle');
  assert.equal(await touch.locator('[data-campus-hint]').getAttribute('data-dismissed'), 'true');
  await cdp.detach(); console.log('PASS touch handle drag');
  const { page: motion } = await create({ reducedMotion: 'no-preference' });
  const marquee = motion.locator('[data-wave-marquee]'); await marquee.scrollIntoViewIfNeeded();
  await motion.waitForFunction(() => Number(document.querySelector('[data-wave-marquee]').dataset.loopDuration) > 0);
  await motion.exposeFunction('qaCycle', number => console.log(`PASS real-time marquee cycle ${number}/3`));
  const cycles = await motion.evaluate(async () => {
    const root = document.querySelector('[data-wave-marquee]'), text = root.querySelector('[data-wave-text]');
    const duration = Number(root.dataset.loopDuration), begun = performance.now();
    let wraps = 0, previous = Number(text.getAttribute('startOffset'));
    await new Promise((resolve, reject) => {
      const sample = () => {
        const current = Number(text.getAttribute('startOffset'));
        if (current > previous + duration * 85 / 2) { wraps++; window.qaCycle(wraps); }
        previous = current;
        if (wraps >= 3) resolve();
        else if (performance.now() - begun > (duration * 3 + 8) * 1000) reject(new Error('Marquee did not complete three cycles'));
        else requestAnimationFrame(sample);
      }; requestAnimationFrame(sample);
    });
    return { wraps, duration, elapsed: (performance.now() - begun) / 1000 };
  });
  assert.ok(cycles.elapsed >= cycles.duration * 2.9, 'Observe real time without speeding up animation');
  results.push(cycles);
  await motion.emulateMedia({ reducedMotion: 'reduce' });
  await motion.waitForFunction(() => document.querySelector('[data-wave-text]').getAttribute('startOffset') === '0');
  const offset = await motion.locator('[data-wave-text]').first().getAttribute('startOffset');
  await motion.waitForTimeout(200); assert.equal(await motion.locator('[data-wave-text]').first().getAttribute('startOffset'), offset);
  assert.deepEqual(errors, []);
  console.log('PASS three seamless marquee cycles, reduced motion and no JavaScript exceptions');
} finally {
  await writeFile(join(output, 'layout-results.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
