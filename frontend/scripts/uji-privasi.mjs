import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

// Regresi halaman Kebijakan Privasi (redesain dokumentasi):
// - Terjemahan ID/EN sama-sama merender.
// - Satu <h1>, hierarki heading tanpa lompatan level.
// - Setiap tautan daftar isi punya target id yang benar (tidak ada anchor mati).
// - Marquee/ribbon besar tidak dipakai di halaman dokumen ini.
// - Seksi wajib ada: Retensi Data dan Hak Pengguna, plus kontak.
const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { default: Page } = await server.ssrLoadModule('/src/pages/KebijakanPrivasiPage.jsx');
  const { LanguageContext } = await server.ssrLoadModule('/src/context/LanguageContext.js');

  const render = (language) => renderToStaticMarkup(h(
    MemoryRouter,
    null,
    h(LanguageContext.Provider, { value: { language, t: (text) => text } }, h(Page))
  ));

  const expected = {
    id: { slug: '#retensi', heading: 'Retensi Data', rights: 'Hak Pengguna', email: 'office@smktelkom-pwt.sch.id' },
    en: { slug: '#retensi', heading: 'Data Retention', rights: 'Your Rights', email: 'office@smktelkom-pwt.sch.id' },
  };

  for (const language of ['id', 'en']) {
    const html = render(language);
    const ids = new Set([...html.matchAll(/id="([a-zA-Z0-9-]+)"/g)].map((match) => match[1]));
    const anchors = [...html.matchAll(/href="#([a-zA-Z0-9-]+)"/g)].map((match) => match[1]).filter((anchor) => anchor !== 'main-content');
    assert.ok(anchors.length >= 8, `${language}: daftar isi punya minimal 8 tautan`);
    for (const anchor of anchors) assert.ok(ids.has(anchor), `${language}: anchor #${anchor} tidak punya target`);

    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${language}: tepat satu <h1>`);
    let previous = 0;
    for (const match of html.matchAll(/<h([1-6])\b/g)) {
      const level = Number(match[1]);
      assert.ok(level <= previous + 1, `${language}: lompatan level heading h${previous} -> h${level}`);
      previous = level;
    }

    assert.ok(!html.includes('data-hero-marquee'), `${language}: halaman dokumen tidak memakai marquee`);
    assert.ok(html.includes(expected[language].heading), `${language}: seksi "${expected[language].heading}" ada`);
    assert.ok(html.includes(expected[language].rights), `${language}: seksi "${expected[language].rights}" ada`);
    assert.ok(html.includes(expected[language].email), `${language}: kontak email tersedia`);

    // Tipografi dokumentasi: isi memakai text-base, judul seksi memakai text-xl/2xl.
    assert.ok(html.includes('text-base'), `${language}: isi memakai ukuran teks dasar`);
    assert.ok(/text-xl[^"]*text-2xl/.test(html) || /text-xl[^"]*sm:text-2xl/.test(html), `${language}: judul seksi memakai text-xl/2xl`);
    // Sticky sidebar desktop + daftar isi collapsible mobile.
    assert.ok(html.includes('lg:sticky'), `${language}: sidebar sticky di desktop`);
    assert.ok(html.includes('<details'), `${language}: daftar isi collapsible di mobile`);
    assert.ok(html.includes('scroll-mt-28'), `${language}: anchor punya scroll-margin untuk navbar sticky`);
  }

  console.log('uji-privasi: ID/EN merender, satu H1, hierarki heading, anchor daftar isi bertarget, tanpa marquee, Retensi/Hak Pengguna/kontak ada, tipografi dokumentasi dan sidebar responsif.');
} finally {
  await server.close();
}
