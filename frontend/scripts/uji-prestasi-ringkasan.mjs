import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { summarizeText } = await server.ssrLoadModule('/src/utils/summarizeText.js');
  const { LanguageContext } = await server.ssrLoadModule('/src/context/LanguageContext.js');
  const { default: PrestasiUnggulanSection } = await server.ssrLoadModule('/src/components/prestasi/PrestasiUnggulanSection.jsx');

  assert.equal(summarizeText('Satu dua tiga'), 'Satu dua tiga', 'teks pendek tidak dipotong');
  assert.equal(summarizeText('<p>Satu dua tiga</p>'), 'Satu dua tiga', 'markup tidak ikut dirender pada ringkasan');

  const words = Array.from({ length: 58 }, (_, index) => `kata${index + 1}`);
  const result = summarizeText(words.join(' '));
  assert.ok(result.endsWith('…'), 'teks panjang mendapat ellipsis');
  assert.equal(result.slice(0, -1).split(' ').length, 45, 'ringkasan dipotong pada 45 kata');
  assert.ok(!result.includes('kata4…'), 'kata tidak dipotong di tengah');

  const longLead = Array.from({ length: 55 }, (_, index) => `lead${index + 1}`).join(' ');
  const fullDescription = `${longLead} narasi lengkap yang harus tetap tersedia pada halaman detail.`;
  const items = [{
    slug: 'prestasi-uji', image: '', level: 'Nasional', title: 'Prestasi Uji', lead: longLead, desc: fullDescription,
  }];
  const html = renderToStaticMarkup(
    React.createElement(MemoryRouter, null,
      React.createElement(LanguageContext.Provider, { value: { t: (value) => value, locale: 'id-ID' } },
        React.createElement(PrestasiUnggulanSection, { items }),
      ),
    ),
  );
  assert.ok(html.includes('lead45…'), 'kartu menampilkan ringkasan lead');
  assert.ok(!html.includes('lead46'), 'kartu tidak menampilkan seluruh narasi panjang');
  assert.ok(html.includes('href="/prestasi/prestasi-uji"'), 'CTA menuju detail prestasi tepat');
  console.log('Prestasi summary: teks pendek utuh, teks panjang dipotong per kata, HTML aman, CTA detail lulus.');
} finally {
  await server.close();
}
