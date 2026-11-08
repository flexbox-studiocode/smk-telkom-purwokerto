// API client terpusat untuk backend Node.js/MySQL.
// Tidak ada lagi request langsung ke Supabase dari frontend.
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = (configuredApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:3000' : '')).replace(/\/$/, '');

export const apiSiap = Boolean(API_BASE_URL);

function readCookie(name) {
  if (typeof document === 'undefined') return '';
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
  csrfPromise ??= fetch(`${API_BASE_URL}/api/auth/csrf`, { credentials: 'include', cache: 'no-store' })
    .then((res) => res.json())
    .catch(() => null)
    .finally(() => { csrfPromise = undefined; });
  await csrfPromise;
  return readCookie('csrf_token');
}

function parseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Proxy/edge terkadang mengembalikan HTML atau body non-JSON.
    return null;
  }
}

async function send(path, { method, body, headers, signal, cache }) {
  return fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    signal,
    cache,
  });
}

export async function apiRequest(path, { method = 'GET', body, headers = {}, raw = false, signal, cache = 'no-store' } = {}) {
  const isMutation = !['GET', 'HEAD'].includes(method);
  const requestHeaders = { ...headers };
  if (body && !(body instanceof FormData)) requestHeaders['content-type'] = 'application/json';
  if (isMutation) requestHeaders['x-csrf-token'] = await ensureCsrf();
  const options = { method, body, headers: requestHeaders, signal, cache };
  let res = await send(path, options);
  // 304 Not Modified tidak membawa body. Paksa ambil representasi penuh sekali.
  if (res.status === 304) res = await send(path, { ...options, cache: 'reload' });
  if (raw) return res;
  const data = parseBody(await res.text());
  if (!res.ok && res.status !== 304) throw new ApiError(data?.error || 'Permintaan gagal.', res.status, data);
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