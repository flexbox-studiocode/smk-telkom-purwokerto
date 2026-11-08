import { api } from './apiClient';
import { OFFICIAL_ADMISSIONS_URL } from '../utils/admissions';

const FALLBACK = { spmbInternalEnabled: false, officialAdmissionsUrl: OFFICIAL_ADMISSIONS_URL };

// Konfigurasi publik dari backend. Tidak memuat secret. Jika endpoint tidak
// tersedia (mis. prerender/offline), default aman adalah SPMB internal nonaktif.
export async function getAppConfig(options = {}) {
  try {
    const data = await api.get('/api/config', options);
    return {
      spmbInternalEnabled: data?.spmbInternalEnabled === true,
      officialAdmissionsUrl: data?.officialAdmissionsUrl || OFFICIAL_ADMISSIONS_URL,
    };
  } catch {
    return { ...FALLBACK };
  }
}