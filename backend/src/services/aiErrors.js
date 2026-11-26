// Klasifikasi galat provider AI.
//
// Tujuan: pemanggil (route chat NEXA, endpoint admin) dapat membedakan jenis
// kegagalan tanpa pernah menyentuh pesan mentah provider. Pesan provider bisa
// memuat nama endpoint, potongan header, atau bahkan API key, jadi pesan itu
// HANYA dipakai untuk klasifikasi internal dan tidak pernah diteruskan.
//
// Kode galat dipakai dua arah:
//   - admin  : pesan diagnostik terperinci (mis. "Model tidak ditemukan")
//   - pengunjung: pesan aman tanpa detail internal/provider/key

export const AI_ERROR_CODES = Object.freeze({
  API_KEY_INVALID: 'API_KEY_INVALID',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_ENDPOINT: 'INVALID_ENDPOINT',
  INVALID_REQUEST: 'INVALID_REQUEST',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  INVALID_PROVIDER_RESPONSE: 'INVALID_PROVIDER_RESPONSE',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  CREDENTIAL_MISSING: 'CREDENTIAL_MISSING',
  CONFIG_DISABLED: 'CONFIG_DISABLED',
});

const FALLBACK_CODE = AI_ERROR_CODES.PROVIDER_UNAVAILABLE;

export class AiProviderError extends Error {
  constructor(code, { status = 0, provider, model, requestId, reason, cause } = {}) {
    const safeCode = Object.hasOwn(AI_ERROR_CODES, code) ? code : FALLBACK_CODE;
    super(safeCode);
    this.name = 'AiProviderError';
    this.code = safeCode;
    this.status = Number(status) || 0;
    this.provider = provider;
    this.model = model;
    this.requestId = requestId;
    // `reason` adalah penanda internal non-rahasia (mis. finishReason provider),
    // aman untuk log tetapi tidak pernah diteruskan ke pengunjung.
    this.reason = reason;
    if (cause !== undefined) this.cause = cause;
  }
}

