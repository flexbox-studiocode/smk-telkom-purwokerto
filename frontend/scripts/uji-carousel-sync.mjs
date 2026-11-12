/* global document, window, getComputedStyle, requestAnimationFrame */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_URL || 'http://127.0.0.1:4174';
const output = process.env.QA_OUTPUT || '../outputs/carousel-sync';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ reducedMotion: 'no-preference' });
const errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('**/rest/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

// A separate CSS transition or a delayed card start breaks this frame-by-frame assertion.
async function checkMotion(section, kind, direction) {
  const frames = await section.evaluate((root, { kind, direction }) => new Promise(resolve => {
    const viewport = root.querySelector(kind === 'teacher' ? '[data-sliding-page]' : '.campus-gallery-viewport');
    const dots = root.querySelector(kind === 'teacher' ? '[data-teacher-pagination] > div' : '[aria-label="Pilih foto fasilitas"]');
    const active = kind === 'teacher' ? dots.querySelector('[aria-current="page"]') : dots.querySelector('[aria-pressed="true"]');
    const oldPill = kind === 'teacher' ? dots.querySelector('[data-teacher-pill]') : active.firstElementChild;
    const oldX = new window.DOMMatrixReadOnly(getComputedStyle(oldPill).transform).m41;
    const oldIndex = [...dots.querySelectorAll('button')].indexOf(active);
    const targetIndex = kind === 'teacher' ? oldIndex + direction : (oldIndex + direction + dots.children.length) % dots.children.length;
    const target = kind === 'teacher' ? oldPill : dots.children[targetIndex].firstElementChild;
    const controls = root.querySelectorAll(kind === 'teacher' ? '[data-teacher-pagination] > button' : '.campus-photo-arrow');
    for (let i = 0; i < 12; i++) controls[direction === 1 ? 1 : 0].click();
    const frames = [], start = performance.now();
    const tick = now => {
      const x = new window.DOMMatrixReadOnly(getComputedStyle(viewport.firstElementChild).transform).m41;
      const pill = kind === 'teacher'
        ? (new window.DOMMatrixReadOnly(getComputedStyle(target).transform).m41 - oldX) / (direction * 32)
        : (parseFloat(getComputedStyle(target).width) - 8) / 12;
      frames.push({ ms: now - start, card: 1 - Math.abs(x) / viewport.clientWidth, pill, outgoing: !!viewport.querySelector('[data-motion-outgoing]') });
      if (now - start < 650) requestAnimationFrame(tick); else resolve(frames);
    };
    requestAnimationFrame(tick);
  }), { kind, direction });
  const moving = frames.filter(frame => frame.outgoing && frame.card > .02 && frame.card < .98);
  assert.ok(moving.length >= 3, `${kind}: no smooth motion: ${JSON.stringify(frames.slice(0, 5))}`);
  assert.ok(moving.every(frame => Math.abs(frame.card - frame.pill) < .04), `${kind}: card/pill timing differs: ${JSON.stringify(moving.slice(0, 5))}`);
  assert.equal(frames.at(-1).outgoing, false, 'Rapid clicks leave no outgoing layer');
  assert.ok(Math.abs(frames.at(-1).pill - 1) < .01, 'Pill reaches its target');
  results.push({ kind, direction, frames });
}

async function openHotspot(id) {
  await page.locator('.campus-slider').press('Home');
  await page.waitForTimeout(350);
  await page.locator(`[data-campus-hotspot="${id}"]`).focus();
  await page.locator(`[data-campus-hotspot="${id}"]`).press('Enter');
  await page.locator('[data-campus-preview] [data-outgoing="false"]').waitFor();
  await page.waitForTimeout(350);
}

try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base);
    await page.evaluate(() => sessionStorage.setItem('smk-telkom-language', 'id'));
    await page.goto(base + '/profil-sekolah/guru');
    for (const id of ['kesiswaan', 'guru']) {
      const section = page.locator(`section[aria-labelledby="${id}-list-title"]`);
      await section.locator('[data-teacher-pagination]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(350);
      await checkMotion(section, 'teacher', 1);
      await checkMotion(section, 'teacher', -1);
    }
    await page.goto(base + '/fasilitas');
    await page.waitForFunction(() => document.querySelector('.campus-viewport')?.dataset.mapReady === 'true');
    await openHotspot('gedung-c');
    const content = page.locator('[data-campus-preview] [data-outgoing="false"]');
    const gallery = content.locator('[data-facility-carousel]');
    await gallery.locator('[aria-pressed="true"]').waitFor();
    await gallery.locator('.campus-photo-main img').evaluate(image => image.decode());
    await checkMotion(gallery, 'photo', 1);
    await checkMotion(gallery, 'photo', -1);
    // Previous from zero must wrap to the last photo and next must return to zero.
    await gallery.locator('.campus-photo-arrow--previous').click();
    await page.waitForTimeout(600);
    const count = await gallery.locator('[aria-pressed]').count();
    assert.equal(Number(await gallery.getAttribute('data-photo-index')), count - 1);
    await gallery.locator('.campus-photo-arrow--next').click();
    await page.waitForTimeout(600);
    assert.equal(await gallery.getAttribute('data-photo-index'), '0');
    const alignment = await content.evaluate(root => [...root.querySelectorAll('.campus-photo-arrow')].map(button => {
      const box = button.getBoundingClientRect(), image = button.querySelector('img').getBoundingClientRect();
      return { dx: image.x + image.width / 2 - box.x - box.width / 2, dy: image.y + image.height / 2 - box.y - box.height / 2 };
    }));
    assert.ok(alignment.every(({ dx, dy }) => Math.abs(dx) < .25 && Math.abs(dy) < .25), 'Chevron artwork must be centered');
    const selectAlignment = await content.locator('select').evaluate(select => {
      const box = select.getBoundingClientRect(), icon = select.nextElementSibling.getBoundingClientRect();
      return { dy: icon.y + icon.height / 2 - box.y - box.height / 2, inset: box.right - icon.right };
    });
    assert.ok(Math.abs(selectAlignment.dy) < .25);
    assert.equal(selectAlignment.inset, 12);
    await content.screenshot({ path: `${output}/gallery-${width}.png`, animations: 'disabled' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gallery.locator('.campus-photo-arrow--next').click();
    assert.equal(await gallery.locator('[data-motion-outgoing]').count(), 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    for (const language of ['id', 'en']) {
      await page.evaluate(language => sessionStorage.setItem('smk-telkom-language', language), language);
      await page.reload();
      await page.waitForFunction(() => document.querySelector('.campus-viewport')?.dataset.mapReady === 'true');
      for (const id of ['gedung-d-1', 'gedung-d-2']) {
        await openHotspot(id);
        assert.equal(await page.locator('[data-campus-preview]').getAttribute('data-campus-preview'), 'gor');
        const body = page.locator('[data-campus-preview] [data-outgoing="false"]');
        assert.ok((await body.innerText()).includes(language === 'id' ? 'GOR' : 'Sports Hall'));
        assert.equal(await body.locator('select').count(), 0, 'GOR must not offer classroom D dropdown');
        await body.getByRole('button', { name: language === 'id' ? 'Lihat daftar fasilitas' : 'View facility list', exact: true }).click();
        await page.waitForURL('**kategori=GOR');
        await page.waitForFunction(() => document.querySelectorAll('[data-facility-card]').length === 4);
        assert.equal(await page.locator('[data-facility-card]').count(), 4);
        assert.ok((await page.locator('[data-facility-card] h4').allTextContents()).some(name => /Futsal/.test(name)));
        await page.locator('[data-facility-card]').first().getByRole('button').click();
        await page.locator('dialog[open]').getByRole('button', { name: language === 'id' ? 'Lihat lokasi di peta' : 'View location on map', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('[data-campus-preview]')?.dataset.campusPreview === 'gor');
        await page.locator('[data-campus-preview] > button').click();
        await page.locator('[data-campus-preview]').waitFor({ state: 'hidden' });
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    }
    await page.screenshot({ path: `${output}/gor-${width}.png`, fullPage: true });
    await page.evaluate(() => sessionStorage.setItem('smk-telkom-language', 'id'));
    await page.goto(base);
    const navPage = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
    navPage.on('pageerror', error => errors.push(error.message));
    await navPage.route('**/rest/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await navPage.goto(base);
    await navPage.locator('#fasilitas').waitFor();
    await navPage.evaluate(() => document.fonts.ready);
    if (width < 1280) await navPage.getByRole('button', { name: 'Buka menu', exact: true }).click();
    await navPage.waitForTimeout(350);
    for (const name of ['tentang', 'informasi']) {
      const control = `${width < 1280 ? 'mobile' : 'desktop'}-${name}-links`;
      const button = navPage.locator(`header button[aria-controls="${control}"]`);
      await button.waitFor({ state: 'visible' });
      const measure = () => button.evaluate(element => {
        const box = element.getBoundingClientRect(), icon = element.querySelector('svg').getBoundingClientRect();
        return { dy: icon.y + icon.height / 2 - box.y - box.height / 2, width: icon.width, height: icon.height };
      });
      const normal = await measure();
      assert.ok(Math.abs(normal.dy) < .25);
      assert.equal(normal.width, normal.height);
      await button.hover();
      assert.deepEqual(await measure(), normal, 'Chevron must not shift on hover');
      await button.click();
      assert.deepEqual(await measure(), normal, `${width}px ${control}: Chevron must not shift when toggled`);
    }
    await navPage.close();
    const next = page.getByRole('button', { name: 'Fasilitas berikutnya', exact: true });
    const previous = page.getByRole('button', { name: 'Fasilitas sebelumnya', exact: true });
    await next.scrollIntoViewIfNeeded();
    await next.hover();
    const active = () => page.locator('#fasilitas [data-slide].z-10').getAttribute('data-flip-id');
    const initial = await active();
    for (const button of [next, previous]) {
      for (let i = 0; i < 6; i++) {
        const before = Number((await active()).split('-')[1]);
        await button.evaluate(element => { for (let click = 0; click < 12; click++) element.click(); });
        await page.waitForTimeout(550);
        assert.equal(await active(), `facility-${(before + (button === next ? 1 : 5)) % 6}`);
        assert.equal(await page.locator('#fasilitas ol button[aria-pressed="true"]').count(), 1);
        const selectedIndex = await page.locator('#fasilitas ol button').evaluateAll(buttons => buttons.findIndex(button => button.getAttribute('aria-pressed') === 'true'));
        assert.equal(await active(), `facility-${selectedIndex}`);
      }
      assert.equal(await active(), initial);
    }
    await page.mouse.move(0, 0);
    await page.waitForFunction(before => document.querySelector('#fasilitas [data-slide].z-10')?.dataset.flipId !== before, initial, { timeout: 8500 });
    await page.waitForTimeout(550);
    await next.click();
    await page.waitForTimeout(550);
    const manual = await active();
    await page.mouse.move(0, 0);
    await page.waitForFunction(before => document.querySelector('#fasilitas [data-slide].z-10')?.dataset.flipId !== before, manual, { timeout: 8500 });
    await page.waitForTimeout(550);
    results.push({ width, landingLoop: 'both directions', autoplay: 'pass', resumeAfterManual: 'pass' });
  }
  assert.deepEqual(errors, []);
  console.log('PASS: frame-by-frame card/pill sync, both teacher grids, facility photos, Next/Previous, rapid clicks, photo/landing loop, real autoplay/resume, centered arrows/dropdown, reduced motion, GOR map/filter ID/EN, 1440/390px, overflow, runtime.');
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
