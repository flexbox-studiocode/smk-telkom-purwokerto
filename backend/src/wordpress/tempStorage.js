// Temporary private storage untuk dump SQL yang diunggah admin.
//
// File SQL TIDAK boleh berada di folder publik/statis dan tidak boleh masuk Git.
// Nama file selalu diturunkan dari jobId UUID (bukan dari nama file pengguna),
// sehingga path traversal tidak mungkin terjadi. File diberi mode 0o600 dan
// dihapus setelah pemrosesan selesai atau saat melewati masa retensi.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { env } from '../config/env.js';

const JOB_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TEMP_DIR = path.resolve(env.WORDPRESS_IMPORT_TMP_DIR || path.join(os.tmpdir(), 'smk-wordpress-imports'));

function jobPath(jobId) {
  if (!JOB_ID_RE.test(String(jobId))) throw new Error('ID job tidak valid.');
  const resolved = path.join(TEMP_DIR, `${jobId}.sql`);
  const root = TEMP_DIR.endsWith(path.sep) ? TEMP_DIR : `${TEMP_DIR}${path.sep}`;
  if (!resolved.startsWith(root)) throw new Error('Path file sementara tidak aman.');
  return resolved;
}

export async function ensureTempDir() {
  await fs.mkdir(TEMP_DIR, { recursive: true, mode: 0o700 });
  return TEMP_DIR;
}

export async function writeJobFile(jobId, buffer) {
  await ensureTempDir();
  const target = jobPath(jobId);
  await fs.writeFile(target, buffer, { mode: 0o600, flag: 'wx' });
  return target;
}

export async function readJobFile(jobId) {
  return fs.readFile(jobPath(jobId));
}

export async function jobFileExists(jobId) {
  try { await fs.access(jobPath(jobId)); return true; } catch { return false; }
}

export async function removeJobFile(jobId) {
  try { await fs.unlink(jobPath(jobId)); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

// Menghapus file sementara kedaluwarsa (retensi default 24 jam). Dipanggil saat
// modul dimuat dan setelah setiap job selesai; aman dipanggil berulang.
export async function cleanupExpiredFiles() {
  const maxAgeMs = env.WORDPRESS_IMPORT_RETENTION_HOURS * 60 * 60 * 1000;
  let removed = 0;
  try {
    const entries = await fs.readdir(TEMP_DIR, { withFileTypes: true });
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.sql')) continue;
      const full = path.join(TEMP_DIR, entry.name);
      try {
        const stat = await fs.stat(full);
        if (now - stat.mtimeMs > maxAgeMs) { await fs.unlink(full); removed += 1; }
      } catch { /* file hilang di tengah pemindaian */ }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return removed;
}