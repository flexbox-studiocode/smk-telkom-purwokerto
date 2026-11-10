import { apiRequest } from './apiClient';

// Widget chat tidak memanggil Gemini langsung. Semua permintaan lewat backend,
// karena API key hanya disimpan di server dan tidak pernah masuk ke bundel browser.
//
// Ada dua backend, dan yang dipakai ditentukan otomatis:
//
//   Backend /api/ai/stela — satu-satunya jalur ke provider AI. Kunci API
//      hanya disimpan di server dan tidak pernah masuk ke bundel browser.
export const stelaSiap = true;

export const PESAN_STELA_GAGAL = 'NEXA sedang mengalami kendala. Silakan coba lagi.';
export const PESAN_STELA_BELUM_SIAP =
  'NEXA belum dikonfigurasi. Hubungi administrator untuk mengaktifkan layanan AI.';

// Presentation only: keep backend replies, request history, URLs, and identifiers unchanged.
export const formatStelaPublicText = (text) => String(text ?? '')
  .replace(/\s*\(Stematel Learning Assistant\)/gi, '')
  .replace(/(?<![\w/.-])stela(?![\w/-]|\.[a-z])/gi, (brand) => brand === 'STELA' ? 'NEXA' : 'Nexa');

export const KATEGORI_GALAT = {
  SCOPE: 'scope',        // Pertanyaan di luar scope (rejection oleh model)
  SECURITY: 'security',  // Prompt injection detected
  RATE_LIMIT: 'rate-limit', // Rate limit/quota exceeded
  TRANSIENT: 'transient',    // Backpressure, timeout, network issues
  CONFIG: 'config',      // Configuration issues
  SESSION: 'session',    // Sesi pra-chat belum ada / sudah berakhir
  UNKNOWN: 'unknown',    // Generic failure
};

// Detect error category from backend message for better UX
export const kategorikanGalat = (pesan) => {
  if (!pesan) return KATEGORI_GALAT.UNKNOWN;
  const p = pesan.toLowerCase();

  // Scope/rejection messages from backend
  if (
    p.includes('fokus membantu') ||
    p.includes('tidak bisa saya jawab') ||
    p.includes('cannot answer') ||
    p.includes('maaf, saya stela') ||
    p.includes('pertanyaan itu tidak bisa saya jawab') ||
    p.includes('lingkup ini') ||
    p.includes('outside this scope')
  ) return KATEGORI_GALAT.SCOPE;

  // Rate limiting/backpressure from backend (checked BEFORE length validation)
  if (
    p.includes('batas percakapan') ||
    p.includes('batas') && (p.includes('hari ini') || p.includes('besok')) ||
    p.includes('limit') ||
    p.includes('kuota') ||
    p.includes('ramai') ||
    p.includes('tunggu')
  ) return KATEGORI_GALAT.RATE_LIMIT;

  // Length/format validation errors (NOT scope rejection)
  if (
    p.includes('terlalu panjang') ||
    p.includes('terlalu besar') ||
    p.includes('too long') ||
    p.includes('too large') ||
    p.includes('format') && p.includes('tidak valid') ||
    p.includes('invalid format')
  ) return KATEGORI_GALAT.SECURITY;

  // Generic security/validation errors
  if (
    p.includes('valid') ||
    p.includes('scope') ||
    p.includes('safety')
  ) return KATEGORI_GALAT.SECURITY;

  return KATEGORI_GALAT.TRANSIENT;
};

// Sesi pra-chat: identitas disimpan server di balik cookie httpOnly. Klien hanya
// tahu aktif atau tidak; tidak ada data pribadi yang disimpan di storage browser.
export const cekSesiNexa = async ({ signal } = {}) => {
  const data = await apiRequest('/api/ai/stela/session', { signal });
  return data?.data?.active === true;
};

export const mulaiSesiNexa = ({ nama, telepon, usia, kategori, organisasi }, { signal } = {}) => apiRequest('/api/ai/stela/session', {
  method: 'POST',
  signal,
  body: { nama: nama.trim(), telepon, usia: Number(usia), kategori, ...(organisasi?.trim() ? { organisasi: organisasi.trim() } : {}) },
});

export const tanyaStela = async (pesan, { signal, language = 'id' } = {}) => {
  if (!stelaSiap) throw new Error(PESAN_STELA_BELUM_SIAP);

  try {
    const data = await apiRequest('/api/ai/stela', {
      method: 'POST',
      signal,
      body: {
        pertanyaan: typeof pesan === 'string' ? pesan : JSON.stringify(pesan),
        language,
      },
    });

    // Server mengirim scope_rejected=true saat pertanyaan di luar scope
    if (data.scope_rejected === true && typeof data.reply === 'string') {
      const scopeError = new Error(data.reply);
      scopeError.category = KATEGORI_GALAT.SCOPE;
      throw scopeError;
    }

    if (typeof data.reply !== 'string' || !data.reply.trim()) {
      throw new Error(PESAN_STELA_GAGAL);
    }
    return data.reply.trim();
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    if (error?.category) throw error;
    const mapped = new Error(error?.message || PESAN_STELA_GAGAL, { cause: error });
    if (error?.code === 'session_required') mapped.category = KATEGORI_GALAT.SESSION;
    else if (error?.code === 'quota_exhausted') mapped.category = KATEGORI_GALAT.RATE_LIMIT;
    else if (error?.code === 'provider_timeout') mapped.category = KATEGORI_GALAT.TRANSIENT;
    else if (error?.code === 'config') mapped.category = KATEGORI_GALAT.CONFIG;
    else if (error?.code === 'provider_failed') mapped.category = KATEGORI_GALAT.TRANSIENT;
    throw mapped;
  }
};
