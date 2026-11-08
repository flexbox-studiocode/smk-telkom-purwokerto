import { api } from './apiClient';
import { spmbInfoPayload, spmbStatisticsId } from '../utils/spmbInformation';

// Prisma serializes DATE columns as ISO timestamps; forms and schedules consume date keys.
const dateKey = value => value ? value.slice(0, 10) : null;
const normalize = (row) => ({ ...row, tanggal_mulai: dateKey(row.tanggalMulai ?? row.tanggal_mulai), tanggal_selesai: dateKey(row.tanggalSelesai ?? row.tanggal_selesai), tanggal_seleksi: dateKey(row.tanggalSeleksi ?? row.tanggal_seleksi), tanggal_pengumuman: dateKey(row.tanggalPengumuman ?? row.tanggal_pengumuman), tautan_url: row.tautanUrl ?? row.tautan_url, sumber_url: row.sumberUrl ?? row.sumber_url, kuota_total: row.kuotaTotal ?? row.kuota_total, created_at: row.createdAt ?? row.created_at, updated_at: row.updatedAt ?? row.updated_at });
const parse = (data) => { const p = spmbInfoPayload(data); return { ...p, tanggalMulai: p.tanggal_mulai, tanggalSelesai: p.tanggal_selesai, tanggalSeleksi: p.tanggal_seleksi, tanggalPengumuman: p.tanggal_pengumuman, tautanUrl: p.tautan_url, sumberUrl: p.sumber_url, kuotaTotal: p.kuota_total }; };

export async function getSpmbInformation(published = false, signal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const response = await api.get('/api/spmb', { signal });
  const rows = response.data.map(normalize);
  // Sesi admin juga menerima Draft; halaman publik tetap hanya Published.
  return published ? rows.filter((row) => row.status === 'published') : rows;
}
export async function getSpmbStatistics(signal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const response = await api.get('/api/stats/spmb', { signal });
  return response.data;
}
function changed() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('school-spmb-information-changed'));
  try { localStorage.setItem('school-spmb-information-changed', `${Date.now()}-${Math.random()}`); } catch { /* focus refresh remains available */ }
}
export async function createSpmbInformation(data) {
  const payload = parse(data);
  if (payload.jenis === 'statistik') throw new Error('Gunakan pengaturan kuota untuk memperbarui statistik.');
  const response = await api.post('/api/spmb', payload); changed(); return normalize(response.data);
}
export async function updateSpmbInformation(id, data) { const response = await api.patch(`/api/spmb/${id}`, parse(data)); changed(); return normalize(response.data); }
export async function deleteSpmbInformation(id) {
  if (id === spmbStatisticsId) throw new Error('Statistik tidak dapat dihapus. Kuota dapat dikosongkan.');
  await api.delete(`/api/spmb/${id}`); changed(); return { id };
}
export function spmbInformationError(error) {
  if (error?.status === 400) return 'Data informasi ditolak server. Periksa isian tanggal, tautan, dan jenis.';
  if (error?.status === 403) return 'Anda tidak memiliki izin untuk mengelola informasi SPMB.';
  if (error?.status === 404) return 'Informasi tidak ditemukan atau Anda tidak memiliki izin.';
  if (error?.fields) return error.message;
  return 'Informasi SPMB gagal dimuat atau disimpan. Periksa koneksi lalu coba lagi.';
}
