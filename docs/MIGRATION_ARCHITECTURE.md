# Arsitektur Migrasi — SMK Telkom Purwokerto

Dokumen ini menjelaskan arsitektur setelah migrasi dari Supabase ke MySQL,
termasuk keputusan desain, aliran data, dan batas kepercayaan (trust boundaries).

---

## 1. Prinsip

1. **MySQL adalah satu-satunya database operasional.** Aplikasi tidak pernah
   membaca/menulis Supabase saat runtime.
2. **Supabase = tujuan backup terenkripsi (opsional).** Tidak ada data plaintext
   yang dikirim ke sana.
3. **Sumber Supabase tidak diubah.** Migrasi bersifat read-only terhadap sumber.
4. **Satu codebase untuk Windows + Linux.** Perbedaan hanya path binary & env.

---

## 2. Diagram Arsitektur

```
                        ┌──────────────────────────┐
                        │        Browser           │
                        │  React + Vite (SPA)      │
                        └────────────┬─────────────┘
                                     │ HTTPS, cookie sesi (HttpOnly), CSRF
                                     ▼
                        ┌──────────────────────────┐
                        │   Backend Express 5      │
                        │   Node.js 20+            │
                        │  ┌────────────────────┐  │
                        │  │ Auth (Argon2/bcrypt)│  │
                        │  │ Zod + rate-limit   │  │
                        │  │ Helmet + CORS      │  │
                        │  └────────────────────┘  │
                        └───┬───────────────┬──────┘
                            │               │
              Prisma 7 +    │               │  file I/O
              adapter-mariadb               │
                            ▼               ▼
                ┌──────────────────┐   ┌────────────────┐
                │   MySQL 8.4      │   │  uploads/      │
                │ smk_telkom_      │   │ (disk lokal)   │
                │ purwokerto       │   │ public+private │
                └──────────────────┘   └───────┬────────┘
                                               │
                        ┌──────────────────────┴─────────────┐
                        │  Backup harian 02:00 WIB           │
                        │  mysqldump + tar → gzip → AES-256  │
                        └──────────────────┬─────────────────┘
                                           │ (HTTPS, service_role)
                                           ▼
                                ┌──────────────────────┐
                                │ Supabase Storage     │
                                │ bucket: mysql-backups│
                                │ (private)            │
                                └──────────────────────┘
```

---

## 3. Aliran Data

### 3.1 Runtime (normal)

```
Request → Express → middleware (auth/CSRF/rate-limit/Zod) → route → Prisma → MySQL
                                                                  └→ storage (uploads)
Response ← JSON (camelCase) ← route ←———————————————————————————————┘
```

Frontend hanya berbicara dengan backend. Tidak ada koneksi database langsung,
tidak ada kunci Supabase di frontend.

### 3.2 ETL migrasi (satu kali)

```
Supabase REST (anon, read-only)
        │  GET /rest/v1/<table>?select=*  (paginasi + retry)
        ▼
    transform (map snake_case→camelCase, derive field hilang)
        │
        ▼
    Prisma upsert ke MySQL (idempoten, berdasarkan ID asli)
        │
        ▼
    ringkasan JSON + JSONL error (backend/docs/)
```

Storage:

```
Supabase Storage (list + download)
        ▼
    uploads/  (path dipertahankan)
```

### 3.3 Backup

```
mysqldump --single-transaction ─► gzip ─► AES-256-GCM ─► backups/mysql/YYYY/MM/
tar uploads/                   ─► gzip ─► AES-256-GCM ─► backups/uploads/
manifest (SHA-256 + row counts) ─────────────────────────► backups/manifests/
        │
        ▼  (upload + verifikasi ukuran/checksum)
Supabase Storage (private)
```

---

## 4. Keputusan Desain & Alasan

| Keputusan | Alasan |
|---|---|
| Prisma + `@prisma/adapter-mariadb` | Koneksi MySQL 8 stabil di runtime & test; pool eksplisit |
| ETL via REST anon key | Koneksi Postgres langsung tidak resolve (`ENOTFOUND`) |
| Enum `EventCategory` diperlebar (14 nilai) | 52 event punya 11 nilai bebas; memaksa rekode merusak data |
| `site_settings.revision` → `Int` | `JSON.stringify(BigInt)` melempar error |
| `site_visitors.day` diturunkan | Kolom tidak ada di sumber |
| Dokumen PPDB via endpoint terautentikasi | Tidak boleh disajikan statis (privasi) |
| Magic-byte validation pada upload | Mencegah spoofing MIME type |
| Backup selalu terenkripsi sebelum keluar server | Melindungi data bila bucket bocor |
| Restore menolak produksi tanpa `--allow-production` | Mencegah kecelakaan destruktif |
| STELA 503 jujur saat tanpa provider | Tidak ada jawaban AI palsu/fallback fiktif |

---

## 5. Model Data (MySQL)

16 tabel operasional (+ `_prisma_migrations`):

- **Konten publik:** `berita`, `pengumuman`, `prestasi`, `bkk`, `events`,
  `spmb_information`.
- **Pengaturan & analitik:** `site_settings`, `site_visitors`.
- **Akun:** `users`, `admins`, `sessions`, `auth_tokens`.
- **PPDB:** `ppdb`, `ppdb_drafts`.
- **AI:** `ai_daily_attempts` (kuota harian per feature).

Relasi kunci:

- `ppdb.userId → users.id` (1:1).
- `ppdb_drafts.userId → users.id`.
- Semua ID berasal dari sumber Supabase (dijaga saat ETL) untuk menjaga relasi.

---

## 6. Batas Kepercayaan (Trust Boundaries)

| Batas | Kontrol |
|---|---|
| Browser → Backend | HTTPS, CORS allowlist, cookie HttpOnly+SameSite, CSRF double-submit |
| Backend → MySQL | Kredensial `smk_app` (least privilege), koneksi lokal/VPC |
| Backend → Storage | Dokumen privat hanya lewat endpoint terautentikasi |
| Backend → Supabase (backup) | `service_role` key hanya di `.env` backend; bucket privat |
| Secrets | `.env` di `.gitignore`; tidak ada secret di frontend/git |

---

## 7. Portabilitas Windows ↔ Linux

| Aspek | Windows (Laragon) | Linux VPS |
|---|---|---|
| Binary MySQL | `D:\laragon\bin\mysql\...\mysqldump.exe` | `/usr/bin/mysqldump` |
| Penjadwalan | Task Scheduler (XML) | systemd timer / cron |
| Service | NSSM/PM2/manual | systemd |
| Path upload | relatif/absolut Windows | `/var/lib/...` |
| Env | `backend/.env` | `backend/.env` |

Script backup/restore mendeteksi platform untuk default binary dan menerima
override lewat `MYSQLDUMP_PATH` / `MYSQL_PATH`.

---

## 8. Rollback & Referensi

- Sumber Supabase **tidak diubah** → masih dapat dijadikan referensi/rollback.
- Source Edge Function diarsipkan di `supabase/` (tidak dihapus).
- `vite-plugin-stela.js` dipertahankan untuk dev lokal (tanpa runtime Supabase).
- Prosedur rollback umum ada di `docs/ROLLBACK_GUIDE.md`.
