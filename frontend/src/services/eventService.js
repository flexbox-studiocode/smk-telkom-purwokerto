import { api } from './apiClient';
import { eventPayload } from '../utils/events';
import { withUploadedImage } from './contentImage';

const normalize = (row) => ({ ...row, tanggal_mulai: row.tanggalMulai ?? row.tanggal_mulai, waktu_mulai: row.waktuMulai ?? row.waktu_mulai, tanggal_selesai: row.tanggalSelesai ?? row.tanggal_selesai, waktu_selesai: row.waktuSelesai ?? row.waktu_selesai, gambar_url: row.gambarUrl ?? row.gambar_url, link_informasi: row.linkInformasi ?? row.link_informasi, created_at: row.createdAt ?? row.created_at, updated_at: row.updatedAt ?? row.updated_at });
const parse = (data) => { const p = eventPayload(data); return { ...p, tanggalMulai: p.tanggal_mulai, waktuMulai: p.waktu_mulai, tanggalSelesai: p.tanggal_selesai, waktuSelesai: p.waktu_selesai, gambarUrl: p.gambar_url, linkInformasi: p.link_informasi }; };

export const getEvents = async (published = false, signal) => {
  const items = [];
  for (let page = 1; ; page += 1) {
    const response = await api.get(`/api/events?limit=100&page=${page}`);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    items.push(...response.data.map(normalize));
    if (page >= response.pagination.pages) break;
  }
  // Admin yang sedang login juga menerima Draft dari API; halaman publik tetap
  // hanya menampilkan event Published.
  return published ? items.filter((item) => item.status === 'published') : items;
};
function changed() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('school-events-changed'));
  try { localStorage.setItem('school-events-changed', `${Date.now()}-${Math.random()}`); } catch { /* focus refresh works without storage */ }
}
export async function createEvent(data) { const payload = await withUploadedImage(data, 'gambar_url'); const response = await api.post('/api/events', parse(payload)); changed(); return normalize(response.data); }
export async function updateEvent(id, data) { const payload = await withUploadedImage(data, 'gambar_url'); const response = await api.patch(`/api/events/${id}`, parse(payload)); changed(); return normalize(response.data); }
export async function deleteEvent(id) { await api.delete(`/api/events/${id}`); changed(); return { id }; }
export function eventError(error) {
  if (error?.status === 400) return 'Data kegiatan ditolak server. Periksa isian tanggal, kategori, dan tautan.';
  if (error?.status === 403) return 'Anda tidak memiliki izin untuk mengelola kegiatan.';
  if (error?.status === 404) return 'Kegiatan tidak ditemukan atau Anda tidak memiliki izin.';
  if (error?.code?.startsWith('CONTENT_IMAGE_') || error?.fields) return error.message;
  return 'Kegiatan gagal dimuat atau disimpan. Periksa koneksi lalu coba lagi.';
}
