import assert from 'node:assert/strict';
import { OFFICIAL_ADMISSIONS_URL, isHiddenAdmissionsPath } from '../src/utils/admissions.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const routes = ['/', '/profil-sekolah', '/jurusan', '/jurusan/rpl', '/jurusan/pg', '/jurusan/tkj', '/jurusan/tjat', '/prestasi', '/bkk', '/berita', '/pengumuman', '/fasilitas', '/kalender', '/sinergi', '/ekstrakurikuler', '/nexttel', '/jurusan/faq'];
let checked = 0;
try {
  for (const language of ['id', 'en']) for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await page.addInitScript((lang) => { sessionStorage.setItem('smk-telkom-language', lang); }, language);
    await page.route('**/api/**', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }));
    await page.route(`${OFFICIAL_ADMISSIONS_URL}**`, (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Official portal fixture</h1>' }));
    for (const route of routes) {
      await page.goto(base + route);
      await page.locator('footer').waitFor();
      const links = await page.locator('a[href]').evaluateAll((elements) => elements.map((el) => ({ href: el.getAttribute('href'), target: el.target, rel: el.rel })));
      assert(links.some((link) => link.href === OFFICIAL_ADMISSIONS_URL), `${route}: missing official CTA`);
      assert(!links.some((link) => isHiddenAdmissionsPath(link.href.split(/[?#]/)[0])), `${route}: internal admissions link`);
      assert(links.filter((link) => link.href === OFFICIAL_ADMISSIONS_URL && link.target === '_blank').every((link) => link.rel.includes('noopener') && link.rel.includes('noreferrer')));
      checked++;
    }
    await page.goto(base);
    await page.locator('footer').waitFor();
    await page.locator('#ppdb a').click();
    await page.waitForURL(OFFICIAL_ADMISSIONS_URL);
    await page.close();
  }
  const page = await browser.newPage();
  const destinations = [], apiCalls = [];
  await page.route(`${OFFICIAL_ADMISSIONS_URL}**`, (route) => { destinations.push(route.request().url()); return route.fulfill({ contentType: 'text/html', body: '<h1>Official portal fixture</h1>' }); });
  await page.route('**/api/**', (route) => { apiCalls.push(route.request().url()); return route.fulfill({ contentType: 'application/json', body: '[]' }); });
  for (const path of ['/spmb/masuk', '/SPMB/masuk', '/%73pmb/masuk', '/spmb/formulir', '/spmb/berkas', '/spmb/status', '/ppdb', '/ppdb/daftar', '/ketentuan-spmb', '/auth/confirm', '/lupa-sandi']) {
    await page.goto(`${base}${path}?access_token=qa-secret#refresh_token=qa-secret`);
    await page.waitForURL(OFFICIAL_ADMISSIONS_URL);
  }
  assert.equal(destinations.length, 11);
  assert(destinations.every((url) => url === OFFICIAL_ADMISSIONS_URL), 'Legacy tokens must not be forwarded.');
  assert(!apiCalls.some((url) => /\/api\/(?:auth|ppdb|spmb)(?:\/|$)/.test(new URL(url).pathname)), 'Hidden portal must not mount authentication/admissions data providers.');
  await page.close();
  console.log(`PASS: ${checked} public route/language/viewport checks, external CTA navigation, 11 safe legacy redirects, no internal portal API calls.`);
} finally { await browser.close(); }
