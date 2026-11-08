// API client terpusat untuk backend Node.js/MySQL.
// Tidak ada lagi request langsung ke Supabase dari frontend.
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = (configuredApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:3000' : '')).replace(/\/$/, '');

export const apiSiap = Boolean(API_BASE_URL);

function readCookie(name) {
  return document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))?.split('=')[1] ?? '';
}

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
    this.code = body?.code;
  }
}

let csrfPromise;

async function ensureCsrf() {
  if (readCookie('csrf_token')) return readCookie('csrf_token');
  csrfPromise ??= fetch(`${API_BASE_URL}/api/auth/csrf`, { credentials: 'include' })
    .then((res) => res.json())
    .catch(() => null)
    .finally(() => { csrfPromise = undefined; });
  await csrfPromise;
  return readCookie('csrf_token');
}

export async function apiRequest(path, { method = 'GET', body, headers = {}, raw = false, signal } = {}) {
  const isMutation = !['GET', 'HEAD'].includes(method);
  const requestHeaders = { ...headers };
  if (body && !(body instanceof FormData)) requestHeaders['content-type'] = 'application/json';
  if (isMutation) requestHeaders['x-csrf-token'] = await ensureCsrf();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: requestHeaders,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    signal,
  });
  if (raw) return res;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(data?.error || 'Permintaan gagal.', res.status, data);
  return data;
}

export const api = {
  get: (path, options) => apiRequest(path, options),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
  upload: (path, file) => {
    const form = new FormData();
    form.append('file', file);
    return apiRequest(path, { method: 'POST', body: form });
  },
  url: (path) => `${API_BASE_URL}${path}`,
};
