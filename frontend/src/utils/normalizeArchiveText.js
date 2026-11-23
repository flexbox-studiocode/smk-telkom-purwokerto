// Normalisasi tampilan artefak newline arsip WordPress.
//
// Latar belakang: engine lama menyimpan escape MySQL `\n` / `\r\n` sebagai
// huruf `n` / `rn` literal (bug parseTuple). Baris arsip yang sudah tersimpan
// tetap harus tampil rapi tanpa menghapus huruf `n`/`r` pada kata normal.
//
// Aturan tunggal yang dipakai: ganti deretan `r`/`n` HANYA bila dibatasi
// karakter non-huruf di KEDUA sisi (tepi, spasi, tag, tanda baca, atau angka).
// Deret semacam ini tidak pernah muncul di tengah kata Bahasa Indonesia maupun
// Inggris. Huruf `n` yang menempel pada huruf lain (mis. "Pengumuman",
// "internasional", "dan") tidak pernah disentuh.
//
// Penggantian dilakukan per segmen teks (di luar tag HTML) sehingga atribut
// seperti src/href tidak ikut berubah.

const ARTIFACT_RE = /(^|[^A-Za-z])([rn]+)(?=[^A-Za-z]|$)/g;
const CRLF_BEFORE_HEADING_RE = /(^|[^A-Za-z])(?:rn)+(?=[A-Z])/g;

function normalizeSegment(segment) {
  if (!segment || !/[rn]/.test(segment)) return segment;
  return segment
    .replace(ARTIFACT_RE, '$1 ')
    // Signature korupsi `\\r\\nJudul` -> `rnJudul`. Dibatasi pada awalan
    // segmen/non-huruf dan heading kapital agar kata normal tidak berubah.
    .replace(CRLF_BEFORE_HEADING_RE, '$1 ')
    .replace(/[ \t]{2,}/g, ' ');
}

export function normalizeArchiveNewlineArtifacts(value) {
  const text = String(value ?? '');
  if (!text || !/<\/?[a-z]/i.test(text)) return normalizeSegment(text);
  return text.replace(/<[^>]*>|[^<]+/g, (part) => (part.startsWith('<') ? part : normalizeSegment(part)));
}
