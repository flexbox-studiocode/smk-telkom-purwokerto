/* global document, window, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.QA_OUTPUT;
assert(output, 'Set QA_OUTPUT.');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [], errors = [];
try {
  for (const language of ['id', 'en']) for (const width of [1440, 768, 390]) for (const reduced of [false, true]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/api/**', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }));
    await page.addInitScript((lang) => { sessionStorage.setItem('smk-telkom-language', lang); localStorage.setItem('stela-reminder-dismissed-at', String(Date.now())); }, language);
    await page.goto(process.env.QA_URL || 'http://127.0.0.1:5173/');
    const stats = page.locator('[data-home-statistics]');
    await stats.waitFor({ state: 'attached' });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await stats.count(), 1);
    await page.evaluate(() => {
      window.counterSamples = [];
      window.counterTimer = setInterval(() => window.counterSamples.push([...document.querySelectorAll('[data-home-statistics] [data-counter-value]')].map((el) => ({ n: Number(el.textContent.replace(/\D/g, '')), width: el.parentElement.getBoundingClientRect().width }))), 30);
    });
    await stats.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2400);
    const expected = [1030, 57, 59, 45];
    const values = stats.locator('[data-counter-value]');
    assert.deepEqual((await values.allTextContents()).map((s) => Number(s.replace(/\D/g, ''))), expected);
    assert.deepEqual(await values.allTextContents(), [language === 'id' ? '1.030+' : '1,030+', '57+', '59+', '45+']);
    const samples = await page.evaluate(() => { clearInterval(window.counterTimer); return window.counterSamples; });
    for (let i = 0; i < 4; i++) {
      const numbers = samples.filter((sample) => sample.length === 4).map((sample) => sample[i].n);
      if (!reduced) {
        assert(numbers.some((n) => n > 0 && n < expected[i]), `Counter ${i} must animate.`);
        const first = numbers.findIndex((n) => n < expected[i]);
        const animation = numbers.slice(first);
        assert(animation.every((n, index) => index === 0 || n >= animation[index - 1]), 'Counter must increase monotonically.');
      } else assert(numbers.every((n) => n === expected[i]), 'Reduced motion shows final values immediately.');
      const widths = samples.filter((sample) => sample.length === 4).map((sample) => sample[i].width);
      assert(Math.max(...widths) - Math.min(...widths) < 1, 'Counter width must stay stable.');
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await stats.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    assert.deepEqual((await values.allTextContents()).map((s) => Number(s.replace(/\D/g, ''))), expected, 'Scrolling back must not restart counters.');
    assert((await stats.innerText()).includes(language === 'id' ? 'Ruang Kelas & Laboratorium' : 'Classrooms & Laboratories'));
    await page.locator('#tentang').scrollIntoViewIfNeeded();
    const appearance = await page.locator('#tentang').evaluate((section) => ({
      mask: getComputedStyle(section.querySelector('.about-background')).maskImage,
      composite: getComputedStyle(section.querySelector('.about-background')).maskComposite,
      otherMasks: [section, ...section.querySelectorAll('h2,a,video')].map((el) => getComputedStyle(el).maskImage),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    }));
    assert.match(appearance.mask, /22%/);
    assert.match(appearance.mask, /to top/);
    assert.match(appearance.composite, /intersect/);
    assert(appearance.otherMasks.every((mask) => mask === 'none'));
    assert.equal(appearance.overflow, false);
    await page.locator('#tentang').screenshot({ path: join(output, `about-${width}-${language}-${reduced}.png`) });
    results.push({ width, language, reduced, sampleCount: samples.length, ...appearance });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`PASS: ${results.length} responsive/language/motion scenarios, four counters, monotonic progress, stable width, no restart, fade and content isolation.`);
} finally { await browser.close(); }
