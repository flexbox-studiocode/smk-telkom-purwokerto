# Analisis Arsip WordPress

Tanggal analisis: 2026-11-22  
Sumber: `wordpres_posts.sql` (41.018.870 byte, SHA-256 belum dicatat)  
Mode: read-only. Tidak ada SQL arsip dieksekusi ke database utama.

## 1. Struktur dump

Dump phpMyAdmin berasal dari MariaDB 10.11.18 dan menyebut database sumber `smkpurwokerto_profile`. Dump hanya mendefinisikan satu tabel:

```sql
CREATE TABLE ic_posts (
  ID bigint unsigned,
  post_author bigint unsigned,
  post_date datetime,
  post_date_gmt datetime,
  post_content longtext,
  post_title text,
  post_excerpt text,
  post_status varchar(20),
  comment_status varchar(20),
  ping_status varchar(20),
  post_password varchar(255),
  post_name varchar(200),
  to_ping text,
  pinged text,
  post_modified datetime,
  post_modified_gmt datetime,
  post_content_filtered longtext,
  post_parent bigint unsigned,
  guid varchar(255),
  menu_order int,
  post_type varchar(20),
  post_mime_type varchar(100),
  comment_count bigint
)
```

Tidak ditemukan definisi atau data `ic_postmeta`, `ic_terms`, `ic_term_taxonomy`, `ic_term_relationships`, maupun `ic_users`. Akibatnya:

- featured image WordPress (`_thumbnail_id`) tidak dapat dipastikan;
- kategori/tag WordPress tidak dapat direkonstruksi;
- nama penulis tidak dapat direkonstruksi dari `post_author`;
- attachment metadata seperti ukuran hasil generate tidak tersedia.

Parser lokal membaca 764 statement `INSERT`, menghasilkan **5.578** baris dengan **0 tuple terpotong/arity salah**. Parser tidak mengeksekusi SQL.

## 2. Inventaris konten

| `post_type` | Jumlah |
|---|---:|
| `revision` | 2.780 |
| `attachment` | 1.799 |
| `post` | 802 |
| `nav_menu_item` | 92 |
| `page` | 45 |
| `elementor_library` | 13 |
| `fusion_element` | 11 |
| `fusion_tb_section` | 6 |
| `itsec-dash-card` | 6 |
| `avada_portfolio` | 3 |
| `fusion_tb_layout` | 3 |
| `tribe_events` | 3 |
| lain-lain | 15 |
| **total** | **5.578** |

Status:

| `post_status` | Jumlah |
|---|---:|
| `inherit` | 4.579 |
| `publish` | 994 |
| `draft` | 3 |
| `private` | 1 |
| `auto-draft` | 1 |

`publish` tidak dianggap sinonim berita. `page`, attachment, revision, menu, CSS, template, Elementor/Fusion, dan objek teknis tidak otomatis masuk tabel publik.

## 3. Database project saat diperiksa

`DATABASE_URL` mengarah ke `smk_telkom_purwokerto` pada `127.0.0.1:3306`. Koneksi tervalidasi hanya-baca melalui user aplikasi.

| Tabel target | Jumlah sebelum migrasi |
|---|---:|
| `berita` | 13 |
| `pengumuman` | 11 |
| `prestasi` | 21 |
| `events` | 53 |
| `bkk` | 12 |
| `users` | 1 |
| `admins` | 1 |
| `site_settings` | 1 |
| `spmb_information` | 21 |
| `ppdb` | 0 |
| `ppdb_drafts` | 0 |
| `auth_tokens` | 0 |
| `sessions` | 5 |

Tidak ada mutasi pada tabel tersebut selama fase ini.

## 4. Struktur target Prisma

| Target | Field wajib utama | Catatan |
|---|---|---|
| `berita` | `id`, `judul`, `slug` unik, `konten`, `status`, timestamps | `ringkasan`, `gambarUrl`, `penulis` nullable |
| `pengumuman` | `id`, `judul`, `slug` unik, `konten`, `status`, timestamps | `tanggal` nullable |
| `prestasi` | `id`, `judul`, `slug` unik, `deskripsi`, timestamps | tanpa field status |
| `events` | `id`, `judul`, `ringkasan`, `deskripsi`, `kategori`, `tanggalMulai`, `lokasi`, `penyelenggara`, `status`, timestamps | `tanggalMulai` MySQL `DATE`; kategori Prisma enum |
| `bkk` | `id`, `perusahaan`, `posisi`, `status`, timestamps | dump belum menyediakan struktur lowongan andal; tidak diimpor otomatis |

