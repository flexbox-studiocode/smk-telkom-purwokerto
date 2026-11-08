# Keamanan Database

## Password

- Admin: Argon2id via `argon2`.
- PPDB user: Argon2id.
- Session token: SHA-256 hash, cookie HttpOnly + SameSite=Lax.
- Auth token (verifikasi/reset): SHA-256 hash, kedaluwarsa 1 jam (reset) / 24 jam (verifikasi).

## Secret management

- `DATABASE_URL`, `SESSION_SECRET`, `BACKUP_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STELA_API_KEY`, `GEMINI_API_KEY`, `SMTP_PASS`, dan `CF_TURNSTILE_SECRET` hanya server-side.
- Tidak ada secret dengan awalan `VITE_`.
- `.env` ada di `.gitignore`.
- `BACKUP_ENCRYPTION_KEY` tidak boleh hilang. Simpan di password manager atau KMS.

## Principle of least privilege

- User aplikasi (`smk_app`) hanya memiliki akses ke database project.
- Backup user hanya memiliki privilege yang diperlukan mysqldump.
- Tidak menjalankan aplikasi dengan `root` di production.

## Network

- MySQL hanya mendengarkan `127.0.0.1` di production.
- Firewall memblokir port 3306 dari luar.
- Backend dan MySQL pada VPS yang sama bila memungkinkan.

## Backup

- AES-256-GCM encryption.
- SHA-256 checksum.
- Supabase Storage bucket private.
- Retensi 30 hari.
- Verifikasi remote wajib sebelum manifest menyatakan `REMOTE_VERIFIED`.

## File upload

- Content images: public read via `/uploads/content-images`.
- PPDB documents: authenticated, owner atau admin saja.
- Path traversal dicegah di `storage.js`.
- Magic byte validation di `uploads.js`.
