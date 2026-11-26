import { api } from './apiClient';

export async function getAiSettings() {
  const response = await api.get('/api/admin/ai-settings');
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
