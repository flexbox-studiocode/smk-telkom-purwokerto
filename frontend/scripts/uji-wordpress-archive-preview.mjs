import assert from 'node:assert/strict';
import { normalizeArchiveNewlineArtifacts } from '../src/utils/normalizeArchiveText.js';

const corrupted = '<p>SMK Telkom</p>rnrn<p>School of Global Technopreneur</p> n <h2>Daftar SPMB</h2>';
const normalized = normalizeArchiveNewlineArtifacts(corrupted);
assert.equal(normalized, '<p>SMK Telkom</p> <p>School of Global Technopreneur</p> <h2>Daftar SPMB</h2>');

// Signature `\r\nJudul` lama menjadi `rnJudul`; heading kapital aman dibersihkan.
assert.equal(normalizeArchiveNewlineArtifacts('Hai!rnBerlandaskan value sekolah.'), 'Hai! Berlandaskan value sekolah.');

// Kata normal tidak boleh tersentuh.
const indonesian = 'Pengumuman Sekolah Pendidikan Prestasi internasional dan kegiatan.';
assert.equal(normalizeArchiveNewlineArtifacts(indonesian), indonesian);

// Atribut HTML tidak boleh dimodifikasi.
const url = '<a href="https://contoh.id/internasional?ref=rn">Pengumuman</a>rnrn<p>Isi</p>';
assert.equal(normalizeArchiveNewlineArtifacts(url), '<a href="https://contoh.id/internasional?ref=rn">Pengumuman</a> <p>Isi</p>');

console.log('WordPress archive preview: newline artifacts normalize without changing normal words or HTML attributes.');
