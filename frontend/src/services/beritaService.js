import { api } from './apiClient';
import { withUploadedImage } from './contentImage';

const normalize = (row) => ({ ...row, gambar_url: row.gambarUrl ?? row.gambar_url, created_at: row.createdAt ?? row.created_at, updated_at: row.updatedAt ?? row.updated_at });
const parse = (data) => ({ ...data, gambarUrl: data.gambar_url ?? data.gambarUrl, ringkasan: data.ringkasan ?? null });

export async function getBerita() { const response = await api.get('/api/berita?limit=100'); return response.data.map(normalize); }
export async function getPublishedBerita() { return (await getBerita()).filter((row) => row.status === 'published'); }
export async function getBeritaBySlug(slug) { const response = await api.get(`/api/berita/${encodeURIComponent(slug)}`); return normalize(response.data); }
export async function createBerita(data) { const payload = await withUploadedImage(data, 'gambar_url'); const response = await api.post('/api/berita', parse(payload)); return normalize(response.data); }
export async function updateBerita(id, data) { const payload = await withUploadedImage(data, 'gambar_url'); const response = await api.patch(`/api/berita/${id}`, parse(payload)); return normalize(response.data); }
export async function deleteBerita(id) { return api.delete(`/api/berita/${id}`); }
