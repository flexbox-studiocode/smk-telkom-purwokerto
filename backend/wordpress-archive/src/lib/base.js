// Utilitas dasar bersama untuk engine migrasi arsip WordPress.
// Modul ini bebas ketergantungan (dependency-free) dan murni agar mudah diuji.
import crypto from 'node:crypto';

// UUID v5 dari namespace + nama: stabil, sehingga migrasi yang dijalankan ulang
// menghasilkan ID target yang sama dan menjadi kunci idempotensi.
export function deterministicUuid(namespace, name) {
  const nsBytes = Buffer.from(String(namespace).replace(/-/g, ''), 'hex');
  const hash = crypto.createHash('sha1').update(nsBytes).update(String(name), 'utf8').digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // versi 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // varian RFC 4122
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Namespace tetap untuk seluruh entitas arsip WordPress SMK Telkom Purwokerto.
export const WORDPRESS_NAMESPACE = '7c9b1f2a-4d3e-5a6b-8c9d-0e1f2a3b4c5d';

// Mengubah HTML entity dasar menjadi karakter aslinya (sekali jalan).
export function decodeBasicEntities(input) {
  if (input === null || input === undefined) return input;
  return String(input)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#0*34;/g, '"')
    .replace(/&#x0*27;/gi, "'")
    .replace(/&#x0*22;/gi, '"')
    .replace(/&#0*38;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

// Slug aman: hanya [a-z0-9-]. Menjaga determinisme bila dipanggil ulang.
export function slugify(input, fallback = 'item') {
  const base = String(input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return base.slice(0, 200) || fallback;
}

// Normalisasi tanggal MySQL ("0000-00-00 00:00:00" -> null).
export function parseMysqlDate(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00'] = match;
  if (y === '0000' || mo === '00' || d === '00') return null;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)));
  return Number.isNaN(date.getTime()) ? null : date;
}

// Format YYYY-MM-DD untuk kolom DATE (Prisma @db.Date).
export function toDateOnly(value) {
  const date = value instanceof Date ? value : parseMysqlDate(value);
  if (!date) return null;
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

// Format YYYY-MM-DD HH:MM:SS untuk kolom DATETIME.
export function toDateTime(value) {
  const date = value instanceof Date ? value : parseMysqlDate(value);
  if (!date) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())} ${p(date.getUTCHours())}:${p(date.getUTCMinutes())}:${p(date.getUTCSeconds())}`;
}

// Mengubah HTML menjadi teks polos untuk ringkasan/excerpt.
export function htmlToPlainText(html) {
  if (!html) return '';
  return decodeBasicEntities(String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

// Memotong teks tanpa memotong kata di tengah (kecuali kata sangat panjang).
export function truncateWords(text, maxChars) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}
