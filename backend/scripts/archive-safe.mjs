import { spawn } from 'node:child_process';

// True jika nama entri tar keluar dari direktori tujuan (absolut, drive Windows,
// atau segmen ".."). Dipakai sebelum ekstraksi agar restore tidak menulis di luar
// destination.
export function isUnsafeArchiveEntry(entry) {
  const normalized = String(entry).replaceAll('\\', '/');
  if (normalized.startsWith('/')) return true;
  if (/^[A-Za-z]:\//.test(normalized)) return true;
  if (normalized.split('/').includes('..')) return true;
  return false;
}

// Validasi daftar file tar sebelum ekstraksi.
export async function assertSafeTarArchive(file) {
  const entries = await new Promise((resolve, reject) => {
    const child = spawn('tar', ['-tzf', file], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(stdout.split(/\r?\n/).filter(Boolean)) : reject(new Error(`Validasi tar gagal (${code}): ${stderr.slice(0, 500)}`)));
  });
  for (const entry of entries) {
    if (isUnsafeArchiveEntry(entry)) throw new Error(`Archive mengandung path traversal: ${entry}`);
  }
  return entries.length;
}
