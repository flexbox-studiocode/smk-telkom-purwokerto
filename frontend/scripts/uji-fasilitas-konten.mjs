import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

// Content integrity of the facilities data, School Tour modal and ID/EN dictionary (no browser needed).
const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
try {
  const { campusFacilities } = await server.ssrLoadModule('/src/data/campusData.js');
  const { fasilitasData } = await server.ssrLoadModule('/src/data/fasilitasData.js');
  const { fasilitasViews } = await server.ssrLoadModule('/src/data/fasilitasPageData.js');
  const { default: dictionary } = await server.ssrLoadModule('/src/data/translations.js');
  const { LanguageContext } = await server.ssrLoadModule('/src/context/LanguageContext.js');
  const { translate } = await server.ssrLoadModule('/src/utils/language.js');
  const { default: CampusPreview } = await server.ssrLoadModule('/src/components/fasilitas/CampusPreview.jsx');
  const { default: FacilitiesSection } = await server.ssrLoadModule('/src/components/FacilitiesSection.jsx');
  const render = (language, element) => renderToStaticMarkup(h(MemoryRouter, null, h(LanguageContext.Provider, { value: { language, t: (value, vars) => translate(value, language, vars) } }, element)));
  const cards = category => fasilitasViews[category].flatMap(group => group.items);
  const byName = (category, name) => cards(category).find(card => card.name === name);

  // Baris 10: Gedung D uses the canonical record like A-C instead of a nameless placeholder.
  for (const id of ['kelas-a', 'kelas-b', 'kelas-c', 'kelas-d', 'perpustakaan']) assert.equal(campusFacilities[id].content, fasilitasData.find(item => item.id === id), id);

  // Baris 19-20, 34, 40: map descriptions never repeat the name or title.
  for (const [id, facility] of Object.entries(campusFacilities)) {
    const { name, type, preview } = facility.content;
    if (id === 'lapangan-apel') continue;
    assert.ok(preview, `${id}: deskripsi peta tersedia dari data existing`);
    assert.notEqual(preview, name, `${id}: deskripsi tidak boleh sama dengan nama`);
    assert.notEqual(preview, type, `${id}: deskripsi tidak boleh sama dengan judul`);
  }
  assert.equal(campusFacilities['lapangan-apel'].content.preview, '', 'Lapangan Apel belum terverifikasi; tidak dikarang');
  for (const [id, name] of [['rps-utara', 'RPS. Utara'], ['rps-selatan', 'RPS. Selatan']]) {
    assert.equal(campusFacilities[id].content.preview, byName('Laboratorium', name).preview, 'Kartu dan peta memakai satu sumber teks');
    assert.notEqual(byName('Laboratorium', name).preview, 'Ruang Praktik Siswa');
    assert.doesNotMatch(byName('Laboratorium', name).preview, /laboratorium|komputer|robot|jaringan|perangkat|peralatan/i, 'Tidak menyebut perangkat/kegiatan yang belum dipastikan');
  }

  // Baris 44 and parking: no internal QA note and no verification caveat leaks to visitors.
  assert.ok(cards('Parkiran').every(card => card.photoNote === null));
  assert.doesNotMatch(campusFacilities.parkiran.content.preview, /timur|utara|selatan|barat|aman|luas|kapasitas|kendaraan.*(muat|tampung)/i, 'Parkiran peta tidak mengklaim arah, kapasitas, atau keamanan');

  // Baris 25: Perpustakaan and Digital Literacy Garden are no longer duplicates.
  const [room, garden] = fasilitasViews.Perpustakaan;
  assert.deepEqual(room.items.map(card => card.name), ['Rak Tas', 'Tempat Baca', 'Rak Buku']);
  assert.deepEqual(garden.items.map(card => card.name), ['DLG']);
  assert.equal(garden.title, 'Digital Literacy Garden');
  assert.equal(new Set(cards('Perpustakaan').map(card => card.name)).size, cards('Perpustakaan').length, 'Tidak ada kartu ganda');
  assert.ok(garden.items[0].photos[0].source.includes('/DLG/'), 'Foto DLG berasal dari folder DLG');
  assert.ok(room.items.every(card => card.photos[0].source.includes('/Perpustakaan/')), 'Foto perpustakaan berasal dari folder Perpustakaan');
  assert.equal(fasilitasViews.Semua.find(group => group.title === 'Perpustakaan').items.length, 4, 'Ringkasan Semua tetap 4 kartu');

  // Baris 6: the Other Facilities slide describes categories that exist, not a classroom.
  const categories = Object.keys(fasilitasViews);
  for (const category of ['Perpustakaan', 'Aula', 'GOR', 'Parkiran']) assert.ok(categories.includes(category));
  for (const language of ['id', 'en']) {
    const slides = render(language, h(FacilitiesSection));
    assert.ok(slides.includes(language === 'id' ? 'seperti perpustakaan, aula, GOR, dan area parkir.' : 'including the library, hall, sports hall, and parking areas.'), `slide Fasilitas Lainnya ${language}`);
  }
  assert.doesNotMatch(render('id', h(FacilitiesSection)).split('Fasilitas Lainnya')[1] ?? '', /pencahayaan alami/, 'Slide tidak memakai teks Kelas Gedung A');

  // Baris 34, 40, 43: render every School Tour modal in ID and EN.
  for (const language of ['id', 'en']) {
    for (const [id, facility] of Object.entries(campusFacilities)) {
      const html = render(language, h(CampusPreview, { facility, onClose() {}, onList() {} }));
      const eyebrow = text(html.match(/<p class="text-sm font-semibold text-primary">(.*?)<\/p>/s)[1]);
      const title = text(html.match(/<h3[^>]*>(.*?)<span class="sr-only">/s)[1]);
      const body = text(html.match(/<p class="mt-4 text-xs[^>]*>(.*?)<\/p>/s)[1]);
      assert.notEqual(eyebrow, title, `${id} ${language}: eyebrow mengulang judul`);
      assert.notEqual(body, title, `${id} ${language}: deskripsi mengulang judul`);
      assert.notEqual(body, eyebrow, `${id} ${language}: deskripsi mengulang eyebrow`);
      assert.doesNotMatch(html, /referensi peta|map reference|Photography of/, `${id} ${language}: teks internal`);
      if (id === 'lapangan-apel') assert.equal(body, language === 'id' ? 'Deskripsi fasilitas ini sedang disiapkan.' : 'A description of this facility is being prepared.');
    }
  }

  // Baris 19-20 and 45: one English term per Indonesian key across every dictionary.
  assert.equal(translate('Ruang Praktik Siswa', 'en'), 'Student Practice Room');
  assert.equal(translate('RPS Utara', 'en'), translate('RPS. Utara', 'en'));
  assert.equal(translate('RPS Selatan', 'en'), translate('RPS. Selatan', 'en'));
  assert.equal(translate('Digital Literacy Garden', 'en'), 'Digital Literacy Garden');
  for (const key of ['Informasi fasilitas ini belum tersedia. Nama dan titik lokasi mengikuti referensi peta sekolah.', 'Dokumentasi area parkir sekolah; arah lokasi pada foto belum terverifikasi.', 'Digital Literasi Garden']) assert.equal(dictionary[key], undefined, `kunci usang ${key}`);

  // Phase 2: card and slide copy states function; unverified quality claims survive only on cards waiting for school confirmation.
  const waiting = card => /^Kelas /.test(card.name) || ['Lab. RPL', 'Halaman Depan', 'Pintu Masuk'].includes(card.name) || card.name.startsWith('Parkiran ');
  const promoId = /\b(modern|nyaman|berkualitas|standar|optimal|ratusan|aman|interaktif|kondusif|terbaik|kolaborasi)\b/i;
  const promoEn = /\b(modern|comfortable|quality|standard|optimal|hundreds|secure|interactive|welcoming|best|collaboration)\b/i;
  for (const card of Object.values(fasilitasViews).flat().flatMap(group => group.items)) {
    if (waiting(card)) continue;
    assert.doesNotMatch(card.preview, promoId, `${card.name}: klaim kualitas tanpa bukti`);
    assert.doesNotMatch(translate(card.preview, 'en'), promoEn, `${card.name} (EN): klaim kualitas tanpa bukti`);
    const words = card.preview.split(/\s+/).length;
    assert.ok(words >= 7 && words <= 25, `${card.name}: ${words} kata di luar 7-25`);
  }
  for (const record of fasilitasData.filter(item => !item.id.startsWith('kelas-'))) assert.doesNotMatch(record.preview, promoId, `${record.id}: preview`);
  assert.equal(translate('Sarana Belajar', 'en'), 'Learning Facilities');
  for (const building of 'ABCD') assert.equal(translate(`Kelas Gedung ${building}`, 'en'), `Building ${building} Classrooms`);
  assert.equal(translate('Lihat daftar fasilitas', 'en'), 'View facility list');
  for (const key of ['Ruang kelas modern dengan pencahayaan baik dan perangkat belajar lengkap.', 'Ilustrasi kegiatan belajar', 'Fasilitas Kelas', 'Ruang kelas nyaman berbasis teknologi']) assert.equal(dictionary[key], undefined, `kunci usang ${key}`);

  // No two different facilities share a sentence; the map may reuse a card text only for the same facility (RPS, DLG).
  const everyCard = Object.entries(fasilitasViews).filter(([view]) => view !== 'Semua').flatMap(([, groups]) => groups.flatMap(group => group.items));
  const seen = new Map();
  for (const card of everyCard) { assert.ok(!seen.has(card.preview), `${card.name} dan ${seen.get(card.preview)} memakai teks yang sama`); seen.set(card.preview, card.name); assert.notEqual(translate(card.preview, 'en'), card.preview, `${card.name}: EN belum ada`); }
  const shared = new Set(['rps-utara', 'rps-selatan', 'dlg']);
  for (const [id, facility] of Object.entries(campusFacilities)) {
    const { preview } = facility.content;
    if (preview && seen.has(preview) && !shared.has(id)) assert.fail(`${id}: peta menyalin teks kartu ${seen.get(preview)}`);
  }
  for (const sentence of campusFacilities.aula.content.preview.split(/(?<=[.])\s+/)) assert.ok(!seen.has(sentence), 'Kalimat Aula di peta tidak boleh sama persis dengan kartu');

  // Every Indonesian description rendered on the page and the map has an English counterpart.
  const strings = new Set([...Object.values(fasilitasViews).flatMap(groups => groups.flatMap(group => group.items.map(card => card.preview))), ...Object.values(campusFacilities).map(facility => facility.content.preview).filter(Boolean)]);
  for (const value of strings) assert.ok(dictionary[value], `EN hilang: ${value}`);
  console.log(`PASS konten fasilitas: ${strings.size} deskripsi ID/EN, ${Object.keys(campusFacilities).length} modal School Tour x2 bahasa, grup perpustakaan/DLG, tanpa teks internal.`);
} finally { await server.close(); }
