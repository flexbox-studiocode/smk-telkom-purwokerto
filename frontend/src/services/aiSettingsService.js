import { api } from './apiClient';

export async function getAiSettings() {
  const response = await api.get('/api/admin/ai-settings');
  return response.data ?? [];
}

// Metadata provider (id, label, default endpoint, dukungan discovery) supaya UI
// tidak pernah menyalin daftar provider ke sisi klien.
export async function getAiProviders() {
  const response = await api.get('/api/admin/ai-settings/providers');
  return response.data ?? [];
}

export async function saveAiSettings(service, payload) {
  const response = await api.put(`/api/admin/ai-settings/${encodeURIComponent(service)}`, payload);
  return response.data;
}

export async function setAiServiceStatus(service, enabled) {
  const response = await api.patch(`/api/admin/ai-settings/${encodeURIComponent(service)}/status`, { enabled });
  return response.data;
}

export async function removeAiApiKey(service) {
  const response = await api.delete(`/api/admin/ai-settings/${encodeURIComponent(service)}/key`);
  return response.data;
}

export async function testAiConnection(service, payload) {
  const response = await api.post(`/api/admin/ai-settings/${encodeURIComponent(service)}/test`, payload);
  return response.data;
}

// Discovery model berjalan di server; API key tidak pernah dikirim ke browser.
export async function listAiModels(service, payload) {
  const response = await api.post(`/api/admin/ai-settings/${encodeURIComponent(service)}/models`, payload);
  return response.data;
}

// Verifikasi kredensial tanpa menyimpan konfigurasi.
export async function verifyAiApiKey(service, payload) {
  const response = await api.post(`/api/admin/ai-settings/${encodeURIComponent(service)}/verify`, payload);
  return response.data;
}
