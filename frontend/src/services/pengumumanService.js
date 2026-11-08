import { api } from './apiClient';
import { withUploadedImage } from './contentImage';

const normalize = (row) => ({ ...row, gambar_url: row.gambarUrl ?? row.gambar_url, created_at: row.createdAt ?? row.created_at, updated_at: row.updatedAt ?? row.updated_at, tanggal: row.tanggal ?? null });
const parse = (data) => ({ ...data, gambarUrl: data.gambar_url ?? data.gambarUrl, ringkasan: data.ringkasan ?? null });

export async function getPengumuman() { const response = await api.get('/api/pengumuman?limit=100'); return response.data.map(normalize); }
export async function getPublishedPengumuman() { return (await getPengumuman()).filter((row) => row.status === 'published'); }
export async function getPengumumanBySlug(slug) { const response = await api.get(`/api/pengumuman/${encodeURIComponent(slug)}`); return normalize(response.data); }
export async function createPengumuman(data) { const payload = await withUploadedImage(data, 'gambar_url'); const response = await api.post('/api/pengumuman', parse(payload)); return normalize(response.data); }
export async function updatePengumuman(id, data) { const payload = await withUploadedImage(data, 'gambar_url'); const response = await api.patch(`/api/pengumuman/${id}`, parse(payload)); return normalize(response.data); }
export async function deletePengumuman(id) { return api.delete(`/api/pengumuman/${id}`); }
