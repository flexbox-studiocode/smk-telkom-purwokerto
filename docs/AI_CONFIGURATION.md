# Konfigurasi AI Admin

## Tujuan

Halaman **Dashboard → Pengaturan AI** mengelola provider untuk:

- **NEXA AI**: asisten informasi sekolah.
- **NextTel**: narasi penjelasan hasil pemetaan minat dan bakat.

Mesin skor NextTel tetap berjalan lokal. Konfigurasi provider tidak mengubah delapan pertanyaan atau `hitungHasilNextTel`.

## Variabel lingkungan

```env
# Base64 hasil 32 byte acak. Wajib sebelum admin dapat menyimpan API key.
AI_CONFIG_ENCRYPTION_KEY=

# Fallback kompatibilitas NEXA untuk instalasi lama.
STELA_AKTIF=true
STELA_API_KEY=
GEMINI_API_KEY=
STELA_PROVIDER_URL=
STELA_MODEL=

# Fallback opsional NextTel. Hanya memberi narasi hasil; scoring tetap lokal.
NEXTTEL_API_KEY=
NEXTTEL_PROVIDER_URL=
NEXTTEL_MODEL=
```

Buat encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Jangan commit file `.env`, API key, database dump, atau ciphertext produksi.

## Prioritas konfigurasi

1. Baris konfigurasi aktif di database menang atas environment.
2. Bila database belum memiliki baris, NEXA memakai fallback environment lama.
3. NextTel memakai provider hanya bila ada konfigurasi NextTel atau variabel `NEXTTEL_*` khusus.
4. Bila admin menonaktifkan layanan database, fallback environment untuk layanan itu tidak dipakai.
5. Menghapus API key menonaktifkan baris database. NEXA dapat memakai fallback environment lama lagi; NextTel selalu tetap memberi hasil scoring lokal dan narasi fallback.

## Penyimpanan rahasia

API key disimpan pada `ai_provider_configs.encrypted_api_key` menggunakan AES-256-GCM:

- random IV 12 byte per penyimpanan;
- authentication tag untuk deteksi modifikasi;
- `AI_CONFIG_ENCRYPTION_KEY` base64 32 byte;
- GET admin hanya mengembalikan metadata `configured`, bukan key atau ciphertext.

Tanpa `AI_CONFIG_ENCRYPTION_KEY`, penyimpanan API key ditolak. Server tidak pernah menyimpan plaintext sebagai fallback.

## Endpoint admin

Semua endpoint memakai session admin dan CSRF:

- `GET /api/admin/ai-settings`
- `PUT /api/admin/ai-settings/:service`
- `PATCH /api/admin/ai-settings/:service/status`
- `DELETE /api/admin/ai-settings/:service/key`
- `POST /api/admin/ai-settings/:service/test`

`service`: `stela` atau `nexttel`.

Uji koneksi dibatasi lima request per menit dan memvalidasi endpoint. Loopback, localhost, private IP, link-local, endpoint berkredensial, dan redirect ditolak untuk mencegah SSRF.

## Operasional

1. Buka **Dashboard → Pengaturan AI** sebagai admin.
2. Pilih provider, model, endpoint bila provider OpenAI-compatible, lalu masukkan API key.
3. Klik **Uji koneksi** sebelum menyimpan.
4. Simpan konfigurasi dan aktifkan layanan bila siap.
5. Jika provider gagal, NEXA mengembalikan error aman. NextTel mengembalikan narasi fallback; rekomendasi lokal tetap tersedia.

## Validasi

```bash
cd backend
npm test

cd ../frontend
npm run lint
npm run ai:uji
npm run prestasi:uji
```
