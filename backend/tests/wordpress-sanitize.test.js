import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, stripShortcodes } from '../wordpress-archive/src/lib/sanitize.js';

test('membuang blok script beserta isinya', () => {
  const out = sanitizeHtml('<p>Halo</p><script>alert(1)</script><p>Aman</p>');
  assert.ok(!out.includes('<script'));
  assert.ok(!out.includes('alert(1)'));
  assert.ok(out.includes('<p>Halo</p>'));
});

test('membuang handler event dan atribut style', () => {
  const out = sanitizeHtml('<p onclick="evil()" style="color:red">x</p>');
  assert.ok(!/onclick/i.test(out));
  assert.ok(!/style=/i.test(out));
  assert.ok(out.includes('<p>x</p>'));
});

test('menetralkan href javascript:', () => {
  const out = sanitizeHtml('<a href="javascript:alert(1)">klik</a>');
  assert.ok(!/javascript:/i.test(out));
  assert.ok(out.includes('klik'));
});

test('mengizinkan tautan http dan mailto', () => {
  const out = sanitizeHtml('<a href="https://smktelkom-pwt.sch.id">Situs</a><a href="mailto:a@b.id">Email</a>');
  assert.ok(out.includes('href="https://smktelkom-pwt.sch.id"'));
  assert.ok(out.includes('href="mailto:a@b.id"'));
});

test('mempertahankan struktur heading, list, tabel, gambar', () => {
  const html = '<h2>Judul</h2><ul><li>a</li><li>b</li></ul><table><tr><td>1</td></tr></table><img src="/uploads/x.png" alt="x">';
  const out = sanitizeHtml(html);
  assert.ok(out.includes('<h2>Judul</h2>'));
  assert.ok(out.includes('<ul>'));
  assert.ok(out.includes('<li>a</li>'));
  assert.ok(out.includes('<td>1</td>'));
  assert.ok(out.includes('<img src="/uploads/x.png" alt="x">'));
});

test('membuang iframe/object/form/svg', () => {
  const out = sanitizeHtml('<iframe src="x"></iframe><object data="y"></object><form><input></form><svg><circle/></svg>teks');
  assert.ok(!/iframe|object|form|svg/i.test(out));
  assert.ok(out.includes('teks'));
});

test('stripShortcodes menjaga isi shortcode berpasangan yang tak dikenal', () => {
  assert.equal(stripShortcodes('[caption]Teks penting[/caption]'), 'Teks penting');
  assert.equal(stripShortcodes('A[gallery ids="1,2" /]B'), 'AB');
  assert.equal(stripShortcodes('[fusion_text]Isi[/fusion_text]'), 'Isi');
});

test('konten kosong/null menghasilkan string kosong', () => {
  assert.equal(sanitizeHtml(''), '');
  assert.equal(sanitizeHtml(null), '');
  assert.equal(sanitizeHtml(undefined), '');
});

test('karakter khusus dan unicode terjaga', () => {
  const out = sanitizeHtml('<p>Café “kutip” &amp; tanda — 100%</p>');
  assert.ok(out.includes('Café'));
  assert.ok(out.includes('100%'));
});

test('tidak membiarkan tag tak dikenal menyisakan markup mentah', () => {
  const out = sanitizeHtml('<marquee>hai</marquee> <custom-tag>x</custom-tag>');
  assert.ok(!/marquee|custom-tag/i.test(out));
  assert.ok(out.includes('hai'));
});
