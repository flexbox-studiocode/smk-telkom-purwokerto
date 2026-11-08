import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export const UPLOAD_ROOT = path.resolve(env.UPLOAD_ROOT || 'uploads');

const mediaBaseUrl = (env.MEDIA_BASE_URL || env.PUBLIC_STORAGE_URL || `http://localhost:${env.PORT}`).replace(/\/$/, '');

// Membersihkan satu segmen path. Menolak "." / ".." dan null byte agar tidak
// bisa keluar dari UPLOAD_ROOT (path traversal), meskipun key berasal dari
// sumber eksternal (mis. ETL yang mengurai URL Supabase Storage).
function safeSegment(segment) {
  const cleaned = String(segment).replace(/[^a-zA-Z0-9_.-]/g, '_');
  if (cleaned === '' || cleaned === '.' || cleaned === '..' || cleaned.includes('\0')) {
    throw new Error(`Segmen path tidak aman: ${segment}`);
  }
  return cleaned;
}

// Key boleh bersarang ("berita/foto.webp") namun setiap segmen divalidasi.
// Hasil akhir diverifikasi tetap berada di dalam UPLOAD_ROOT.
function localPath(bucket, key) {
  const parts = [bucket, ...String(key).split(/[\\/]+/)].filter((p) => p !== '' && p !== '.');
  const resolved = path.join(UPLOAD_ROOT, ...parts.map(safeSegment));
  const rootWithSep = UPLOAD_ROOT.endsWith(path.sep) ? UPLOAD_ROOT : UPLOAD_ROOT + path.sep;
  if (resolved !== UPLOAD_ROOT && !resolved.startsWith(rootWithSep)) {
    throw new Error(`Path keluar dari UPLOAD_ROOT: ${key}`);
  }
  return resolved;
}

export const storage = {
  async put(bucket, key, buffer) {
    const filePath = localPath(bucket, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer, { mode: 0o640 });
    return `${mediaBaseUrl}/uploads/${bucket}/${String(key).split('/').map(encodeURIComponent).join('/')}`;
  },
  async get(bucket, key) {
    return fs.readFile(localPath(bucket, key));
  },
  async delete(bucket, key) {
    try {
      await fs.unlink(localPath(bucket, key));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  },
  async exists(bucket, key) {
    try {
      await fs.access(localPath(bucket, key));
      return true;
    } catch {
      return false;
    }
  },
  // Diekspor agar dapat diuji tanpa menulis file.
  localPath,
};