// Pemetaan status/teks provider -> kode internal. `hint` adalah salah satu dari
// 'google' | 'openai' | 'anthropic' | 'generic' agar bentuk badan galat tiap
// vendor dikenali dengan benar tanpa mengubah kontrak respons apa pun.
export function classifyProviderError({ status = 0, providerText = '', hint = 'generic' } = {}) {
  const text = String(providerText || '').toLowerCase();
  const raw = String(providerText || '');

  const has = (pattern) => pattern.test(text);

  if (hint === 'google') {
    const googleStatus = (raw.match(/"status"\s*:\s*"([A-Z_]+)"/i)?.[1] || '').toUpperCase();
    if (googleStatus === 'UNAUTHENTICATED') return AI_ERROR_CODES.API_KEY_INVALID;
    if (googleStatus === 'PERMISSION_DENIED') return AI_ERROR_CODES.PERMISSION_DENIED;
    if (googleStatus === 'NOT_FOUND') return AI_ERROR_CODES.MODEL_NOT_FOUND;
    if (googleStatus === 'RESOURCE_EXHAUSTED') {
      // Bedakan kuota habis (harus menunggu periode billing/harian) dari
      // pembatasan laju sesaat. "requests per minute" adalah rate limit.
      if (has(/per\s*minute|per\s*second|too many requests|slow down|retry in|throttl/)) return AI_ERROR_CODES.RATE_LIMITED;
      return has(/quota|exhaust|per.?day|daily|billing|credit/)
        ? AI_ERROR_CODES.QUOTA_EXCEEDED
        : AI_ERROR_CODES.RATE_LIMITED;
    }
    if (googleStatus === 'DEADLINE_EXCEEDED') return AI_ERROR_CODES.PROVIDER_TIMEOUT;
    if (googleStatus === 'UNAVAILABLE' || googleStatus === 'INTERNAL') return AI_ERROR_CODES.PROVIDER_UNAVAILABLE;
    if (googleStatus === 'INVALID_ARGUMENT' || googleStatus === 'FAILED_PRECONDITION') {
      if (has(/api.?key/)) return AI_ERROR_CODES.API_KEY_INVALID;
      if (has(/model/) && has(/not found|not supported|unknown|does not exist/)) return AI_ERROR_CODES.MODEL_NOT_FOUND;
      return AI_ERROR_CODES.INVALID_REQUEST;
    }
  }

  if (hint === 'openai') {
    const type = (raw.match(/"code"\s*:\s*"([a-z_]+)"/i)?.[1] || raw.match(/"type"\s*:\s*"([a-z_]+)"/i)?.[1] || '').toLowerCase();
    if (type === 'invalid_api_key') return AI_ERROR_CODES.API_KEY_INVALID;
    if (type === 'insufficient_quota') return AI_ERROR_CODES.QUOTA_EXCEEDED;
    if (type === 'rate_limit_exceeded') return AI_ERROR_CODES.RATE_LIMITED;
    if (type === 'model_not_found') return AI_ERROR_CODES.MODEL_NOT_FOUND;
    if (type === 'permission_denied') return AI_ERROR_CODES.PERMISSION_DENIED;
  }

  if (hint === 'anthropic') {
    const type = (raw.match(/"type"\s*:\s*"([a-z_]+)"/i)?.[1] || '').toLowerCase();
    if (type === 'authentication_error') return AI_ERROR_CODES.API_KEY_INVALID;
    if (type === 'permission_error') return AI_ERROR_CODES.PERMISSION_DENIED;
    if (type === 'not_found_error') return AI_ERROR_CODES.MODEL_NOT_FOUND;
    if (type === 'rate_limit_error') return AI_ERROR_CODES.RATE_LIMITED;
    if (type === 'overloaded_error' || type === 'api_error') return AI_ERROR_CODES.PROVIDER_UNAVAILABLE;
    if (type === 'invalid_request_error') {
      if (has(/credit|quota|billing/)) return AI_ERROR_CODES.QUOTA_EXCEEDED;
      return AI_ERROR_CODES.INVALID_REQUEST;
    }
  }

  // Pemetaan umum berdasarkan status HTTP. Urutan pemeriksaan penting: 400
  // dengan teks "api key" tetap dikenali sebagai kredensial salah.
  if (status === 401) return AI_ERROR_CODES.API_KEY_INVALID;
  if (status === 403) return AI_ERROR_CODES.PERMISSION_DENIED;
  if (status === 404) return AI_ERROR_CODES.MODEL_NOT_FOUND;
  if (status === 408 || status === 504) return AI_ERROR_CODES.PROVIDER_TIMEOUT;
  if (status === 429) {
    return has(/quota|exhaust|credit|billing|per.?day|daily/)
      ? AI_ERROR_CODES.QUOTA_EXCEEDED
      : AI_ERROR_CODES.RATE_LIMITED;
  }
  if (status === 400) {
    if (has(/api.?key/) && has(/invalid|not valid|expired|missing/)) return AI_ERROR_CODES.API_KEY_INVALID;
    if (has(/model/) && has(/not found|unknown|unsupported|does not exist|not supported/)) return AI_ERROR_CODES.MODEL_NOT_FOUND;
    return AI_ERROR_CODES.INVALID_REQUEST;
  }
  if (status >= 500) return AI_ERROR_CODES.PROVIDER_UNAVAILABLE;
  if (status > 0) return AI_ERROR_CODES.INVALID_REQUEST;
  return FALLBACK_CODE;
}

const ADMIN_MESSAGES = Object.freeze({
  [AI_ERROR_CODES.API_KEY_INVALID]: 'API key tidak valid atau ditolak provider.',
  [AI_ERROR_CODES.PERMISSION_DENIED]: 'API key tidak memiliki izin untuk model atau layanan ini.',
  [AI_ERROR_CODES.MODEL_NOT_FOUND]: 'Model tidak ditemukan atau tidak tersedia untuk API key ini.',
  [AI_ERROR_CODES.QUOTA_EXCEEDED]: 'Kuota provider habis.',
  [AI_ERROR_CODES.RATE_LIMITED]: 'Permintaan terlalu sering ke provider (rate limit).',
  [AI_ERROR_CODES.INVALID_ENDPOINT]: 'Endpoint tidak valid atau tidak dapat dijangkau.',
  [AI_ERROR_CODES.INVALID_REQUEST]: 'Provider menolak permintaan (parameter tidak valid).',
  [AI_ERROR_CODES.PROVIDER_TIMEOUT]: 'Koneksi ke provider timeout.',
  [AI_ERROR_CODES.PROVIDER_UNAVAILABLE]: 'Layanan provider sedang mengalami gangguan.',
  [AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE]: 'Respons provider tidak dapat dibaca.',
  [AI_ERROR_CODES.DECRYPTION_FAILED]: 'API key tersimpan tidak dapat didekripsi. Masukkan API key baru.',
  [AI_ERROR_CODES.CREDENTIAL_MISSING]: 'API key belum dikonfigurasi.',
  [AI_ERROR_CODES.CONFIG_DISABLED]: 'Layanan sedang dinonaktifkan.',
});

