import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const expected = {
  Semua: [['Laboratorium', 4], ['Ruang Kelas', 4], ['Perpustakaan', 4], ['Aula', 4], ['GOR', 4], ['Parkiran', 4]],
  Laboratorium: [['', 6]],
  Kelas: ['A', 'B', 'C', 'D'].map(building => [`Kelas Gedung ${building}`, 4]),
  Perpustakaan: [['Ruang Perpustakaan', 3], ['Digital Literacy Garden', 1]],
  Aula: [['', 4]], GOR: [['', 4]], Parkiran: [['', 4]],
};
const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { default: Page } = await server.ssrLoadModule('/src/pages/FasilitasPage.jsx');
  const { LanguageContext } = await server.ssrLoadModule('/src/context/LanguageContext.js');
  const { translate } = await server.ssrLoadModule('/src/utils/language.js');
  for (const [category, groups] of Object.entries(expected)) {
    const path = '/fasilitas?kategori=' + encodeURIComponent(category);
    for (const language of ['id', 'en']) {
      const html = renderToStaticMarkup(h(MemoryRouter, { initialEntries: [path] }, h(LanguageContext.Provider, {
        value: { language, t: (text, vars) => translate(text, language, vars) },
      }, h(Page))));
      assert.equal((html.match(/aria-controls="fasilitas-grid"/g) || []).length, 7, 'Tujuh filter sesuai Figma.');
      assert.equal((html.match(/data-facility-card=/g) || []).length, groups.reduce((count, [, size]) => count + size, 0), category);
      assert.equal((html.match(/data-facility-grid/g) || []).length, groups.length);
      for (const [title] of groups) if (title) assert.ok(html.includes(`aria-label="${translate(title, language)}"`));
      assert.equal((html.match(/id="stela"/g) || []).length, 1);
      assert.equal((html.match(/id="ppdb"/g) || []).length, 1);
      assert.ok(html.indexOf('id="stela"') < html.indexOf('id="ppdb"') && html.indexOf('id="ppdb"') < html.indexOf('<footer'));
      console.log(`PASS ${category} ${language}: groups, cards, filters, shared sections`);
    }
  }
} finally { await server.close(); }
