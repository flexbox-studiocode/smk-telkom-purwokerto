import { getSiteSettings } from './siteSettingsService';
import { api } from './apiClient';
import { apiMe } from './apiAuthService';
import { preparePpdbSubmission } from '../utils/ppdbSubmission';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const COMBINED_DOCUMENT_TYPES = ['application/pdf'];
export const DUPLICATE_SUBMISSION_MESSAGE = 'Anda sudah memiliki pendaftaran SPMB. Silakan melihat status pendaftaran Anda.';

const normalize = (row) => row && ({
  ...row,
  auth_user_id: row.userId ?? row.auth_user_id,
  nama_lengkap: row.namaLengkap ?? row.nama_lengkap,
  asal_sekolah: row.asalSekolah ?? row.asal_sekolah,
  tempat_lahir: row.tempatLahir ?? row.tempat_lahir,
  tanggal_lahir: row.tanggalLahir ?? row.tanggal_lahir,
  jenis_kelamin: row.jenisKelamin ?? row.jenis_kelamin,
  tahun_lulus: row.tahunLulus ?? row.tahun_lulus,
  no_hp: row.noHp ?? row.no_hp,
  pilihan_jurusan: row.pilihanJurusan ?? row.pilihan_jurusan,
  nilai_rapor: row.nilaiRapor ?? row.nilai_rapor,
  dokumen_url: row.dokumenUrl ?? row.dokumen_url,
  catatan_admin: row.catatanAdmin ?? row.catatan_admin,
  created_at: row.createdAt ?? row.created_at,
  updated_at: row.updatedAt ?? row.updated_at,
});

const buatErrorDuplicateSubmission = () => {
  const error = new Error(DUPLICATE_SUBMISSION_MESSAGE);
  error.code = 'PPDB_DUPLICATE_SUBMISSION';
  return error;
};

export async function submitPpdb(data) {
  const { dokumen, biodata, nilai, expectedUserId, ...legacyFields } = data;
  const { user } = await apiMe();
  if (!user) throw new Error('Sesi SPMB tidak ditemukan. Silakan login kembali.');
  if (expectedUserId && user.id !== expectedUserId) throw new Error('Sesi SPMB telah berubah. Masuk kembali sebelum mengirim.');
  const settings = await getSiteSettings();
  if (!(settings?.spmbOpen ?? settings?.data?.spmbOpen)) throw new Error('Pendaftaran SPMB sedang ditutup.');
  const existing = await api.get('/api/ppdb/mine');
  if (existing.data) throw buatErrorDuplicateSubmission();

  const fields = biodata ? preparePpdbSubmission(biodata, nilai) : legacyFields;
  let dokumenUrl = null;
  if (dokumen) {
    if (!COMBINED_DOCUMENT_TYPES.includes(dokumen.type) || dokumen.size > MAX_FILE_SIZE) {
      throw new Error('Dokumen harus berupa PDF dengan ukuran maksimal 10MB.');
    }
    const uploaded = await api.upload('/api/uploads/ppdb-documents', dokumen);
    dokumenUrl = uploaded.path;
  }

  try {
    const response = await api.post('/api/ppdb', { ...fields, email: user.email, dokumen_url: dokumenUrl });
    return normalize(response.data);
  } catch (error) {
    if (error.code === 'duplicate_submission' || error.status === 409) throw buatErrorDuplicateSubmission();
    throw error;
  }
}

export async function getPpdb() {
  const response = await api.get('/api/admin/ppdb?limit=100');
  return response.data.map(normalize);
}

export async function getMyPpdb() {
  const response = await api.get('/api/ppdb/mine');
  return response.data ? [normalize(response.data)] : [];
}

export async function signUpPpdb(email, password) {
  const settings = await getSiteSettings();
  if (!(settings?.spmbOpen ?? settings?.data?.spmbOpen)) throw new Error('Pendaftaran SPMB sedang ditutup.');
  return api.post('/api/auth/register', { email, password });
}

export async function getMyPpdbDraft() {
  const response = await api.get('/api/ppdb/draft');
  return response.data ? { biodata: response.data.biodata, nilai: response.data.nilai, updated_at: response.data.updatedAt } : null;
}

export async function savePpdbDraft(biodata, nilai) {
  const response = await api.put('/api/ppdb/draft', { biodata, nilai });
  return { updated_at: response.data.updatedAt };
}

export async function signInPpdb(email, password) {
  return api.post('/api/auth/login', { email, password });
}

export async function sendPpdbPasswordReset(email) {
  return api.post('/api/auth/password-reset/request', { email });
}

export async function updatePpdbPassword(password, token) {
  if (!token) throw new Error('Tautan pemulihan tidak valid atau sudah kedaluwarsa.');
  return api.post('/api/auth/password-reset/confirm', { password, token });
}

export async function resendPpdbVerification() {
  return api.post('/api/auth/verify-email/resend');
}

export async function signOutPpdb() {
  return api.post('/api/auth/logout');
}

const PPDB_STATUS = new Set(['menunggu', 'diproses', 'diterima', 'ditolak']);

export async function updatePpdbStatus(id, status, catatanAdmin) {
  if (!id || !PPDB_STATUS.has(status)) throw new Error('Data status pendaftar tidak valid.');
  const response = await api.patch(`/api/admin/ppdb/${id}/status`, { status, catatanAdmin: catatanAdmin?.trim() || null });
  return normalize(response.data);
}

export async function getPpdbDocumentUrl(userId) {
  if (!userId) return null;
  return api.url(`/api/uploads/ppdb-documents/${userId}`);
}

export const ppdbFileRules = { maxSize: MAX_FILE_SIZE, allowedTypes: ALLOWED_TYPES };
export const ppdbCombinedDocumentRules = { maxSize: MAX_FILE_SIZE, allowedTypes: COMBINED_DOCUMENT_TYPES };
