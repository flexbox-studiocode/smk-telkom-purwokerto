# Pemetaan WordPress ke Database Project

Tabel ini menggambarkan mapping aktual implementasi engine, bukan rencana teoretis.

## Kunci identitas dan idempotensi

| Sumber | Target | Aturan |
|---|---|---|
| `ic_posts.ID` + kategori | UUID `id` | UUID v5 deterministik namespace `7c9b1f2a-4d3e-5a6b-8c9d-0e1f2a3b4c5d` |
| `post_name` (valid) | `slug` | slugify; konflik dalam batch mendapat `-2`, `-3` |
| `post_name` kosong / numeric | `slug` | turun ke slug dari judul, fallback `wp-<ID>` |
| `post_name` | konflik dengan data existing | tidak menimpa data existing; tercatat `skip_slug_conflict` pada dry-run |
| `post_date` | `createdAt` / `tanggal` / `tanggalMulai` | konversi UTC presisi; `0000-00-00` menjadi `null` |
| `post_modified` | `updatedAt` | fallback ke `post_date` bila tidak valid |
| `post_status` | `status` | `publish` menjadi `published`, lainnya `draft` |

Target record memakai ID deterministik, bukan ID acak, sehingga import dua kali menghasilkan upsert baris yang sama, bukan duplikasi.

## Berita

| WordPress | Project | Transformasi |
|---|---|---|
| `post_title` | `judul` | plain text, maksimal 255 |
| `post_name` | `slug` | lihat aturan slug |
| `post_excerpt` / `post_content` | `ringkasan` | plain text, maksimal 500 |
| `post_content` | `konten` | shortcode/Elementor/Fusion dibersihkan, HTML disanitasi |
| `attachment.guid`, `<img src>` | `gambarUrl` | hanya URL media yang sudah terverifikasi/dipetakan |
| penulis | `penulis` | default `SMK Telkom Purwokerto`; `ic_users` tidak tersedia |
| `post_status` | `status` | publish/other |
| `post_date`, `post_modified` | timestamps | MySQL datetime |

## Pengumuman

Sama seperti berita, dengan tambahan pemetaan tanggal:

- `pengumuman.tanggal` = `post_date`;
- `pengumuman` tidak memiliki `penulis`;
- konflik slug dipertahankan sebagai skip, bukan penggantian data existing.

## Prestasi

| WordPress | Project | Transformasi |
|---|---|---|
| `post_title` | `judul` | 255 karakter |
| `post_name` | `slug` | deterministik |
| kata kunci judul | `kategori` | hanya nilai yang tampak eksplisit, misalnya juara/olimpiade/sertifikasi |
| `post_content` | `deskripsi` | sanitized HTML atau ringkasan teks |
| URL media terverifikasi | `gambarUrl` | tidak membuat path palsu |
| pola `tingkat` | `tingkat` | hanya dari judul/ringkasan yang mendukung |
| tidak tersedia | `instagramUrl` | selalu `null` |
| `post_date` | `tanggal` | tanggal publikasi |

Prestasi tidak punya `status` pada Prisma model; karena itu konten ambigu tetap tidak ditulis dan masuk review.

## Events

| WordPress | Project | Transformasi |
|---|---|---|
| `post_title` | `judul` | 180 karakter |
| `post_excerpt` / konten | `ringkasan` | maksimal 480 karakter, tidak kosong |
| konten/ringkasan | `deskripsi` | sanitized HTML |
| default | `kategori` | `kegiatan`; tidak ada metadata Event Calendar pada dump |
| `post_date` | `tanggalMulai` | hanya DATE; wajib menurut schema |
| tidak tersedia | `waktuMulai` | `null` |
| tidak tersedia | `tanggalSelesai` / `waktuSelesai` | `null` |
| tidak tersedia | `lokasi` | string kosong sesuai default schema |
| default | `penyelenggara` | `SMK Telkom Purwokerto` |
| media terverifikasi | `gambarUrl` | path lokal setelah media phase |
| tidak tersedia | `linkInformasi` | `null` |

Rekaman `tribe_events` tidak otomatis dipetakan karena metadata event (`_EventStartDateTime`, venue, organizer) berada pada `postmeta` yang tidak ada dalam dump.

## BKK, PPDB, halaman statis

- tidak ada mapping otomatis;
- `thjm_jobs` hanya satu record dan struktur lowongan tidak cukup untuk memenuhi kolom `perusahaan` + `posisi` secara aman;
- halaman `page` harus ditinjau manual.

## Tidak dipetakan

| Sumber | Alasan |
|---|---|
| `revision` | duplikasi historis, bukan konten publik |
| `nav_menu_item` | struktur menu lama, frontend project tidak memakai model ini |
| `custom_css` / `wp_global_styles` | styling lama, bukan konten |
| `fusion_element` / `elementor_library` | template builder internal |
| `attachment` | media aset, bukan artikel |
| `post_content_filtered` | filter builder, tidak dirender |
| taxonomy/category | tidak tersedia dalam dump |
| thumbnail metadata | `postmeta` tidak tersedia |
| penulis asli | `ic_users` tidak tersedia |
