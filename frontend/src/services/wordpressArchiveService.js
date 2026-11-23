import { api } from './apiClient';

const normalize = (row) => ({ ...row, created_at: row.createdAt ?? row.created_at, updated_at: row.updatedAt ?? row.updated_at });

export async function getWordPressJobs({ status, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('page', String(page));
  params.set('limit', String(limit));
  const response = await api.get(`/api/admin/wordpress/imports?${params.toString()}`);
  return { data: response.data.map(normalize), pagination: response.pagination };
}

export async function uploadWordPressSql(file) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/api/admin/wordpress/imports', form, { raw: false });
}

export async function getWordPressJobProgress(id) {
  return api.get(`/api/admin/wordpress/imports/${encodeURIComponent(id)}/progress`);
}

export async function cancelWordPressJob(id) {
  return api.post(`/api/admin/wordpress/imports/${encodeURIComponent(id)}/cancel`);
}

// Menghapus job SQL beserta arsip yang masih terikat. Konten CMS tetap aman.
export async function deleteWordPressJob(id) {
  return api.delete(`/api/admin/wordpress/imports/${encodeURIComponent(id)}`);
}

export async function getWordPressArchive({ targetType, reviewStatus, jobId, search, sort, order, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (targetType) params.set('targetType', targetType);
  if (reviewStatus) params.set('reviewStatus', reviewStatus);
  if (jobId) params.set('jobId', jobId);
  if (search) params.set('search', search);
  if (sort) params.set('sort', sort);
  if (order) params.set('order', order);
  params.set('page', String(page));
  params.set('limit', String(limit));
  const response = await api.get(`/api/admin/wordpress/archive?${params.toString()}`);
  return { data: response.data.map(normalize), pagination: response.pagination };
}

export async function getWordPressArchiveItem(id) {
  const response = await api.get(`/api/admin/wordpress/archive/${encodeURIComponent(id)}`);
  return normalize(response.data);
}

export async function updateWordPressArchiveItem(id, patch) {
  const response = await api.patch(`/api/admin/wordpress/archive/${encodeURIComponent(id)}`, patch);
  return normalize(response.data);
}

export async function reviewWordPressArchiveItem(id, { reviewStatus, reviewNotes, targetType } = {}) {
  return api.post(`/api/admin/wordpress/archive/${encodeURIComponent(id)}/review`, { reviewStatus, reviewNotes, targetType });
}

export async function skipWordPressArchiveItem(id, { reviewNotes } = {}) {
  return api.post(`/api/admin/wordpress/archive/${encodeURIComponent(id)}/skip`, { reviewNotes });
}

export async function importWordPressArchiveItem(id, { status = 'draft' } = {}) {
  return api.post(`/api/admin/wordpress/archive/${encodeURIComponent(id)}/import`, { status });
}

export async function resolveWordPressArchiveMedia(id) {
  return api.post(`/api/admin/wordpress/archive/${encodeURIComponent(id)}/media`);
}
