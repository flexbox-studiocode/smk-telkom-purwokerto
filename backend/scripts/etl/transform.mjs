// Fungsi murni untuk ETL Supabase -> MySQL.
// Dipisahkan agar dapat diuji tanpa koneksi jaringan/database.
// Lihat tests/etl.test.js.
import { jakartaDateString } from '../../src/utils/date.js';

export const TIMEZONE = 'Asia/Jakarta';

// Mengembalikan tanggal bisnis (YYYY-MM-DD) pada zona Asia/Jakarta.
export function jakartaDate(value) {
  return jakartaDateString(value === null || value === undefined || value === '' ? new Date() : new Date(value));
}

// Mengurai URL Supabase Storage menjadi bucket + object path + visibilitas.
// Mengembalikan null jika bukan URL storage.
export function parseStorageObjectUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^/?#]+)\/([^?#]+)/);
  if (publicMatch) {
    return { visibility: 'public', bucket: decodeURIComponent(publicMatch[1]), objectPath: decodeURIComponent(publicMatch[2]) };
  }
  const privateMatch = url.match(/\/storage\/v1\/object\/(?:authenticated|sign)\/([^/?#]+)\/([^?#]+)/);
  if (privateMatch) {
    return { visibility: 'private', bucket: decodeURIComponent(privateMatch[1]), objectPath: decodeURIComponent(privateMatch[2]) };
  }
  return null;
}

// Menyusun URL object Supabase Storage untuk pengunduhan server-side.
export function storageObjectUrl(supabaseUrl, bucket, objectPath) {
  const base = String(supabaseUrl).replace(/\/$/, '');
  const encoded = String(objectPath).split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/${encodeURIComponent(bucket)}/${encoded}`;
}

// Spesifikasi tabel ETL. `select` = kolom yang diambil dari Supabase REST,
// `insert` = kolom yang ditulis ke MySQL (bisa menambah kolom turunan).
export const TABLES = [
  {
    table: 'site_settings',
    select: ['id', 'school_name', 'npsn', 'address', 'phone', 'email', 'website', 'logo_url', 'academic_year', 'spmb_open', 'news_page_size', 'revision', 'updated_at'],
    insert: ['id', 'school_name', 'npsn', 'address', 'phone', 'email', 'website', 'logo_url', 'academic_year', 'spmb_open', 'news_page_size', 'revision', 'updated_at'],
    storageColumns: { logo_url: 'public' },
  },
  {
    table: 'berita',
    select: ['id', 'judul', 'slug', 'ringkasan', 'konten', 'gambar_url', 'penulis', 'status', 'created_at', 'updated_at'],
    insert: ['id', 'judul', 'slug', 'ringkasan', 'konten', 'gambar_url', 'penulis', 'status', 'created_at', 'updated_at'],
    storageColumns: { gambar_url: 'public' },
  },
  {
    table: 'pengumuman',
    select: ['id', 'judul', 'slug', 'ringkasan', 'konten', 'gambar_url', 'status', 'tanggal', 'created_at', 'updated_at'],
    insert: ['id', 'judul', 'slug', 'ringkasan', 'konten', 'gambar_url', 'status', 'tanggal', 'created_at', 'updated_at'],
    storageColumns: { gambar_url: 'public' },
  },
  {
    table: 'prestasi',
    select: ['id', 'judul', 'slug', 'kategori', 'deskripsi', 'gambar_url', 'instagram_url', 'tingkat', 'tanggal', 'created_at', 'updated_at'],
    insert: ['id', 'judul', 'slug', 'kategori', 'deskripsi', 'gambar_url', 'instagram_url', 'tingkat', 'tanggal', 'created_at', 'updated_at'],
    storageColumns: { gambar_url: 'public' },
  },
  {
    table: 'bkk',
    select: ['id', 'perusahaan', 'posisi', 'deskripsi', 'lokasi', 'tipe_pekerjaan', 'deadline', 'status', 'link_pendaftaran', 'logo_url', 'created_at', 'updated_at'],
    insert: ['id', 'perusahaan', 'posisi', 'deskripsi', 'lokasi', 'tipe_pekerjaan', 'deadline', 'status', 'link_pendaftaran', 'logo_url', 'created_at', 'updated_at'],
    storageColumns: { logo_url: 'public' },
  },
  {
    table: 'events',
    select: ['id', 'judul', 'ringkasan', 'deskripsi', 'kategori', 'tanggal_mulai', 'waktu_mulai', 'tanggal_selesai', 'waktu_selesai', 'lokasi', 'penyelenggara', 'gambar_url', 'link_informasi', 'status', 'created_at', 'updated_at'],
    insert: ['id', 'judul', 'ringkasan', 'deskripsi', 'kategori', 'tanggal_mulai', 'waktu_mulai', 'tanggal_selesai', 'waktu_selesai', 'lokasi', 'penyelenggara', 'gambar_url', 'link_informasi', 'status', 'created_at', 'updated_at'],
    storageColumns: { gambar_url: 'public' },
  },
  {
    table: 'spmb_information',
    select: ['id', 'jenis', 'judul', 'deskripsi', 'urutan', 'tanggal_mulai', 'tanggal_selesai', 'tanggal_seleksi', 'tanggal_pengumuman', 'ikon', 'tautan_url', 'sumber_url', 'status', 'kuota_total', 'created_at', 'updated_at'],
    insert: ['id', 'jenis', 'judul', 'deskripsi', 'urutan', 'tanggal_mulai', 'tanggal_selesai', 'tanggal_seleksi', 'tanggal_pengumuman', 'ikon', 'tautan_url', 'sumber_url', 'status', 'kuota_total', 'created_at', 'updated_at'],
  },
  {
    table: 'admins',
    select: ['id', 'user_id', 'nama', 'created_at'],
    insert: ['id', 'user_id', 'nama', 'created_at'],
  },
  {
    table: 'ppdb',
    select: ['id', 'auth_user_id', 'nama_lengkap', 'nisn', 'nik', 'asal_sekolah', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'agama', 'tahun_lulus', 'alamat', 'no_hp', 'email', 'pilihan_jurusan', 'nilai_rapor', 'dokumen_url', 'status', 'catatan_admin', 'created_at', 'updated_at'],
    insert: ['id', 'auth_user_id', 'nama_lengkap', 'nisn', 'nik', 'asal_sekolah', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'agama', 'tahun_lulus', 'alamat', 'no_hp', 'email', 'pilihan_jurusan', 'nilai_rapor', 'dokumen_url', 'status', 'catatan_admin', 'created_at', 'updated_at'],
    // Dokumen PPDB berada di bucket privat; tidak boleh jadi URL publik.
    storageColumns: { dokumen_url: 'private' },
  },
  {
    table: 'ppdb_drafts',
    select: ['auth_user_id', 'biodata', 'nilai', 'updated_at'],
    insert: ['auth_user_id', 'biodata', 'nilai', 'updated_at'],
  },
  {
    // ai_daily_attempts dilindungi RLS (anon 401/42501); dicatat sebagai blocked.
    table: 'ai_daily_attempts',
    select: ['feature', 'day', 'attempts'],
    insert: ['feature', 'day', 'attempts'],
    optional: true,
  },
  {
    // Sumber site_visitors tidak punya kolom `day`; diturunkan dari created_at
    // pada zona Asia/Jakarta agar konsisten dengan runtime backend.
    table: 'site_visitors',
    select: ['visitor_hash', 'created_at'],
    insert: ['visitor_hash', 'day', 'created_at'],
    derive: (row) => ({ day: jakartaDate(row.created_at) }),
  },
];

// Mengubah nilai JavaScript menjadi nilai yang aman untuk mysql2.
export function toMysql(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}
