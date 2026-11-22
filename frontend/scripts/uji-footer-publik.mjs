import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

// Regresi footer publik:
// - Branding "Supported by: Flexbox" harus menjadi tautan eksternal ke microsite
//   dengan target/rel yang aman dan nama aksesibel.
// - Pintu masuk staf/admin (/login) tidak boleh lagi tampil di footer publik.
// - Kebijakan Privasi, kontak, peta, dan tautan sosial tetap tersedia.
const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { default: Footer } = await server.ssrLoadModule('/src/components/Footer.jsx');
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Footer)));

  const flexbox = html.match(/<a[^>]*href="https:\/\/microsite\.flexbox\.web\.id\/"[^>]*>[\s\S]*?<\/a>/)?.[0];
  assert.ok(flexbox, 'Footer menautkan branding Flexbox ke microsite.flexbox.web.id.');
  assert.ok(flexbox.includes('target="_blank"'), 'Tautan Flexbox membuka tab baru.');
  assert.ok(flexbox.includes('rel="noopener noreferrer"'), 'Tautan Flexbox memakai rel noopener noreferrer.');
  assert.ok(/aria-label="[^"]+"/.test(flexbox), 'Tautan Flexbox memiliki nama aksesibel.');
  assert.ok(flexbox.includes('flexbox-logo'), 'Logo Flexbox berada di dalam tautan.');

  assert.ok(!/Akses Staf/i.test(html), 'Footer publik tidak lagi menampilkan tautan Akses Staf & Admin.');
  assert.ok(!/href="\/login"/.test(html), 'Footer publik tidak memuat tautan /login.');
  assert.ok(!/LockKeyhole|lock-keyhole/.test(html), 'Ikon kunci admin dihapus dari footer.');

  assert.ok(html.includes('href="/kebijakan-privasi"'), 'Tautan Kebijakan Privasi tetap tersedia.');
  assert.ok(html.includes('mailto:'), 'Kontak email tetap tersedia.');
  assert.ok(html.includes('https://www.google.com/maps/search/'), 'Peta lokasi tetap tersedia.');
  assert.ok(html.includes('instagram.com') && html.includes('youtube.com') && html.includes('tiktok.com'), 'Tautan sosial tetap tersedia.');
  assert.ok(html.includes('All Rights Reserved'), 'Copyright tetap tersedia.');

  console.log('uji-footer-publik: branding Flexbox bertaut aman, akses admin dihapus dari footer publik, kontak/peta/privasi/sosial tetap ada.');
} finally {
  await server.close();
}