const VISITOR_MESSAGES = Object.freeze({
  [AI_ERROR_CODES.API_KEY_INVALID]: 'Layanan NEXA belum dapat diakses. Hubungi administrator.',
  [AI_ERROR_CODES.PERMISSION_DENIED]: 'Layanan NEXA belum dapat diakses. Hubungi administrator.',
  [AI_ERROR_CODES.MODEL_NOT_FOUND]: 'Model NEXA belum tersedia. Hubungi administrator.',
  [AI_ERROR_CODES.QUOTA_EXCEEDED]: 'Kuota layanan NEXA hari ini sudah habis. Silakan coba lagi besok.',
  [AI_ERROR_CODES.RATE_LIMITED]: 'Terlalu banyak permintaan. Silakan coba lagi sebentar lagi.',
  [AI_ERROR_CODES.INVALID_ENDPOINT]: 'NEXA sedang mengalami kendala. Silakan coba lagi.',
  [AI_ERROR_CODES.INVALID_REQUEST]: 'NEXA sedang mengalami kendala. Silakan coba lagi.',
  [AI_ERROR_CODES.PROVIDER_TIMEOUT]: 'Koneksi ke NEXA timeout. Silakan coba lagi.',
  [AI_ERROR_CODES.PROVIDER_UNAVAILABLE]: 'Layanan NEXA sedang mengalami gangguan. Silakan coba lagi.',
  [AI_ERROR_CODES.INVALID_PROVIDER_RESPONSE]: 'NEXA sedang mengalami kendala. Silakan coba lagi.',
  [AI_ERROR_CODES.DECRYPTION_FAILED]: 'NEXA sedang mengalami kendala. Silakan coba lagi.',
  [AI_ERROR_CODES.CREDENTIAL_MISSING]: 'NEXA belum dikonfigurasi oleh administrator.',
  [AI_ERROR_CODES.CONFIG_DISABLED]: 'NEXA sedang nonaktif.',
});

export const adminMessageForCode = (code) => ADMIN_MESSAGES[code] ?? ADMIN_MESSAGES[AI_ERROR_CODES.PROVIDER_UNAVAILABLE];
export const visitorMessageForCode = (code) => VISITOR_MESSAGES[code] ?? VISITOR_MESSAGES[AI_ERROR_CODES.PROVIDER_UNAVAILABLE];

export const httpStatusForCode = (code) => {
  if (code === AI_ERROR_CODES.PROVIDER_TIMEOUT) return 504;
  if (code === AI_ERROR_CODES.QUOTA_EXCEEDED || code === AI_ERROR_CODES.RATE_LIMITED) return 429;
  if (code === AI_ERROR_CODES.CONFIG_DISABLED) return 503;
  return 502;
};

export const isAiProviderError = (error) => error instanceof AiProviderError;

// Log aman: hanya metadata non-rahasia. Tidak ada API key, header, atau badan
// respons provider yang pernah masuk ke sini.
export function logProviderEvent(level, event, info = {}) {
  const payload = JSON.stringify({
    level,
    event,
    provider: info.provider ?? null,
    model: info.model ?? null,
    status: info.status ?? null,
    code: info.code ?? null,
    reason: info.reason ?? null,
    requestId: info.requestId ?? null,
    ms: Number.isFinite(info.ms) ? info.ms : null,
    ts: new Date().toISOString(),
  });
  if (level === 'error') console.error(payload);
  else console.warn(payload);
}

// Membuat request id pendek untuk korelasi log tanpa membocorkan apa pun.
export const newRequestId = () => Math.random().toString(36).slice(2, 10);
