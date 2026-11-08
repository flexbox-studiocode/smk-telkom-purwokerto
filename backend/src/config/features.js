// Feature flags runtime. Nilai dibaca langsung dari process.env setiap kali
// dipanggil agar dapat diubah per-request pada test tanpa me-restart proses.
//
// SPMB_INTERNAL_ENABLED (default false): menyalakan/mematikan portal SPMB
// internal (registrasi peserta, draft, upload dokumen, dashboard internal).
// SMK Telkom Purwokerto memakai portal resmi Yayasan Telkom Schools, jadi
// default-nya nonaktif. Lihat docs/SPMB_INTERNAL_FEATURE_FLAG.md.
export const OFFICIAL_ADMISSIONS_URL = 'https://ppdb.telkomschools.sch.id/welcome';

export function isSpmbInternalEnabled() {
  return String(process.env.SPMB_INTERNAL_ENABLED ?? '').trim().toLowerCase() === 'true';
}
