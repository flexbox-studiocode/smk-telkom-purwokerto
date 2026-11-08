// Keep stored identifiers unchanged; normalize only visible copy and site URLs.
export const OFFICIAL_ADMISSIONS_URL = 'https://ppdb.telkomschools.sch.id/welcome';

// Saat portal internal aktif (SPMB_INTERNAL_ENABLED=true), route internal
// dirender normal. Saat nonaktif (default), seluruh alur pendaftaran internal
// dialihkan ke portal resmi Yayasan. Parameter default false mempertahankan
// perilaku aman untuk pemanggil yang tidak tahu status fitur.
export const isHiddenAdmissionsPath = (path, { spmbInternalEnabled = false } = {}) => {
  let normalized;
  try { normalized = decodeURIComponent(path).toLowerCase().replace(/\/+$/, ''); }
  catch { return false; }
  if (normalized === '/spmb') return false;
  if (spmbInternalEnabled) return false;
  return /^\/(?:spmb|ppdb)(?:\/|$)/.test(normalized)
    || ['/ketentuan-spmb', '/ketentuan-ppdb', '/lupa-sandi', '/auth/confirm'].includes(normalized);
};

export const formatAdmissionsText = (text) =>
  typeof text === 'string' ? text.replace(/\bPPDB\b/g, 'SPMB') : text;

export const canonicalAdmissionsPath = (path) => path
  .replace(/^\/ppdb(?=\/|[?#]|$)/, '/spmb')
  .replace(/^\/dashboard\/ppdb(?=\/|[?#]|$)/, '/dashboard/spmb')
  .replace(/^\/ketentuan-ppdb(?=\/|[?#]|$)/, '/ketentuan-spmb');
