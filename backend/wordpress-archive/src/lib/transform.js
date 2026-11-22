// Transformasi konten WordPress -> bentuk siap tampil untuk frontend project.
//
// Fungsi di sini murni (pure) agar bisa diuji tanpa database. Menggabungkan:
//   - sanitasi HTML (persisnya src/lib/sanitize.js),
//   - ekstraksi gambar dari markup,
//   - pembentukan judul, slug, ringkasan, dan tanggal.

import { sanitizeHtml, stripShortcodes } from './sanitize.js';
import { decodeBasicEntities, htmlToPlainText, slugify, truncateWords, parseMysqlDate } from './base.js';

const IMG_RE = /<img\b[^>]*>/gi;
const SRC_RE = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i;
const GUID_IMG_RE = /^https?:\/\/[^?#]+\.(?:png|jpe?g|gif|webp|avif|svg|bmp|tiff?)$/i;

// Mendaftar seluruh URL gambar di dalam sebuah konten HTML (mentah).
export function extractContentImageUrls(html) {
  const urls = [];
  const text = String(html ?? '');
  const imgTags = text.match(IMG_RE) || [];
  for (const tag of imgTags) {
    const m = tag.match(SRC_RE);
    if (!m) continue;
    const url = decodeBasicEntities(m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (url) urls.push(url);
  }
  // Deteksi juga URL gambar langsung di teks (mis. di dalam <a>).
  const bare = text.match(/https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|gif|webp|avif|svg)/gi) || [];
  for (const url of bare) urls.push(decodeBasicEntities(url));
  return [...new Set(urls)];
}

// Menandai bahwa URL guid menunjuk ke berkas gambar.
export function isImageGuid(url) {
  return typeof url === 'string' && GUID_IMG_RE.test(url);
}

// Membangun judul yang manusiawi dari post_title/post_name.
export function resolveTitle(post) {
  const raw = decodeBasicEntities(String(post.post_title ?? '')).trim();
  if (raw) return truncateWords(htmlToPlainText(raw), 255);
  const slug = String(post.post_name ?? '').trim();
  if (slug && !/^\d+$/.test(slug)) {
    return truncateWords(slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), 255);
  }
  return `(tanpa judul #${post.ID})`;
}

// Menghasilkan slug dasar yang stabil dari post_name/like judul.
export function resolveBaseSlug(post, title) {
  const name = String(post.post_name ?? '').trim();
  if (name && name !== '0' && !/^[0-9]+$/.test(name)) return slugify(name, `wp-${post.ID}`);
  return slugify(title, `wp-${post.ID}`);
}

// Menyusun ringkasan dari excerpt bila ada, jika tidak dari konten.
export function resolveExcerpt(post, sanitizedHtml) {
  const raw = decodeBasicEntities(String(post.post_excerpt ?? '')).trim();
  if (raw) return truncateWords(htmlToPlainText(raw), 500);
  const text = htmlToPlainText(sanitizedHtml);
  return truncateWords(text, 300);
}

// Membersihkan konversi: shortcode dibuang, HTML disanitasi.
export function transformContent(post) {
  const sanitized = sanitizeHtml(post.post_content ?? '');
  return sanitized;
}

// Menghitung sinyal/metadata untuk laporan dan basis keputusan.
export function contentStats(rawHtml) {
  const raw = String(rawHtml ?? '');
  const plain = htmlToPlainText(stripShortcodes(raw));
  return {
    rawLength: raw.length,
    plainLength: plain.length,
    imageCount: extractContentImageUrls(raw).length,
    hasShortcode: /\[[a-z][a-z0-9_-]*[^\]]*\]/i.test(raw),
  };
}

export function postDate(post) {
  return parseMysqlDate(post.post_date) || parseMysqlDate(post.post_modified);
}