Tidak ada tabel source mapping pada schema saat ini. Engine memakai UUID v5 deterministik dari `WordPress ID + target`, sehingga pengulangan input sama menghasilkan primary key sama. Ini menjaga idempotensi tanpa migration schema tambahan. Metadata sumber disimpan dalam laporan/plan; belum ada penyimpanan permanen untuk raw content atau metadata karena schema tidak menyediakan kolom aman untuk itu.

## 5. Pemetaan dan transformasi

| Sumber | Target | Kebijakan |
|---|---|---|
| `post` dengan sinyal editorial cukup | `berita` | otomatis, setelah sanitasi |
| `post` dengan sinyal kuat pada judul prestasi | `prestasi` | otomatis; kategori/tingkat hanya bila terdeteksi |
| `post` dengan sinyal kuat pada judul pengumuman | `pengumuman` | otomatis |
| `post` dengan sinyal kegiatan terjadwal jelas pada judul | `events` | otomatis; kategori `kegiatan`, tanggal memakai `post_date` |
| `page` | review | tidak dimigrasi otomatis |
| `tribe_events` | review | tiga record; field tanggal Event Calendar tidak tersedia pada dump ini |
| `attachment` | aset media | URL dianalisis; bukan record publik |
| `revision`, menu, builder/template, CSS | skip | tidak relevan untuk frontend publik |
| ambigu | `needs_review` | tidak ditulis ke database |

Transformer:

- mempertahankan heading, paragraf, list, link HTTP/HTTPS, gambar, tabel;
- membuang script, iframe, object, form, SVG, event handler, style inline, `javascript:` URL;
- menghapus shortcode dan wrapper Fusion/Elementor yang tidak dapat dirender;
- tidak membuat path gambar bila file sumber gagal ditemukan;
- `post_date` nol (`0000-00-00`) menjadi `null`; event tanpa tanggal valid tidak eligible.

## 6. Media

SQL tidak memuat binary BLOB gambar. `attachment.guid` dan URL `<img>` adalah referensi URL, bukan bukti file ada.

Hasil validasi URL mode read-only pada 2.789 URL unik:

| Status | Jumlah |
|---|---:|
| respons image tersedia | 2.672 |
| unresolved | 104 |
| URL/ekstensi tidak valid untuk media gambar | 13 |

Penyebab unresolved: 76 HTTP 404, 19 respons HTML, 9 kegagalan koneksi. Banyak kegagalan berasal dari aset demo `avada.theme-fusion.com`; aset tersebut tidak boleh diimpor. Download aktual sudah selesai ke `backend/uploads/content-images/wordpress/` (2.663 berkas, ~948 MiB); `results/media-map.json` memetakan URL sumber ke path lokal untuk fase import.

## 7. Risiko dan batasan

1. Klasifikasi berbasis heuristik. Hasil otomatis harus diperiksa lewat dry-run plan sebelum import.
2. Tidak ada taxonomy/postmeta/users. Kategori, featured image, penulis asli, tanggal event selesai, lokasi event tidak dapat dipulihkan dengan pasti.
3. Banyak konten Fusion/Elementor. Sanitasi mempertahankan HTML umum, bukan visual builder identik.
4. Dump mengandung beberapa urutan byte mojibake dan 6 karakter replacement UTF-8 (`U+FFFD`). Parser mempertahankan byte menggunakan pembacaan latin1; teks rusak tetap harus direview bila muncul.
5. URL tersedia bukan izin untuk crawl massal tanpa pengaturan rate/bandwidth. Resolver memakai concurrency dan jeda; default dry-run hanya validasi parsial.
6. Target database telah berisi data. Konflik slug atau kandidat event duplikat di-skip dan masuk laporan; data existing tidak dihapus.

## 8. Strategi keselamatan

1. Buat backup berhasil diverifikasi terlebih dahulu.
2. Buat/import staging `wordpress_archive` menggunakan akun MySQL berhak `CREATE DATABASE`. User `smk_app` saat diperiksa tidak memiliki privilege itu.
3. Jalankan `npm run wp:analyze` lalu `npm run wp:dry-run`.
4. Review `results/migration-plan.json`, khususnya `review`, `conflicts`, media unresolved, dan semua kandidat target publik.
5. Baru jalankan download media eksplisit dan import dengan `--yes` setelah approval.
6. Bandingkan jumlah record before/after dan jalankan API/test terkait.

Tidak ada langkah import atau perubahan schema Prisma dalam phase ini.
