import test from 'node:test';
import assert from 'node:assert/strict';
import { deterministicUuid, slugify, parseMysqlDate, toDateOnly, toDateTime, htmlToPlainText, truncateWords, decodeBasicEntities } from '../wordpress-archive/src/lib/base.js';
import { mapPost, assignSlug, emptySlugRegistry } from '../wordpress-archive/src/lib/record.js';
import { extractContentImageUrls, isImageGuid, resolveBaseSlug, resolveTitle } from '../wordpress-archive/src/lib/transform.js';
import { mediaKeyFromUrl, collectMediaUrls, indexManifest } from '../wordpress-archive/src/lib/media.js';

test('deterministicUuid stabil dan berbeda per nama', () => {
  const ns = '7c9b1f2a-4d3e-5a6b-8c9d-0e1f2a3b4c5d';
  const a = deterministicUuid(ns, 'berita:123');
  assert.equal(a, deterministicUuid(ns, 'berita:123'));
  assert.notEqual(a, deterministicUuid(ns, 'berita:124'));
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('slugify membersihkan karakter dan unicode', () => {
  assert.equal(slugify('Juara 1 Olimpiade Sains!!'), 'juara-1-olimpiade-sains');
  assert.equal(slugify('Café & Rêve'), 'cafe-reve');
  assert.equal(slugify('---'), 'item');
});

test('parseMysqlDate menangani nol dan valid', () => {
  assert.equal(parseMysqlDate('0000-00-00 00:00:00'), null);
  assert.equal(parseMysqlDate(''), null);
  const d = parseMysqlDate('2018-07-17 08:30:00');
  assert.equal(d.toISOString(), '2018-07-17T08:30:00.000Z');
});

test('toDateOnly dan toDateTime format benar', () => {
  assert.equal(toDateOnly('2018-07-17 08:30:00'), '2018-07-17');
  assert.equal(toDateTime('2018-07-17 08:30:00'), '2018-07-17 08:30:00');
  assert.equal(toDateOnly('0000-00-00 00:00:00'), null);
});

test('htmlToPlainText dan truncateWords', () => {
  assert.equal(htmlToPlainText('<p>Halo <b>dunia</b></p>'), 'Halo dunia');
  assert.ok(truncateWords('satu dua tiga empat lima', 12).endsWith('...'));
});

test('decodeBasicEntities mengganti entity dasar sekali', () => {
  assert.equal(decodeBasicEntities('a &amp; b &lt;c&gt; &nbsp; d'), 'a & b <c>   d');
});

test('assignSlug menyelesaikan tabrakan secara deterministik', () => {
  const used = new Set();
  assert.equal(assignSlug('sama', used).slug, 'sama');
  assert.equal(assignSlug('sama', used).slug, 'sama-2');
  assert.equal(assignSlug('sama', used).slug, 'sama-3');
});

test('resolveTitle fallback ke post_name bila judul kosong', () => {
  assert.equal(resolveTitle({ post_title: '', post_name: 'kepala-sekolah', ID: 1 }), 'Kepala Sekolah');
  assert.match(resolveTitle({ post_title: '', post_name: '26', ID: 26 }), /tanpa judul/);
});

test('extractContentImageUrls menemukan img dan URL gambar telanjang', () => {
  const urls = extractContentImageUrls('<img src="https://a/x.png"><a href="https://a/y.jpg">y</a>');
  assert.ok(urls.includes('https://a/x.png'));
  assert.ok(urls.includes('https://a/y.jpg'));
});

test('isImageGuid hanya true untuk URL gambar', () => {
  assert.equal(isImageGuid('https://a/b/logo.png'), true);
  assert.equal(isImageGuid('http://a/?p=5'), false);
});

test('mediaKeyFromUrl memetakan uploads WordPress dan menolak non-gambar', () => {
  assert.deepEqual(mediaKeyFromUrl('https://smktelkom-pwt.sch.id/wp-content/uploads/2025/12/Struktur Organisasi.png'), { bucket: 'wordpress', key: '2025/12/Struktur_Organisasi.png' });
  assert.equal(mediaKeyFromUrl('https://a/b/dokumen.pdf'), null);
  assert.equal(mediaKeyFromUrl('not a url'), null);
});

test('collectMediaUrls menggabungkan attachment dan konten tanpa duplikat', () => {
  const rows = [
    { ID: 1, post_type: 'attachment', post_mime_type: 'image/png', guid: 'https://a/uploads/2019/01/x.png', post_content: '' },
    { ID: 2, post_type: 'post', post_mime_type: '', guid: 'http://a/?p=2', post_content: '<img src="https://a/uploads/2019/01/x.png">' },
  ];
  const map = collectMediaUrls(rows, extractContentImageUrls);
  assert.equal(map.size, 1);
  assert.deepEqual(map.get('https://a/uploads/2019/01/x.png').sources.sort(), ['attachment:1', 'post:2']);
});

test('mapPost berita menghasilkan record lengkap + ID deterministik', () => {
  const manifestIndex = new Map([['https://a/uploads/2019/01/foto.jpg', { publicUrl: 'http://x/uploads/content-images/wordpress/2019/01/foto.jpg' }]]);
  const narasi = 'Kegiatan kunjungan industri berlangsung selama tiga hari penuh di beberapa perusahaan mitra sekolah. '.repeat(7);
  const post = {
    ID: 100, post_type: 'post', post_status: 'publish', post_mime_type: '',
    post_title: 'Kunjungan Industri Siswa', post_name: 'kunjungan-industri',
    post_excerpt: 'Ringkas', post_content: `<p>${narasi}</p><img src="https://a/uploads/2019/01/foto.jpg">`,
    post_date: '2018-03-01 10:00:00', post_modified: '2018-03-02 11:00:00', guid: 'http://a/?p=100',
  };
  const used = emptySlugRegistry();
  const r = mapPost(post, { usedSlugs: used, manifestIndex });
  assert.equal(r.category, 'berita');
  assert.equal(r.target, 'berita');
  assert.equal(r.record.slug, 'kunjungan-industri');
  assert.equal(r.record.status, 'published');
  assert.equal(r.record.gambarUrl, 'http://x/uploads/content-images/wordpress/2019/01/foto.jpg');
  assert.equal(r.record.id, deterministicUuid('7c9b1f2a-4d3e-5a6b-8c9d-0e1f2a3b4c5d', 'berita:100'));
  // Idempotensi: panggilan kedua menghasilkan ID & slug sama.
  const r2 = mapPost(post, { usedSlugs: emptySlugRegistry(), manifestIndex });
  assert.equal(r2.record.id, r.record.id);
});

test('mapPost event memakai tanggalMulai DATE dan ringkasan tidak kosong', () => {
  const post = {
    ID: 200, post_type: 'post', post_status: 'publish', post_mime_type: '',
    post_title: 'MPLS 2019', post_name: 'mpls-2019', post_excerpt: '', post_content: '<p>Masa pengenalan lingkungan sekolah bagi siswa baru.</p>',
    post_date: '2019-07-15 07:00:00', post_modified: '2019-07-15 07:00:00', guid: 'http://a/?p=200',
  };
  const r = mapPost(post, { usedSlugs: emptySlugRegistry(), manifestIndex: new Map() });
  assert.equal(r.category, 'event');
  assert.equal(r.record.tanggalMulai, '2019-07-15');
  assert.ok(r.record.ringkasan.length > 0);
  assert.ok(r.record.ringkasan.length <= 500);
});

test('indexManifest hanya mengembalikan entri tersedia', () => {
  const idx = indexManifest([{ url: 'a', status: 'ok', publicUrl: 'u' }, { url: 'b', status: 'unresolved' }]);
  assert.equal(idx.has('a'), true);
  assert.equal(idx.has('b'), false);
});
