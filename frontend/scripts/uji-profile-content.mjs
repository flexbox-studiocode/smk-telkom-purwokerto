import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { aboutDescription, visiMisi, nilaiStematel, timelineData } = await server.ssrLoadModule('/src/data/dummyData.js');
  const { translate } = await server.ssrLoadModule('/src/utils/language.js');
  const { learningMethods, learningStages } = await server.ssrLoadModule('/src/data/profileLearning.js');
  const { profileMissions, profilePillars, profilePathways } = await server.ssrLoadModule('/src/data/profilePathway.js');
  assert.deepEqual(timelineData.filter(item => item.certificate).map(item => item.year), ['2016']);
  const certificate = timelineData.find(item => item.year === '2016').certificate;
  assert.equal(certificate.npsn, '20301902');
  assert.equal(certificate.expiresAt, '2026-12-31');
  for (const text of ['Lihat Sertifikat', 'Tutup sertifikat', 'Terakreditasi A', '(Unggul)', 'Sertifikat ini berlaku sampai dengan tanggal ', '31 Desember 2026', 'Dokumen sertifikat akreditasi sekolah']) {
    assert.notEqual(translate(text, 'en'), text, `Missing certificate UI translation: ${text}`);
  }
  assert.equal(profileMissions.length, 5);
  assert.deepEqual(profilePillars.map(item => item.title), ['Digital Skills', 'Global Exposure', 'Industry Partnership']);
  assert.deepEqual(profilePathways.map(item => item.title), ['The Founder', 'The Scholar', 'Professional']);
  for (const text of [...profileMissions.flat(), ...profilePillars.map(item => item.desc), ...profilePathways.flatMap(item => [item.description, item.alt])]) {
    if (!text.trim()) continue;
    assert.notEqual(translate(text, 'en'), text, `Missing profile translation: ${text}`);
    assert.equal(translate(text, 'id'), text);
  }
  const learningComponent = await readFile(new URL('../src/components/tentang/TentangMetodePembelajaranSection.jsx', import.meta.url), 'utf8');
  const principlesComponent = await readFile(new URL('../src/components/tentang/TentangVisiMisiSection.jsx', import.meta.url), 'utf8');
  for (const [, text] of principlesComponent.matchAll(/t\('([^']+)'\)/g)) {
    assert.notEqual(translate(text, 'en'), text, `Missing vision/mission translation: ${text}`);
  }
  const learningLabels = [...learningComponent.matchAll(/t\('([^']+)'\)/g)].map(match => match[1]);
  for (const text of [...learningLabels, ...learningMethods.flatMap(method => [method.title, method.description, method.alt]), ...learningStages.flatMap(stage => [stage.grade, stage.title, stage.description])]) {
    assert.notEqual(translate(text, 'en'), text, `Missing learning translation: ${text}`);
  }
  assert.deepEqual(learningMethods[1].platforms, ['LMS', 'JUARA', 'LIONS', 'DITA']);
  assert.equal(learningStages.length, 3);
  for (const text of [aboutDescription.title, aboutDescription.text, aboutDescription.ctaText, visiMisi.visi, visiMisi.misi, ...nilaiStematel.map(v => v.desc), ...timelineData.flatMap(v => [v.title, v.desc])]) {
    if (['Next Gen', 'AI & Future Ready'].includes(text)) continue;
    assert.notEqual(translate(text, 'en'), text, `Missing English translation: ${text}`);
  }
  assert.deepEqual(nilaiStematel.map(v => v.title), ['Innovation', 'Character', 'Technology', 'Collaboration']);
  assert.deepEqual(timelineData.map(v => v.year), ['1993', '2016', '2020', '2023', '2026']);
  const page = await readFile(new URL('../src/pages/TentangPage.jsx', import.meta.url), 'utf8');
  const order = ['TentangHeroSection', 'RibbonDivider', 'TentangAboutSection', 'TentangVisiMisiSection', 'TentangTimelineSection', 'WaveMarquee', 'TentangKepalaSekolahSection', 'TentangMetodePembelajaranSection', 'FacilitiesSection', 'TentangPathwaySection'];
  const positions = order.map(name => page.indexOf(`<${name}`));
  assert(positions.every((value, index) => value >= 0 && (!index || value > positions[index - 1])), 'Figma section order.');
  assert.equal((page.match(/<FacilitiesSection/g) || []).length, 1);
  console.log('PASS profile section order, exact values/years and English content coverage.');
} finally {
  await server.close();
}
