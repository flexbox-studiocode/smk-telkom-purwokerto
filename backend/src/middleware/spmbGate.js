import { OFFICIAL_ADMISSIONS_URL, isSpmbInternalEnabled } from '../config/features.js';
import { HttpError } from '../utils/http.js';

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export function spmbDisabledError() {
  return new HttpError(
    503,
    `SPMB internal sedang dinonaktifkan. Silakan gunakan portal resmi Yayasan Telkom Schools: ${OFFICIAL_ADMISSIONS_URL}`,
    'SPMB_DISABLED',
  );
}

// Menolak request mutasi pada alur SPMB internal saat fitur nonaktif.
// Membaca historis (GET) tetap diizinkan, dengan auth/authorization endpoint
// masing-masing, agar data lama tetap dapat diaudit administrator.
export function blockSpmbMutations(req, _res, next) {
  if (!MUTATION_METHODS.includes(req.method) || isSpmbInternalEnabled()) return next();
  next(spmbDisabledError());
}
