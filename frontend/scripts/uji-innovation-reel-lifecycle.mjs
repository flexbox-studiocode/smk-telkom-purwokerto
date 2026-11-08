/* global window, document, getComputedStyle */
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/**', r => r.fulfill({ contentType: 'application/json', body: '[]' }));
try {
  await page.goto((process.env.QA_URL || 'http://127.0.0.1:5173') + '/');
  const root = page.locator('[data-innovation-reveal]');
  await root.scrollIntoViewIfNeeded(); await page.waitForTimeout(1000);
  // Use the app's GSAP instance to check timeline identity and inherited transforms.
  await page.evaluate(async () => {
    const url = window.performance.getEntriesByType('resource').find(entry => entry.name.includes('/deps/gsap.js?')).name;
    const { gsap } = await import(url);
    window.reelQA = { gsap, timeline: () => gsap.globalTimeline.getChildren().find(t => t.vars.repeat === -1 && t.getChildren?.().some(child => child.targets?.().includes(document.querySelector('[data-innovation-reel]')))) };
    window.reelQA.original = window.reelQA.timeline();
  });
  assert.equal(await page.evaluate(() => Boolean(window.reelQA.original)), true, 'Inspect the actual application timeline');
  assert.equal(await page.evaluate(() => window.reelQA.original.getChildren().find(t => t.vars.xPercent === -100).duration()), 2.4, 'Slide duration is 2.4 seconds');
  for (const fraction of [.95, .5, 1.2, .5, .95, .5]) {
    await root.evaluate((n, fraction) => window.scrollTo({ top: window.scrollY + n.getBoundingClientRect().top - window.innerHeight * fraction, behavior: 'instant' }), fraction);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.reelQA.timeline() === window.reelQA.original), true, 'Scrolling must pause/resume the same reel timeline');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.reelQA.gsap.set(document.querySelector('[data-innovation-reel]'), { x: -900, y: 50, xPercent: -250, opacity: 0 }));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await root.scrollIntoViewIfNeeded(); await page.waitForTimeout(350);
  const start = await root.locator('[data-innovation-reel]').evaluate(n => ({ opacity: getComputedStyle(n).opacity, y: new window.DOMMatrixReadOnly(getComputedStyle(n).transform).m42, x: new window.DOMMatrixReadOnly(getComputedStyle(n).transform).m41 }));
  assert.equal(start.opacity, '1'); assert.equal(start.y, 0); assert.equal(start.x, 0, 'Initialization must clear an inherited offscreen transform');
  console.log('PASS viewport lifecycle and explicit visible initialization');
  for (const path of ['/profil-sekolah', '/']) {
    await page.locator(`a[href="${path}"]`).first().evaluate(n => n.click());
    await page.waitForURL(url => url.pathname === path);
    await root.waitFor(); await root.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    assert.equal(await root.locator('[data-innovation-reel]').count(), 1);
  }
  await page.reload(); await root.waitFor(); await root.scrollIntoViewIfNeeded();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await root.locator('[data-innovation-reel]').evaluate(n => getComputedStyle(n).transform), 'none');
  assert.deepEqual(errors, []); console.log('PASS navigation, reload, reduced motion, no exceptions');
} finally { await browser.close(); }
