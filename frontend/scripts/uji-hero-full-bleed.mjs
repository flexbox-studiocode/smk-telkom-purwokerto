/* global document, window, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_URL || 'http://127.0.0.1:5173';
const output = process.env.QA_OUTPUT || join(tmpdir(), 'hero-full-bleed');
const baseline = process.env.QA_BASELINE === '1';
if (!baseline) {
  const wave = await sharp(fileURLToPath(new URL('../src/assets/kalender/hero-wave-figma.webp', import.meta.url))).stats();
  assert.equal(wave.isOpaque, false, 'Calendar wave must preserve transparency above the collage');
}
const paths = ['/', '/profil-sekolah', '/profil-sekolah/guru', '/ekstrakurikuler', '/kalender', '/spmb', '/fasilitas', '/pengumuman', '/bkk', '/jurusan', '/prestasi', '/berita'];
const compositions = new Set(['/', '/profil-sekolah', '/profil-sekolah/guru', '/ekstrakurikuler', '/kalender', '/spmb', '/fasilitas', '/pengumuman', '/bkk', '/jurusan', '/berita', '/prestasi']);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ reducedMotion: 'reduce' });
const errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('**/rest/v1/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
try {
  for (const path of paths) {
    await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    for (const width of (baseline ? [1440] : [1920, 1847, 1440, 1280, 1024, 768, 390, 320])) {
      await page.setViewportSize({ width, height: 1100 });
      const panel = page.locator('.hero-carousel-viewport');
      await panel.waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => Promise.all(document.querySelector('main').getAnimations().map(animation => animation.finished.catch(() => {}))));
      await panel.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
      for (const language of (baseline ? ['id'] : ['id', 'en'])) {
        if (await page.locator('html').getAttribute('lang') !== language) {
          await page.locator('header').getByRole('button', { name: language === 'id' ? 'Switch to Indonesian' : 'Switch to English', exact: true }).click();
          await page.waitForFunction(lang => document.documentElement.lang === lang, language);
          await panel.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
        }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        const geometry = await panel.evaluate(panel => {
          const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
          const active = panel.querySelector('[data-hero-slide][data-active="true"]'), p = rect(panel), media = active.querySelector('.hero-media, .hero-background, .hero-calendar-art, .hero-image');
          const bar = document.querySelector('.hero-floating');
          return {
            panel: p, media: rect(media), copy: rect(active.querySelector('.hero-copy')),
            radius: getComputedStyle(panel).borderTopLeftRadius,
            controls: [...active.querySelector('.hero-copy').querySelectorAll('a, input')].map(rect),
            bar: bar ? rect(bar) : null,
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            broken: [...active.querySelectorAll('img')].filter(img => !img.complete || !img.naturalWidth).length,
            images: [...active.querySelectorAll('img')].map(img => ({ src: img.currentSrc.split('/').pop(), natural: [img.naturalWidth, img.naturalHeight], box: rect(img), fit: getComputedStyle(img).objectFit, position: getComputedStyle(img).objectPosition })),
            navbarGap: p.y - document.querySelector('header').getBoundingClientRect().bottom,
          };
        });
        results.push({ path, width, language, geometry });
        if (language === 'id' && [1847, 1440, 1024, 768, 390].includes(width)) await page.locator('.school-hero').screenshot({ path: join(output, `${path.slice(1).replaceAll('/', '-') || 'beranda'}-${width}.png`), animations: 'disabled' });
        if (baseline) continue;
        assert.deepEqual(await panel.locator('[data-hero-slide][data-active="true"] [data-hero-badges] span').allTextContents(), ['#NextGens', '#GlobalTechnopreneur'], `${path}/${width}/${language}: complete school branding`);
        assert.equal(geometry.overflow, false, `${path}/${width}/${language}: overflow`);
        assert.equal(geometry.broken, 0, `${path}: broken artwork`);
        assert.equal(geometry.radius, '32px');
        assert.equal(geometry.panel.width, Math.min(width, 1280) - (width >= 1024 ? 64 : width >= 640 ? 48 : 32));
        assert(Math.abs(geometry.navbarGap - 16) < 1);
        assert(geometry.controls.every(c => c.x >= geometry.panel.x && c.right <= geometry.panel.right + 1 && c.bottom <= geometry.panel.bottom), `${path}/${width}/${language}: controls clipped`);
        if (width >= 1024) {
          assert.equal(geometry.panel.height, width >= 1280 ? 464 : 544, `${path}: container changed`);
          if (compositions.has(path)) {
            assert(Math.abs(geometry.media.right - (geometry.panel.right - 1)) < 1, `${path}: right edge gap`);
            assert(geometry.media.y >= geometry.panel.y && geometry.media.y < geometry.panel.bottom, `${path}: artwork inside panel`);
            assert(Math.abs(geometry.media.bottom - (geometry.panel.bottom - 1)) < 1, `${path}: bottom edge gap`);
          }
        } else {
          assert(geometry.media.y >= geometry.copy.bottom - 1, `${path}: mobile artwork overlaps text`);
        }
        if (geometry.bar) {
          assert(Math.abs(geometry.panel.bottom - geometry.bar.y - 40) < 1, `${path}: floating overlap`);
          assert(Math.abs(geometry.panel.x + geometry.panel.width / 2 - geometry.bar.x - geometry.bar.width / 2) < 1);
          assert(geometry.controls.every(c => c.bottom < geometry.bar.y), `${path}: card covers controls`);
        }
        if (path === '/kalender') {
          assert.equal(await panel.locator('.calendar-hero-collage').count(), 1);
          assert.equal(await panel.locator('.calendar-hero-building').count(), 1);
        }
      }
    }
    console.log(`PASS ${path}`);
  }
  assert.deepEqual(errors, []);
  for (const program of ['rpl', 'pg', 'tkj', 'tjat']) {
    await page.goto(`${base}/jurusan/${program}`);
    const badges = page.locator('[data-hero-slide][data-active="true"] [data-hero-badges]');
    await badges.waitFor();
    assert.deepEqual(await badges.locator('span').allTextContents(), ['#NextGens', '#GlobalTechnopreneur']);
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ${results.length} viewport/language checks${baseline ? ' (baseline)' : ': image coverage, dimensions, controls, floating cards, assets and runtime'}.`);
} finally {
  await writeFile(join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
