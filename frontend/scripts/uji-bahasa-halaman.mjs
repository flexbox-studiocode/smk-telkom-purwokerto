/* global document, NodeFilter */
// Renders every public route in Indonesian and English, then fails when the English render still shows
// untranslated copy: a dictionary key shown as-is, or Indonesian text that is identical in both languages.
// Usage: QA_URL=http://127.0.0.1:5173 PLAYWRIGHT_MODULE=playwright node scripts/uji-bahasa-halaman.mjs
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_URL || 'http://127.0.0.1:5173';
const server = await createServer({ root: process.cwd(), appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
const dictionary = (await server.ssrLoadModule('/src/data/translations.js')).default;
await server.close();
const routes = ['/', '/fasilitas', '/profil-sekolah', '/profil-sekolah/guru', '/jurusan', '/jurusan/rpl', '/jurusan/pg', '/jurusan/tkj', '/jurusan/tjat', '/jurusan/faq', '/jurusan/perbandingan', '/prestasi', '/prestasi/galeri', '/bkk', '/bkk/panduan', '/berita', '/berita/trending', '/berita/agenda', '/pengumuman', '/pengumuman/populer', '/pengumuman/semua', '/pengumuman/timeline', '/pengumuman/informasi-penting', '/kalender', '/galeri', '/ekstrakurikuler', '/nexa', '/nexttel', '/kebijakan-privasi', '/layanan/digits', '/layanan/saku', '/tidak-ada-halaman'];
// Common Indonesian function words; two or more in an unchanged string means the copy was never translated.
const indonesian = new Set('yang dan untuk dengan dari pada ini itu adalah atau juga akan dapat sudah belum tidak ada kami kita kamu siswa sekolah lihat daftar jurusan kegiatan informasi pendaftaran bagi oleh serta sebagai dalam agar telah sedang masih lebih sangat semua setiap beberapa baru terbaru bisa harus silakan halaman kembali cari pilih tampilkan tutup buka lanjut selanjutnya sebelumnya masuk tempat berita pengumuman layanan lowongan lulusan tingkat hasil'.split(' '));
const collect = () => {
  const found = new Set(); const add = (kind, value) => { value = (value || '').replace(/\s+/g, ' ').trim(); if (value) found.add(`${kind}|${value}`); };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) { const parent = walker.currentNode.parentElement; if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) add('text', walker.currentNode.textContent); }
  for (const node of document.querySelectorAll('[alt],[aria-label],[title],[placeholder]')) for (const name of ['alt', 'aria-label', 'title', 'placeholder']) if (node.hasAttribute(name)) add(name, node.getAttribute(name));
  add('document title', document.title); add('meta description', document.querySelector('meta[name=description]')?.content);
  return [...found];
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const failures = [];
async function render(route, language) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(value => { try { sessionStorage.setItem('smk-telkom-language', value); } catch { /* storage unavailable */ } }, language);
  const page = await context.newPage();
  await page.route('**/api/**', request => request.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"offline"}' }));
  await page.goto(base + route);
  // Lazy routes can take a moment on a cold server; wait until the HTML shell's default description is replaced.
  await page.waitForFunction(() => !document.querySelector('meta[name=description]')?.content.startsWith('SMK Telkom Purwokerto - Sekolah Menengah'), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const result = { items: await page.evaluate(collect), lang: await page.evaluate(() => document.documentElement.lang) };
  await context.close(); return result;
}
for (const route of routes) {
  const [id, en] = [await render(route, 'id'), await render(route, 'en')];
  if (en.lang !== 'en') failures.push(`${route}: <html lang> is "${en.lang}" in English mode`);
  const original = new Set(id.items);
  for (const item of en.items) {
    const [kind, , value] = [item.split('|')[0], '|', item.slice(item.indexOf('|') + 1)];
    if (!/[A-Za-z]{3}/.test(value)) continue;
    if (Object.hasOwn(dictionary, value) && dictionary[value] !== value) failures.push(`${route} [${kind}] shows an untranslated key: ${value.slice(0, 90)}`);
    else if (original.has(item) && (value.toLowerCase().match(/[a-z]+/g) || []).filter(word => indonesian.has(word)).length >= 2) failures.push(`${route} [${kind}] is Indonesian in English mode: ${value.slice(0, 90)}`);
  }
}
// The NextTel questionnaire is rendered from data, so check it explicitly.
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await context.addInitScript(() => sessionStorage.setItem('smk-telkom-language', 'en'));
const page = await context.newPage();
await page.goto(`${base}/nexttel`); await page.getByRole('button', { name: /start/i }).first().click();
for (let step = 0; step < 8; step += 1) {
  const title = (await page.locator('#nexttel-question').innerText()).trim();
  if (Object.hasOwn(dictionary, title) || !/[?]$/.test(title) || (title.toLowerCase().match(/[a-z]+/g) || []).some(word => ['apa', 'kamu', 'yang'].includes(word))) failures.push(`NextTel question ${step + 1} is not English: ${title}`);
  await page.locator('label:has(input[type=radio])').first().click(); await page.getByRole('button', { name: /next|complete/i }).last().click();
}
await context.close(); await browser.close();
assert.deepEqual(failures, [], `English localization gaps:\n${failures.join('\n')}`);
console.log(`PASS English localization: ${routes.length} routes, <html lang>, metadata, alt/aria text and the NextTel quiz.`);
