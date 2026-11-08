import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { translate, readLanguage } = await server.ssrLoadModule('/src/utils/language.js');
  assert.equal(readLanguage(), 'id', 'Storage unavailable uses Indonesian.');
  globalThis.localStorage = { getItem: () => 'en' };
  globalThis.sessionStorage = { getItem: () => null };
  assert.equal(readLanguage(), 'id', 'A new session defaults to Indonesian despite an old English preference.');
  globalThis.sessionStorage = { getItem: () => 'unexpected' };
  assert.equal(readLanguage(), 'id', 'Unsupported language cannot enter state.');
  globalThis.sessionStorage = { getItem: () => 'en' };
  assert.equal(readLanguage(), 'en');
  assert.equal(translate('Beranda', 'en'), 'Home');
  assert.equal(translate('Beranda', 'id'), 'Beranda');
  for (const [id, en] of [['Fasilitas Kelas', 'Learning Facilities'], ['Fasilitas Sekolah', 'School Facilities'], ['Laboratorium Jaringan', 'Network Laboratory']]) assert.equal(translate(id, 'en'), en);
  assert.equal(translate('Pilihan Jurusan', 'en'), 'Study Programs', 'Portal dictionary must not replace the landing section label.');
  assert.equal(translate('Empat Jurusan, Banyak Peluang', 'en'), 'Four Programs, Endless Opportunities');
  assert.equal(translate('Kurikulum Industri', 'en'), 'Industry-Aligned Curriculum');
  assert.equal(translate('NextTel', 'en'), 'NextTel', 'Brand names remain unchanged.');
  assert.equal(translate('Kembali ke {label}', 'en', { label: 'News' }), 'Back to News');
  assert.equal(translate('Nama dari dashboard', 'en'), 'Nama dari dashboard');
  assert.equal(translate('constructor', 'en'), 'constructor');
  const { LanguageContext } = await server.ssrLoadModule('/src/context/LanguageContext.js');
  const { aboutStats, visiMisi, timelineData, kepalaSekolah, ctaMasukPpdb, navLinks } = await server.ssrLoadModule('/src/data/dummyData.js');
  assert.deepEqual(navLinks.map(({ label }) => label), ['Beranda', 'Tentang', 'Jurusan', 'Prestasi', 'Karier', 'Informasi', 'Layanan']);
  assert.deepEqual(navLinks[1].children.map(({ label, href }) => [label, href]), [
    ['Profil Sekolah', '/profil-sekolah'], ['Fasilitas Sekolah', '/fasilitas'], ['Profil Guru', '/profil-sekolah/guru'], ['Ekstrakurikuler', '/ekstrakurikuler'],
  ]);
  assert.deepEqual(navLinks[5].children.map(({ label, href }) => [label, href]), [['Berita', '/berita'], ['Pengumuman', '/pengumuman'], ['Kalender Kegiatan', '/kalender'], ['Informasi SPMB', '/spmb']]);
  assert.deepEqual(navLinks[4].children.map(({ label, href }) => [label, href]), [['BKK', '/bkk'], ['Sinergi', '/sinergi']]);
  assert.deepEqual(navLinks[6].children.map(({ label }) => label), ['Mylms', 'STARRY', 'DIGITS', 'SAKU', 'BISA', 'JUARA', 'LIONS', 'ADUAN']);
  assert.equal(translate('Layanan', 'en'), 'Services');
  assert.equal(translate('Submenu Layanan', 'en'), 'Services submenu');
  assert.equal(translate('Karier', 'en'), 'Careers');
  assert.equal(translate('Submenu Karier', 'en'), 'Careers submenu');
  assert.equal(translate('Kalender Kegiatan', 'en'), 'Calendar of Events');
  assert.equal(translate('Informasi SPMB', 'en'), 'SPMB Information');
  assert.equal(translate('Profil Guru', 'en'), 'Teacher Profiles');
  for (const [id, en] of [['Beranda', 'Home'], ['Tentang', 'About'], ['Profil Sekolah', 'School Profile'], ['Guru', 'Teachers'], ['Ekstrakurikuler', 'Extracurricular Activities'], ['Navigasi jurusan', 'Study Programs'], ['Prestasi', 'Achievements'], ['BKK', 'BKK'], ['Informasi', 'Information'], ['Berita', 'News'], ['Pengumuman', 'Announcements']]) assert.equal(translate(id, 'en'), en);
  const profileTexts = [...aboutStats.map((item) => item.label), ...Object.values(visiMisi), ...timelineData.flatMap((item) => [item.title, item.desc]), kepalaSekolah.quote, kepalaSekolah.quoteFull, kepalaSekolah.ctaText, ctaMasukPpdb.label];
  for (const text of profileTexts) {
    if (['Next Gen', 'AI & Future Ready'].includes(text)) continue;
    assert.notEqual(translate(text, 'en'), text, `Profile English translation missing: ${text}`);
    assert.equal(translate(text, 'id'), text, 'Indonesian content must remain unchanged.');
  }
  const { default: FormInput } = await server.ssrLoadModule('/src/components/dashboard/FormInput.jsx');
  const { default: Navbar } = await server.ssrLoadModule('/src/components/Navbar.jsx');
  const { default: RibbonDivider } = await server.ssrLoadModule('/src/components/RibbonDivider.jsx');
  const { default: WaveMarquee } = await server.ssrLoadModule('/src/components/WaveMarquee.jsx');
  const { default: Footer } = await server.ssrLoadModule('/src/components/Footer.jsx');
  const { default: Teachers } = await server.ssrLoadModule('/src/components/tentang/TentangKepalaSekolahSection.jsx');
  const value = { language: 'en', locale: 'en-US', t: (text, vars) => translate(text, 'en', vars), setLanguage: () => {} };
  const render = (element) => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(LanguageContext.Provider, { value }, element)));
  const form = render(createElement(FormInput, { label: 'Jenis Kelamin', as: 'select', options: ['Laki-laki', 'Perempuan'] }));
  assert.ok(form.includes('value="Laki-laki"'));
  assert.ok(form.includes('>Male</option>'), 'Visible option translates but submitted value is unchanged.');
  const nav = render(createElement(Navbar));
  assert.ok(nav.includes('>Home<'));
  assert.ok(nav.includes('>Study Programs<'));
  assert.ok(nav.includes('aria-controls="desktop-tentang-links"'));
  assert.ok(nav.includes('aria-controls="desktop-informasi-links"'));
  assert.ok(nav.includes('aria-controls="desktop-karier-links"'));
  assert.ok(nav.includes('>Careers<'));
  assert.ok(nav.includes('Switch to Indonesian'));
  const staticRibbon = render(createElement(RibbonDivider));
  assert.ok(staticRibbon.includes('ribbon-divider.png'));
  assert.ok(!staticRibbon.includes('data-wave-marquee'), 'The decorative ribbon stays static.');
  const waveMarquee = render(createElement(WaveMarquee));
  assert.match(waveMarquee, /data-wave-marquee/);
  assert.ok((waveMarquee.match(/<textPath data-wave-text/g) ?? []).length > 1, 'The shared wave repeats its text for a seamless loop.');
  const footer = render(createElement(Footer));
  assert.equal((footer.match(/class="footer-accent"/g) ?? []).length, 8);
  assert.ok(footer.includes('Staff &amp; Admin Access'));
  const teachers = render(createElement(Teachers));
  assert.ok(teachers.includes('href="/profil-sekolah/guru"'));
  assert.match(teachers, /View All Teacher Profiles/i);
  console.log('Bahasa: default/fallback, persistence reading, interpolation, routes, form values, teacher CTA, and eight footer motifs pass.');
} finally {
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
  await server.close();
}
