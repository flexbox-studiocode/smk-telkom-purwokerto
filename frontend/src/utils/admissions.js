// Keep stored identifiers unchanged; normalize only visible copy and site URLs.
export const OFFICIAL_ADMISSIONS_URL = 'https://ppdb.telkomschools.sch.id/welcome';

export const isHiddenAdmissionsPath = (path) => {
  let normalized;
  try { normalized = decodeURIComponent(path).toLowerCase().replace(/\/+$/, ''); }
  catch { return false; }
  if (normalized === '/spmb') return false;
  return /^\/(?:spmb|ppdb)(?:\/|$)/.test(normalized)
    || ['/ketentuan-spmb', '/ketentuan-ppdb', '/lupa-sandi', '/auth/confirm'].includes(normalized);
};

export const formatAdmissionsText = (text) =>
  typeof text === 'string' ? text.replace(/\bPPDB\b/g, 'SPMB') : text;

export const canonicalAdmissionsPath = (path) => path
  .replace(/^\/ppdb(?=\/|[?#]|$)/, '/spmb')
  .replace(/^\/dashboard\/ppdb(?=\/|[?#]|$)/, '/dashboard/spmb')
  .replace(/^\/ketentuan-ppdb(?=\/|[?#]|$)/, '/ketentuan-spmb');
