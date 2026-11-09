// Pemetaan kode error backend ke pesan yang ramah pengguna. Kode berasal dari
// backend/src/middleware/error.js; jangan lagi mencocokkan kode Postgres
// (23505/23514/42501) karena backend kini memakai kode aplikasi yang stabil.
const DEFAULT_MESSAGES = {
  validation_error: 'Data yang dikirim tidak valid. Periksa kembali isian formulir.',
  duplicate: 'Data serupa sudah ada. Gunakan nilai unik yang lain.',
  not_found: 'Data tidak ditemukan atau sudah dihapus.',
  unauthorized: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  forbidden: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
  csrf_failed: 'Sesi keamanan kedaluwarsa. Muat ulang halaman lalu coba lagi.',
  invalid_date_range: 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.',
  invalid_time_range: 'Waktu selesai harus setelah waktu mulai pada hari yang sama.',
  internal_error: 'Terjadi kesalahan pada server. Coba lagi beberapa saat lagi.',
  network_error: 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.',
};

export function apiErrorMessage(error, fallback, overrides = {}) {
  if (!error) return fallback;
  // Error unggah gambar sudah berisi pesan spesifik dan aman ditampilkan.
  if (typeof error.code === 'string' && error.code.startsWith('CONTENT_IMAGE_')) return error.message || fallback;
  if (error.fields && typeof error.fields === 'object') return Object.values(error.fields).find(Boolean) || fallback;
  const message = overrides[error.code] ?? DEFAULT_MESSAGES[error.code];
  if (message) return message;
  if (error.status === 401) return DEFAULT_MESSAGES.unauthorized;
  if (error.status === 403) return DEFAULT_MESSAGES.forbidden;
  if (error.status === 404) return DEFAULT_MESSAGES.not_found;
  if (error.status === 400 && error.message) return error.message;
  return fallback;
}