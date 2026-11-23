// Media resolver: mengumpulkan URL gambar dari arsip dan (opsional) mengunduhnya
// ke penyimpanan project. Tidak pernah membuat path palsu: bila sumber tidak
// tersedia, status dicatat sebagai unresolved dan dilaporkan.

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { decodeBasicEntities } from './base.js';
import { fetchImageSafely } from './safe-fetch.js';

const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp']);
const MAX_BYTES = 25 * 1024 * 1024;

// Mengubah URL WordPress uploads menjadi bucket + key yang aman & stabil.
//   https://host/wp-content/uploads/2025/12/foto.png -> { bucket:'wordpress', key:'2025/12/foto.png' }
export function mediaKeyFromUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(parsed.protocol)) return null;
  const match = parsed.pathname.match(/\/uploads\/(.+)$/i);
  const rest = match ? match[1] : parsed.pathname.replace(/^\//, '');
  const segments = rest.split('/').filter(Boolean).map((s) => decodeURIComponent(s));
  if (segments.length === 0) return null;
  // Nama file harus punya ekstensi gambar yang diizinkan.
  const filename = segments[segments.length - 1];
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return null;
  // Sanitasi setiap segmen agar tidak keluar dari direktori mana pun.
  const safe = segments.map((s) => s.replace(/[^a-zA-Z0-9._-]/g, '_'));
  return { bucket: 'wordpress', key: safe.join('/') };
}

// Mengumpulkan seluruh URL media dari himpunan baris ic_posts.
// Mengembalikan Map<url, { url, sources:[], suggestedKey }>.
export function collectMediaUrls(rows, extractContentImageUrls) {
  const map = new Map();
  const add = (url, source, suggestedKey) => {
    if (!url || typeof url !== 'string') return;
    const clean = decodeBasicEntities(url).trim();
    if (!/^https?:\/\//i.test(clean)) return;
    if (!map.has(clean)) map.set(clean, { url: clean, sources: [], suggestedKey: suggestedKey ?? null });
    const entry = map.get(clean);
    if (!entry.sources.includes(source)) entry.sources.push(source);
    if (!entry.suggestedKey && suggestedKey) entry.suggestedKey = suggestedKey;
  };
  for (const post of rows) {
    const key = mediaKeyFromUrl(post.guid);
    if (post.post_type === 'attachment' && String(post.post_mime_type || '').startsWith('image/')) {
      add(post.guid, `attachment:${post.ID}`, key ? key.key : null);
    }
    for (const url of extractContentImageUrls(post.post_content)) add(url, `post:${post.ID}`);
  }
  return map;
}

export function localMediaPath(uploadRoot, entry) {
  const key = entry.suggestedKey || mediaKeyFromUrl(entry.url)?.key || `misc/${crypto.createHash('sha1').update(entry.url).digest('hex')}${extOf(entry.url)}`;
  const parts = key.split('/').filter(Boolean).map((s) => s.replace(/[^a-zA-Z0-9._-]/g, '_'));
  return { abs: path.join(uploadRoot, 'content-images', 'wordpress', ...parts), rel: ['wordpress', ...parts].join('/') };
}

function extOf(url) {
  const m = String(url).split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  return m ? `.${m[1].toLowerCase()}` : '.bin';
}

export function mediaPublicUrl(base, rel) {
  return `${String(base).replace(/\/$/, '')}/uploads/content-images/${rel}`;
}

// Mengunduh satu URL. Mengembalikan { ok, bytes, contentType, status } atau status gagal.
// Semua unduhan melewati safe-fetch: tolak host internal, validasi setiap redirect,
// batasi ukuran saat streaming, dan verifikasi signature gambar.
async function fetchOne(url, fetchImpl, maxBytes = MAX_BYTES) {
  const limit = Number.isFinite(maxBytes) ? Math.min(maxBytes, MAX_BYTES) : MAX_BYTES;
  try {
    const result = await fetchImageSafely(url, { maxBytes: limit, fetchImpl });
    return { ok: true, bytes: result.buffer, contentType: result.contentType, status: 200 };
  } catch (error) {
    return { ok: false, status: 0, reason: error.message };
  }
}

// Mengunduh semua media dengan batas konkurensi.
// options: { dryRun, uploadRoot, mediaBaseUrl, concurrency, fetchImpl, delayMs, maxBytes }
export async function resolveMedia(entries, options) {
  const {
    dryRun = true, uploadRoot, mediaBaseUrl, concurrency = 6,
    fetchImpl = globalThis.fetch, delayMs = 60, maxBytes = Infinity,
  } = options;
  const manifest = [];
  const queue = [...entries];
  let index = 0;
  let downloaded = 0; let skipped = 0; let failed = 0; let unresolved = 0;

  const worker = async () => {
    while (index < queue.length) {
      const my = index;
      index += 1;
      const entry = queue[my];
      const key = mediaKeyFromUrl(entry.url);
      if (!key) { manifest.push({ url: entry.url, status: 'skip_invalid', sources: entry.sources }); skipped += 1; continue; }
      const { abs, rel } = localMediaPath(uploadRoot, entry);
      try {
        const result = await fetchOne(entry.url, fetchImpl, maxBytes);
        if (!result.ok) {
          manifest.push({ url: entry.url, status: 'unresolved', reason: result.reason || `http_${result.status}`, sources: entry.sources });
          unresolved += 1; continue;
        }
        if (!dryRun) {
          await fs.mkdir(path.dirname(abs), { recursive: true });
          // Jangan menimpa file dengan nama sama tanpa verifikasi identik.
          let target = abs;
          try {
            const existing = await fs.readFile(target);
            if (!existing.equals(result.bytes)) {
              const hash = crypto.createHash('sha1').update(entry.url).digest('hex').slice(0, 8);
              target = abs.replace(/(\.[a-z0-9]+)$/i, `-${hash}$1`);
            }
          } catch { /* belum ada berkas */ }
          await fs.writeFile(target, result.bytes, { mode: 0o640 });
          const finalRel = path.relative(path.join(uploadRoot, 'content-images'), target).split(path.sep).join('/');
          manifest.push({ url: entry.url, status: 'ok', rel: finalRel, publicUrl: mediaPublicUrl(mediaBaseUrl, finalRel), contentType: result.contentType, bytes: result.bytes.length, sources: entry.sources });
        } else {
          manifest.push({ url: entry.url, status: 'available', rel, publicUrl: mediaPublicUrl(mediaBaseUrl, rel), contentType: result.contentType, bytes: result.bytes.length, sources: entry.sources });
        }
        downloaded += 1;
      } catch (err) {
        manifest.push({ url: entry.url, status: 'unresolved', reason: err.message, sources: entry.sources });
        unresolved += 1;
      }
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return { manifest, summary: { total: entries.length, downloaded, skipped, failed, unresolved } };
}

// Memuat URL dari file manifest yang dibuat fase media-only (agar re-run dapat
// memakai mapping yang sama tanpa mengunduh ulang).
export function indexManifest(manifest) {
  const byUrl = new Map();
  for (const item of manifest) {
    if (item.status === 'ok' || item.status === 'available') byUrl.set(item.url, item);
  }
  return byUrl;
}
