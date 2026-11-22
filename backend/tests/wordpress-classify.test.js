import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPost, scorePost } from '../wordpress-archive/src/lib/classify.js';

const base = (over = {}) => ({
  ID: 1, post_type: 'post', post_status: 'publish', post_mime_type: '',
  post_title: 'Judul', post_name: 'judul', post_excerpt: '', post_content: '', ...over,
});

test('revision dan attachment tidak pernah masuk konten publik', () => {
  assert.equal(classifyPost(base({ post_type: 'revision', post_status: 'inherit' })).category, 'skip');
  assert.equal(classifyPost(base({ post_type: 'attachment', post_status: 'inherit', post_mime_type: 'image/png' })).category, 'skip');
});

test('nav_menu_item dan custom_css di-skip', () => {
  assert.equal(classifyPost(base({ post_type: 'nav_menu_item' })).category, 'skip');
  assert.equal(classifyPost(base({ post_type: 'custom_css', post_content: 'body{color:red}' })).category, 'skip');
});

test('page tidak otomatis menjadi berita', () => {
  const r = classifyPost(base({ post_type: 'page', post_content: '<p>Halaman profil sekolah.</p>' }));
  assert.equal(r.category, 'needs_review');
});

test('post tanpa judul/konten kosong masuk review', () => {
  assert.equal(classifyPost(base({ post_content: '' })).category, 'needs_review');
  assert.equal(classifyPost(base({ post_content: '<p>pendek</p>' })).category, 'needs_review');
});

test('konten yang didominasi shortcode masuk review', () => {
  const content = '[fusion_builder_container admin_label="x" ' + '[fusion_text]a[/fusion_text]'.repeat(60) + ']';
  assert.equal(classifyPost(base({ post_content: content })).category, 'needs_review');
});

test('konten template Avada/Lorem masuk review', () => {
  const r = classifyPost(base({ post_content: '<p>Join Over 500,000 Students Enjoying Avada Education Now lorem ipsum dolor</p>' }));
  assert.equal(r.category, 'needs_review');
});

test('prestasi jelas terklasifikasi prestasi', () => {
  const r = classifyPost(base({ post_title: 'Siswa SMK Juara 1 Olimpiade Sains Nasional', post_content: '<p>Juara 1 tingkat nasional.</p>' }));
  assert.equal(r.category, 'prestasi');
});

test('pengumuman jelas terklasifikasi pengumuman', () => {
  const r = classifyPost(base({ post_title: 'Pengumuman Pengambilan Ijazah', post_content: '<p>Pengumuman pengambilan ijazah bagi alumni.</p>' }));
  assert.equal(r.category, 'pengumuman');
});

test('event jelas terklasifikasi event', () => {
  const r = classifyPost(base({ post_title: 'Pembukaan MPLS 2018/2019', post_content: '<p>Kegiatan masa pengenalan lingkungan sekolah.</p>' }));
  assert.equal(r.category, 'event');
});

test('post naratif panjang tanpa sinyal khusus menjadi berita', () => {
  const narasi = 'Para siswa melakukan kunjungan industri yang berlangsung selama tiga hari. '.repeat(9);
  const r = classifyPost(base({ post_content: `<p>${narasi}</p>` }));
  assert.equal(r.category, 'berita');
});

test('post naratif pendek tanpa sinyal kuat masuk review', () => {
  const r = classifyPost(base({ post_content: '<p>Ringkasan singkat tanpa sinyal tipe.</p>' }));
  assert.equal(r.category, 'needs_review');
});

test('judul aset grafis tidak menjadi berita', () => {
  const narasi = 'Deskripsi berkas gambar yang cukup panjang untuk lolos ambang minimum teks pada klasifikasi konten. '.repeat(6);
  const r = classifyPost(base({ post_title: 'Logo Telkom Indonesia', post_content: `<p>${narasi}</p>` }));
  assert.equal(r.category, 'needs_review');
});

test('skor keyword dihitung dan adil', () => {
  const s = scorePost('juara 1 olimpiade');
  assert.ok(s.prestasi >= 4);
});
