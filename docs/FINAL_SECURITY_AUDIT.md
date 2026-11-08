# Audit Keamanan Final

Diperbarui: 2026-11-05. Audit kode/konfigurasi + pemeriksaan dependency. Tidak ada
perubahan konfigurasi keamanan yang dibuat lebih lemah.

## 1. Ringkasan

| Area | Status | Bukti |
|---|---|---|
| Credential di Git | PASS | `git ls-files` hanya memuat `.env.example`; grep tracked tidak menemukan secret nyata (hanya placeholder `<service-role>`) |
| Service Role Key di frontend | PASS | 0 referensi `SERVICE_ROLE`/`supabase.co`/`@supabase` di `frontend/src` |
| Password DB di source | PASS | `DATABASE_URL` hanya dari env; tidak ada literal |
| Secret di log | PASS | log JSON backup/HTTP tidak memuat key/password; `MYSQL_PWD` dikirim via env proses |
| Bucket backup privat | PASS (kode) | Upload/verifikasi pakai Service Role; tidak ada public URL |
| AES-256-GCM | PASS | IV 12 byte acak/objek, tag 16 byte, key 32 byte; fingerprint manifest tanpa menyimpan key |
| Nonce/IV & tag | PASS | unik per enkripsi; tag diautentikasi saat dekripsi |
| Key terpisah dari backup | PASS | key hanya dari env; manifest menyimpan fingerprint 16 hex saja |
| Upload path aman | PASS | `storage.js` menolak `.`/`..`/null dan verifikasi prefix `UPLOAD_ROOT` |
| Restore path aman | PASS | `archive-safe.mjs` menolak entri absolut/`..`/drive letter sebelum ekstraksi |
| Guard DB production | PASS | `assertRestoreTargetAllowed` butuh `--allow-production` + `--confirm`; diuji |
| Validasi file upload | PASS | MIME allowlist + magic bytes (PNG/JPEG/GIF/WebP/PDF) |
| Authorization server-side | PASS | `requireAuth`/`requireAdmin`; kepemilikan dokumen PPDB dicek |
| Data privat terlindungi | PASS | endpoint dokumen PPDB 401 tanpa auth (test) |
| Dependency | PASS/MEDIUM | backend prod 0 vuln; frontend 1 high pada `vite` (dev tool, tidak masuk bundle) |

## 2. Detail Temuan

### 2.1 Enkripsi (AES-256-GCM)

`backend/src/utils/backup.js`:

- Key: base64 32 byte (`parseEncryptionKey`), ditolak jika panjang salah.
- Container: `SMKBACK1` (8B) | IV acak 12B | ciphertext | GCM tag 16B.
- `encryptBuffer`/`decryptBuffer` + implementasi streaming di script memakai
  konstanta yang sama; tag diverifikasi (key salah/data rusak → error).
- Fingerprint key (SHA-256, 16 hex) ditulis di manifest untuk mendeteksi key
  salah lebih awal, tanpa menyimpan key.

Status: **PASS**. Diverifikasi unit test (round-trip, key salah, data dirusak,
header rusak, data pendek).

### 2.2 Izin restore

`assertRestoreTargetAllowed` menolak target bernama sama dengan production tanpa
`--allow-production` **dan** `--confirm`. Diuji aktual: restore ke
`smk_telkom_purwokerto` ditolak; restore ke DB berisi data ditolak tanpa
`--allow-existing`.

### 2.3 Path traversal

- `storage.js` `safeSegment` + verifikasi hasil `path.join` tetap di dalam
  `UPLOAD_ROOT`. Diuji: `../secret.txt`, `a/../../secret.txt`, `a\..\secret.txt`.
- `archive-safe.mjs` `isUnsafeArchiveEntry` menolak absolut, `..`, dan drive
  letter Windows. Diuji unit.

### 2.4 Upload & autorisasi

- `multer` memory storage, limit 10 MB, allowlist MIME + magic bytes.
- Dokumen PPDB hanya owner/admin; key ditentukan server (`submissions/<uid>/document.pdf`),
  bukan dari input pengguna.
- `security.test.js`: dokumen privat 401 tanpa auth; upload konten tidak
  terjangkau anonim.

### 2.5 Sesi/CSRF

- Token sesi disimpan sebagai hash (`hashToken`); cookie httpOnly + SameSite=Lax +
  Secure (production).
- CSRF double-submit token dengan perbandingan panjang + `timingSafeEqual`.
- Helmet, CORS allowlist `FRONTEND_URL`, rate limit global 300/15 menit.

### 2.6 Dependency

| Paket | Severity | Catatan |
|---|---|---|
| backend (prod, `--omit=dev`) | 0 | `npm audit` bersih |
| frontend `vite` + `launch-editor` | high | Perkakas **dev**; tidak masuk bundle produksi. `fixAvailable: true` (upgrade major Vite). Tidak ada `npm audit fix --force`. |

Rekomendasi: jadwalkan upgrade Vite pada PR terpisah; tidak memblokir deployment
karena bukan kode runtime yang dikirim ke browser.

## 3. Risiko Sisa

1. Frontend dev dependency `vite` high (dev-only).
2. Integrasi remote Supabase belum diuji end-to-end karena Service Role Key tidak
   tersedia (BLOCKED), sehingga jaminan "bucket benar-benar privat" belum
   diverifikasi di lingkungan nyata.
3. `ppdb`/`ppdb_drafts`/`ai_daily_attempts` belum dapat diverifikasi (RLS).
4. SMTP/provider AI/object storage production belum dikonfigurasi.

## 4. Kesimpulan

Tidak ada credential yang bocor ke Git, tidak ada Service Role Key di frontend,
tidak ada secret di log, enkripsi dan guard restore berjalan, serta data privat
terlindungi. Temuan bernilai: satu vulnerability dev-only pada Vite. Status
keseluruhan: **PASS** untuk kontrol yang dapat diverifikasi lokal; item remote
RLS/Supabase ditandai **BLOCKED**.
