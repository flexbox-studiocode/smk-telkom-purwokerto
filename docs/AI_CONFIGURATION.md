# Konfigurasi AI Admin

## Tujuan

Halaman **Dashboard → Pengaturan AI** mengelola provider untuk:

- **NEXA AI**: asisten informasi sekolah.
- **NextTel**: narasi penjelasan hasil pemetaan minat dan bakat.

Mesin skor NextTel tetap berjalan lokal. Konfigurasi provider tidak mengubah delapan pertanyaan atau `hitungHasilNextTel`. Bar persentase memakai skala tetap `8 pertanyaan × 3 poin = 24` per jurusan; skor free-text yang lebih tinggi dibatasi pada tampilan 100% tanpa mengubah ranking atau radar.

## Provider yang didukung

| Identifier | Provider | Endpoint bawaan | Discovery model |
| --- | --- | --- | --- |
| `gemini` | Google Gemini | `https://generativelanguage.googleapis.com/v1beta/models` | Ya |
| `openai` | OpenAI | `https://api.openai.com/v1` | Ya (model reasoning o-series/gpt-5 memakai `max_completion_tokens`) |
| `anthropic` | Anthropic | `https://api.anthropic.com/v1` | Ya (`GET /v1/models`) |
| `deepseek` | DeepSeek | `https://api.deepseek.com` | Ya |
| `openrouter` | OpenRouter | `https://openrouter.ai/api/v1` | Ya |
| `groq` | Groq | `https://api.groq.com/openai/v1` | Ya |
| `qwen` | Qwen / Alibaba DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` | Ya |
| `custom-openai` | Custom OpenAI-compatible | Wajib diisi admin | Bergantung endpoint |

Identifier provider melewati allowlist registry backend. Nilai lain ditolak. Konfigurasi lama `google-gemini` diterjemahkan menjadi `gemini`; `openai-compatible` diterjemahkan menjadi `custom-openai` saat dibaca.

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

1. Baris konfigurasi database menang atas environment.
2. Bila database belum memiliki baris, NEXA memakai fallback environment lama.
3. NextTel memakai provider hanya bila ada konfigurasi NextTel atau variabel `NEXTTEL_*` khusus.
4. Bila admin menonaktifkan layanan database, fallback environment untuk layanan itu tidak dipakai.
5. Menghapus API key menonaktifkan baris database (`enabled=false`, key = `null`). Selama baris disabled itu ada, fallback environment untuk layanan tersebut **tidak** dipakai. Admin harus menyimpan key baru untuk mengaktifkan kembali. NextTel selalu tetap memberi hasil scoring lokal dan narasi fallback.

## Aturan penyimpanan

- Konfigurasi pertama kali **wajib** menyertakan API key.
- Bila Admin hanya mengubah model, key lama dipertahankan. Field key dikosongkan; string kosong tidak pernah menimpa key lama.
- Bila Admin mengganti provider, masukkan key baru kecuali key lama memang kompatibel dengan provider tujuan dan Admin sengaja memilih memakainya.
- Bila key tersimpan gagal didekripsi, Admin diminta memasukkan key baru.
- Layanan tidak dapat diaktifkan (`PATCH .../status` `enabled=true`) sebelum ada key tersimpan.
- Uji koneksi, verifikasi, dan muat daftar model memakai konfigurasi yang sedang diedit tanpa menyimpan apa pun. Bila field key dikosongkan, server memakai key tersimpan; key tersimpan tidak pernah ditimpa string kosong.
- Nama layanan (`display_name`) hanya label. ID internal `stela`/`nexttel` tetap menjadi kunci routing dan integrasi.

## Keamanan penyimpanan

API key disimpan pada `ai_provider_configs.encrypted_api_key` menggunakan AES-256-GCM:

- random IV 12 byte per penyimpanan;
- authentication tag untuk deteksi modifikasi;
- `AI_CONFIG_ENCRYPTION_KEY` base64 32 byte;
- GET admin hanya mengembalikan metadata `configured`, bukan key atau ciphertext.

Tanpa `AI_CONFIG_ENCRYPTION_KEY`, penyimpanan API key ditolak. Server tidak pernah menyimpan plaintext sebagai fallback. Jangan menaruh key apa pun pada environment `VITE_*` frontend.

## Endpoint admin

Semua endpoint memakai session admin dan CSRF. `service` hanya `stela` atau `nexttel`.

- `GET /api/admin/ai-settings`
- `GET /api/admin/ai-settings/providers`
- `PUT /api/admin/ai-settings/:service`
- `PATCH /api/admin/ai-settings/:service/status`
- `DELETE /api/admin/ai-settings/:service/key`
- `POST /api/admin/ai-settings/:service/test`
- `POST /api/admin/ai-settings/:service/models`
- `POST /api/admin/ai-settings/:service/verify`

### Discovery model dan verifikasi API key

Browser **tidak pernah** memanggil provider langsung. UI mengirim form ke backend; backend mengambil key sementara dari input atau ciphertext tersimpan, lalu menambahkan header autentikasi vendor. API key tidak dimasukkan ke URL, query parameter, respons, atau log.

- **Muat daftar model** memakai endpoint daftar model provider, menyaring model non-chat (embedding, gambar, suara, moderasi), dan membatasi respons maksimal 200 entri unik. Model ID asli ditampilkan; model tetap dapat diisi manual.
- **Uji koneksi** memastikan endpoint provider terjangkau. Respons HTTP apa pun berarti jaringan berfungsi; bila provider menolak key, hasilnya "terjangkau, tetapi ditolak" beserta alasannya.
- **Verifikasi API key** mengirim satu prompt kecil ke model terpilih: membuktikan key valid DAN model dapat dipakai. Bila yang diverifikasi adalah konfigurasi tersimpan, hasilnya direkam di `last_check_code`/`last_checked_at`.
- Discovery, verifikasi, dan uji koneksi masing-masing dibatasi 10 request/menit.

### Status layanan

Dashboard membedakan: *Aktif · terverifikasi*, *Aktif · belum terverifikasi* (disimpan tetapi belum diverifikasi sejak diubah), *Nonaktif*, *API key belum dikonfigurasi*, *API key tidak valid*, *Model tidak tersedia*, dan *Gangguan koneksi provider*. Status juga diperbarui oleh hasil chat NEXA/penjelasan NextTel terakhir. Menyimpan konfigurasi tidak pernah dianggap sebagai bukti koneksi.

## Proteksi endpoint provider

Endpoint custom divalidasi server-side:

- HTTPS wajib pada production;
- `localhost`, loopback, private IP, link-local, credential di URL, dan host DNS privat ditolak;
- DNS diperiksa sebelum request;
- redirect ditolak;
- request provider memakai timeout;
- identifier provider wajib ada di registry allowlist.

## Gemini dan NEXA

Gemini memakai header resmi `x-goog-api-key`; API key tidak dikirim lewat `?key=`. Endpoint request berbentuk:

```text
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
x-goog-api-key: <key>
```

Untuk model Flash thinking, NEXA mengirim `thinkingBudget: 0` dan budget output yang cukup agar token thought tidak menghabiskan jawaban yang terlihat. Respons Gemini hanya memakai bagian teks non-thought. Riwayat percakapan NEXA dapat melewati 500 karakter; backend menerima history JSON terbatas, menyaring role non-user/assistant, dan membatasi panjang tiap pesan.

Kesalahan provider diklasifikasi internal sebagai `API_KEY_INVALID`, `PERMISSION_DENIED`, `MODEL_NOT_FOUND`, `QUOTA_EXCEEDED`, `RATE_LIMITED`, `INVALID_ENDPOINT`, `INVALID_REQUEST`, `PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE`, `INVALID_PROVIDER_RESPONSE`, atau `DECRYPTION_FAILED`. Pengunjung menerima pesan aman tanpa detail key, header, atau badan respons provider.

## Setup lokal

```bash
# 1. Backend
cd backend
cp .env.example .env               # isi DATABASE_URL, SESSION_SECRET, dll.
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# tempel hasilnya ke AI_CONFIG_ENCRYPTION_KEY di .env
npx prisma migrate deploy
npx prisma generate
npm run dev

# 2. Frontend (terminal lain)
cd frontend
npm run dev                        # http://localhost:5173
```

Setelah `AI_CONFIG_ENCRYPTION_KEY` diubah, **restart backend**.

## Operasional

1. Buka **Dashboard → Pengaturan AI** sebagai admin.
2. Pilih provider. Isi endpoint untuk `custom-openai`; endpoint default boleh dikosongkan pada provider lain.
3. Masukkan API key baru, atau kosongkan field untuk memakai key tersimpan.
4. Klik **Muat daftar model**, lalu ketik untuk mencari dan pilih model (atau isi manual).
5. Klik **Uji koneksi** (endpoint terjangkau) lalu **Verifikasi API key** (key + model).
6. Simpan konfigurasi, kemudian aktifkan layanan bila siap.
7. Jika provider gagal, NEXA mengembalikan error aman. NextTel mengembalikan narasi fallback; rekomendasi lokal tetap tersedia.

## Validasi

```bash
cd backend
npm test

cd ../frontend
npm run lint
npm run ai:uji
npm run nexttel:bilingual
npm run bahasa:uji
```
