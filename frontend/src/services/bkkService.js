import { api } from './apiClient';
import { withUploadedImage } from './contentImage';
import { toDateKey } from '../utils/date';

const normalize = (row) => ({ ...row, tipe_pekerjaan: row.tipePekerjaan ?? row.tipe_pekerjaan, link_pendaftaran: row.linkPendaftaran ?? row.link_pendaftaran, logo_url: row.logoUrl ?? row.logo_url, created_at: row.createdAt ?? row.created_at, updated_at: row.updatedAt ?? row.updated_at, deadline: toDateKey(row.deadline) || null });
const parse = (data) => ({ ...data, tipePekerjaan: data.tipe_pekerjaan ?? data.tipePekerjaan, linkPendaftaran: data.link_pendaftaran ?? data.linkPendaftaran, logoUrl: data.logo_url ?? data.logoUrl });

export async function getBkk() { const response = await api.get('/api/bkk?limit=100'); return response.data.map(normalize); }
export async function getActiveBkk() { return (await getBkk()).filter((row) => row.status === 'aktif'); }
export async function createBkk(data) { const payload = await withUploadedImage(data, 'logo_url'); const response = await api.post('/api/bkk', parse(payload)); return normalize(response.data); }
export async function updateBkk(id, data) { const payload = await withUploadedImage(data, 'logo_url'); const response = await api.patch(`/api/bkk/${id}`, parse(payload)); return normalize(response.data); }
export async function deleteBkk(id) { return api.delete(`/api/bkk/${id}`); }
