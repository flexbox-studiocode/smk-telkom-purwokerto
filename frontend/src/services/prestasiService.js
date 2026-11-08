import { api } from './apiClient';
import { withUploadedImage } from './contentImage';

const normalize = (row) => ({ ...row, gambar_url: row.gambarUrl ?? row.gambar_url, instagram_url: row.instagramUrl ?? row.instagram_url, created_at: row.createdAt ?? row.created_at, updated_at: row.updatedAt ?? row.updated_at, tanggal: row.tanggal ?? null });
const parse = (data) => ({ ...data, gambarUrl: data.gambar_url ?? data.gambarUrl, instagramUrl: data.instagram_url ?? data.instagramUrl });

export async function getPrestasi() { const response = await api.get('/api/prestasi?limit=100'); return response.data.map(normalize); }
export async function getPrestasiBySlug(slug) { const response = await api.get(`/api/prestasi/${encodeURIComponent(slug)}`); return normalize(response.data); }
export async function createPrestasi(data) { const payload = await withUploadedImage(data, 'gambar_url'); const response = await api.post('/api/prestasi', parse(payload)); return normalize(response.data); }
export async function updatePrestasi(id, data) { const payload = await withUploadedImage(data, 'gambar_url'); const response = await api.patch(`/api/prestasi/${id}`, parse(payload)); return normalize(response.data); }
export async function deletePrestasi(id) { return api.delete(`/api/prestasi/${id}`); }
