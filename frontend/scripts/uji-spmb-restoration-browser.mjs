/* global document, window, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_URL || 'http://localhost:5191';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local integration QA only.');
assert(process.env.QA_ADMIN_EMAIL && process.env.QA_ADMIN_PASSWORD, 'Provide a temporary local QA admin.');
const output = process.env.QA_OUTPUT || join(tmpdir(), 'spmb-restoration-qa');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const guest = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const admin = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await guest.newPage(), panel = await admin.newPage();
const errors = [], results = [];
for (const tab of [page, panel]) tab.on('pageerror', error => errors.push(error.message));
const opening = () => page.locator('[data-hero-slide][data-active="true"]').first();
async function visit(path) {
  await page.goto(base + path);
  await page.locator('footer').waitFor();
  await page.locator('[data-hero-slide][data-active="true"] .hero-image').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function measure() {
  return page.evaluate(async () => {
    await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    const active = document.querySelector('[data-hero-slide][data-active="true"]');
    const hero = active.querySelector('.hero-panel').getBoundingClientRect();
    const copy = active.querySelector('.hero-copy'), title = copy.querySelector('h1,h2');
    const cta = copy.lastElementChild.getBoundingClientRect();
    const floating = document.querySelector('.school-hero .hero-floating').getBoundingClientRect();
    return { height: hero.height, titleSize: getComputedStyle(title).fontSize, ctaGap: floating.top - cta.bottom, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
}
try {
  await visit('/spmb');
  await page.locator('.spmb-timeline li').nth(6).waitFor();
  assert.equal(await page.locator('.spmb-timeline li').count(), 7);
  assert.equal(await page.locator('.spmb-scheme').count(), 3);
  assert.equal(await page.locator('.spmb-info-card a').getAttribute('href'), 'https://wa.me/6281229701800');
  assert.equal(await opening().getByRole('link', { name: 'Daftar SPMB', exact: true }).getAttribute('href'), 'https://ppdb.telkomschools.sch.id/welcome');
  assert(!await page.locator('body').innerText().then(text => /undefined|Invalid Date/.test(text)));
  await page.getByRole('button', { name: 'Informasi', exact: true }).hover();
  await page.getByRole('link', { name: 'Informasi SPMB', exact: true }).first().click();
  assert.equal(new URL(page.url()).pathname, '/spmb');
  await page.getByRole('link', { name: 'Lihat Alur', exact: true }).click();
  await page.waitForURL('**/spmb#alur-spmb');
  await panel.goto(base + '/login');
  await panel.getByLabel('Email', { exact: true }).fill(process.env.QA_ADMIN_EMAIL);
  await panel.getByLabel('Password', { exact: true }).fill(process.env.QA_ADMIN_PASSWORD);
  await panel.locator('button[type="submit"]').click();
  await panel.waitForURL('**/dashboard');
  await panel.goto(base + '/dashboard/informasi-spmb');
  await panel.getByRole('button', { name: 'Tambah Skema Masuk', exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Tambah Skema Masuk', exact: true }).click();
  await panel.getByLabel('Nama', { exact: true }).fill('SPMB QA Temporary');
  await panel.locator('[contenteditable="true"]').fill('Registrasi akun');
  await panel.getByLabel('Sumber informasi', { exact: true }).fill('/spmb');
  await panel.getByLabel('Status publikasi', { exact: true }).selectOption('published');
  await panel.getByRole('button', { name: 'Simpan Informasi', exact: true }).click();
  await panel.getByText('Informasi SPMB berhasil disimpan.', { exact: true }).waitFor();
  await page.reload();
  await page.locator('.spmb-scheme').filter({ hasText: 'SPMB QA Temporary' }).waitFor();
  await panel.getByRole('button', { name: 'Edit SPMB QA Temporary', exact: true }).click();
  await panel.getByLabel('Nama', { exact: true }).fill('SPMB QA Updated');
  await panel.getByRole('button', { name: 'Simpan Informasi', exact: true }).click();
  await panel.getByText('Informasi SPMB berhasil disimpan.', { exact: true }).waitFor();
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.locator('.spmb-scheme').filter({ hasText: 'SPMB QA Updated' }).waitFor();
  // Open the public page with the actual admin session: drafts must still stay hidden.
  await panel.getByRole('button', { name: 'Edit SPMB QA Updated', exact: true }).click();
  await panel.getByLabel('Status publikasi', { exact: true }).selectOption('draft');
  await panel.getByRole('button', { name: 'Simpan Informasi', exact: true }).click();
  await panel.getByText('Informasi SPMB berhasil disimpan.', { exact: true }).waitFor();
  const authenticatedPublic = await admin.newPage();
  await authenticatedPublic.goto(base + '/spmb');
  await authenticatedPublic.locator('.spmb-scheme').nth(2).waitFor();
  assert.equal(await authenticatedPublic.locator('.spmb-scheme').filter({ hasText: 'SPMB QA Updated' }).count(), 0);
  await authenticatedPublic.close();
  await panel.getByRole('button', { name: 'Hapus SPMB QA Updated', exact: true }).click();
  await panel.getByRole('button', { name: 'Ya, Hapus', exact: true }).click();
  await panel.getByText('Informasi SPMB berhasil dihapus.', { exact: true }).waitFor();
  await page.reload();
  await page.locator('.spmb-scheme').nth(2).waitFor();
  assert.equal(await page.locator('.spmb-scheme').count(), 3);
  // Edit a persisted date through the native admin date input, then restore it.
  await panel.getByRole('button', { name: 'Edit EASY', exact: true }).first().click();
  assert.equal(await panel.getByLabel('Tanggal akhir', { exact: true }).inputValue(), '2026-08-31');
  await panel.getByLabel('Tanggal mulai', { exact: true }).fill('2026-08-01');
  await panel.getByRole('button', { name: 'Simpan Informasi', exact: true }).click();
  await panel.getByText('Informasi SPMB berhasil disimpan.', { exact: true }).waitFor();
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.spmb-wave-table')?.innerText.includes('1 Agu 2026'));
  await panel.getByRole('button', { name: 'Edit EASY', exact: true }).first().click();
  await panel.getByLabel('Tanggal mulai', { exact: true }).fill('');
  await panel.getByRole('button', { name: 'Simpan Informasi', exact: true }).click();
  await panel.getByText('Informasi SPMB berhasil disimpan.', { exact: true }).waitFor();
  results.push({ admin: 'real login, create, edit, publish/draft, delete, date edit, focus sync; public admin-session draft isolation' });
  for (const language of ['id', 'en']) {
    await page.evaluate(lang => sessionStorage.setItem('smk-telkom-language', lang), language);
    const references = {};
    await visit('/jurusan');
    for (const width of [1920, 1440, 1280, 1024, 820, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      references[width] = await measure();
    }
    await visit('/spmb');
    await page.locator('.spmb-timeline li').nth(6).waitFor();
    for (const width of [1920, 1440, 1280, 1024, 820, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const reference = references[width];
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const measured = await measure();
      assert(!measured.overflow, `${language}/${width}: horizontal overflow`);
      if (width >= 1024) {
        assert(Math.abs(measured.height - reference.height) <= 1, `${language}/${width}: hero heights differ`);
        assert.equal(measured.titleSize, reference.titleSize);
        assert(measured.ctaGap >= 16, `${language}/${width}: CTA overlaps floating cards: ${JSON.stringify(measured)}`);
      }
      if (language === 'en') {
        assert.equal(await page.getByRole('heading', { name: 'Create an Account', exact: true }).count(), 1);
        assert.equal(await page.getByRole('heading', { name: 'Admission Timeline', exact: true }).count(), 1);
        assert((await page.locator('.spmb-wave-table').innerText()).includes('Aug 31, 2026'));
      }
      await page.screenshot({ path: join(output, `spmb-${language}-${width}.png`) });
      for (const section of await page.locator('.spmb-page .reveal').all()) await section.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: join(output, `spmb-${language}-${width}-full.png`), fullPage: true });
      results.push({ language, width, reference, spmb: measured });
    }
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await visit('/');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('button', { name: 'Information', exact: true }).click();
  await page.getByRole('link', { name: 'SPMB Information', exact: true }).first().click();
  await page.waitForURL('**/spmb');
  assert.deepEqual(errors, []);
  console.log('PASS: actual MySQL/Admin UI CRUD and sync, 14 ID/EN responsive comparisons, navigation, original structure, safe dates and draft isolation.');
} finally {
  await writeFile(join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
