/* global document, window, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = process.env.QA_OUTPUT || 'outputs/innovation-motion';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.route('**/api/**', r => r.fulfill({ contentType: 'application/json', body: '[]' }));
const root = page.locator('[data-innovation-reveal]');
const sleep = ms => page.waitForTimeout(ms);
const sample = () => root.evaluate(node => {
  const box = node.querySelector('.home-innovation-box'), reel = node.querySelector('[data-innovation-reel]');
  const rect = box.getBoundingClientRect();
  const range = document.createRange(); range.selectNodeContents(reel.firstElementChild);
  const text = range.getBoundingClientRect();
  const visibleWidth = [...reel.children].reduce((total, child) => {
    range.selectNodeContents(child); const r = range.getBoundingClientRect();
    return total + Math.max(0, Math.min(r.right, rect.right) - Math.max(r.left, rect.left));
  }, 0);
  return { x: new window.DOMMatrixReadOnly(getComputedStyle(reel).transform).m41, width: rect.width,
    y: new window.DOMMatrixReadOnly(getComputedStyle(reel).transform).m42, visibleWidth,
    opacity: getComputedStyle(reel).opacity, left: rect.left, top: rect.top, full: text.left >= rect.left - .5 && text.right <= rect.right + .5 };
});
try {
  await page.goto((process.env.QA_URL || 'http://127.0.0.1:5173') + '/');
  await root.scrollIntoViewIfNeeded(); await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await sleep(100);
  assert.ok((await sample()).full, 'The whole phrase must fit at the centered stop');
  for (const width of [1440, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await root.scrollIntoViewIfNeeded(); await sleep(300);
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await root.scrollIntoViewIfNeeded(); await sleep(150);
  const holds = []; let since = null, last = await sample(), begun = Date.now(), seenMotion = false;
  while (holds.length < 5 && Date.now() - begun < 32000) {
    await sleep(50); const next = await sample();
    assert.ok(Math.abs(next.width - last.width) < .5 && Math.abs(next.left - last.left) < .5 && Math.abs(next.top - last.top) < .5, 'Stable box layout');
    assert.equal(next.y, 0, 'Only horizontal movement');
    assert.equal(next.opacity, '1'); assert.ok(next.visibleWidth > next.width * .5, 'Text must remain visible through every frame');
    if (Math.abs(next.x) < .1) {
      assert.ok(next.full, 'No clipping during pause'); if (seenMotion) since ??= Date.now();
    } else {
      seenMotion = true;
      if (since !== null) { holds.push(Date.now() - since); since = null; }
    }
    last = next;
  }
  assert.equal(holds.length, 5); assert.ok(holds.every(ms => ms >= 1500 && ms <= 2100), JSON.stringify(holds));
  console.log('PASS five slide/pause cycles:', width, holds);
  }
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const language of ['id', 'en']) {
      if (await page.locator('html').getAttribute('lang') !== language) await page.getByRole('button', { name: /^Switch to / }).first().click();
      await root.scrollIntoViewIfNeeded(); await page.emulateMedia({ reducedMotion: 'reduce' }); await root.scrollIntoViewIfNeeded(); await sleep(150);
      assert.ok((await sample()).full, `Phrase fits ${width} ${language}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      await root.screenshot({ path: `${out}/${width}-${language}.png` });
    }
  }
  console.log('PASS responsive ID/EN, reduced motion');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const path of ['/', '/profil-sekolah']) {
    await page.goto((process.env.QA_URL || 'http://127.0.0.1:5173') + path);
    await root.scrollIntoViewIfNeeded();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const language of ['id', 'en']) {
        if (await page.locator('html').getAttribute('lang') !== language) await page.getByRole('button', { name: /^Switch to / }).first().click();
        await root.scrollIntoViewIfNeeded(); await page.evaluate(() => document.fonts.ready);
        const foreground = root.locator('[data-reveal-foreground]');
        assert.ok(await foreground.count() >= 7, 'Restore the Vercel word reveal, not the character typewriter');
        const move = async progress => {
          await root.evaluate((node, progress) => window.scrollTo({ top: window.scrollY + node.getBoundingClientRect().top - .88 * window.innerHeight + progress * (node.offsetHeight + .4 * window.innerHeight), behavior: 'instant' }), progress);
          await sleep(300);
          return foreground.evaluateAll(words => words.map(word => +getComputedStyle(word).opacity));
        };
        for (let cycle = 0; cycle < 3; cycle++) {
          const hidden = await move(-.5);
          assert.ok(hidden.every(value => value < .01), 'Leaving above the viewport resets all words');
          const partial = await move(.4);
          assert.ok(partial.some(value => value > .99) && partial.some(value => value < .01), `Words reveal progressively with scroll: ${path} ${width} ${language} ${JSON.stringify(partial)}`);
          const still = await foreground.evaluateAll(words => words.map(word => +getComputedStyle(word).opacity));
          await sleep(150);
          assert.deepEqual(await foreground.evaluateAll(words => words.map(word => +getComputedStyle(word).opacity)), still, 'Reveal holds its progress when scrolling stops');
          assert.ok((await move(1.5)).every(value => value > .99), 'Words finish revealing before exiting above');
          const reverse = await move(.4);
          assert.ok(reverse.every((value, index) => Math.abs(value - partial[index]) < .03), 'Upward scrolling retraces the same reveal');
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.ok((await move(0)).every(value => value > .99), 'Reduced motion keeps every word readable');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
      }
    }
  }
  assert.deepEqual(errors, []); console.log('PASS scroll word reveal, replay both directions, ID/EN, reduced motion and no exceptions');
} finally { await browser.close(); }
