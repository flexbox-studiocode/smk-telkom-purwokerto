# Inventaris Konten Arsip WordPress

Hasil pembacaan `wordpres_posts.sql` (mode read-only). Angka berasal dari hasil parse aktual pada 2026-11-22, bukan estimasi.

## Ringkasan parser

| Metrik | Nilai |
|---|---:|
| Total record `ic_posts` | 5.578 |
| Statement `INSERT` | 764 |
| Tuple arity salah / terpotong | 0 |
| Record tanpa judul | 66 |
| Record memuat gambar inline | 2.057 |
| URL gambar inline unik | 1.277 |
| GUID attachment gambar unik | 1.735 |

## Distribusi `post_type`

| post_type | Jumlah | Rekomendasi migrasi |
|---|---:|---|
| `revision` | 2.780 | skip |
| `attachment` | 1.799 | aset media, bukan record publik |
| `post` | 802 | kandidat konten editorial setelah klasifikasi |
| `nav_menu_item` | 92 | skip |
| `page` | 45 | review, tidak otomatis |
| `elementor_library` | 13 | skip |
| `fusion_element` | 11 | skip |
| `fusion_tb_section` | 6 | skip |
| `itsec-dash-card` | 6 | skip |
| `avada_portfolio` | 3 | review |
| `fusion_tb_layout` | 3 | skip |
| `tribe_events` | 3 | review |
| `custom_css` | 1 | skip |
| `wpcf7_contact_form` | 1 | skip |
| `tribe_venue` | 2 | skip |
| `tribe_organizer` | 2 | skip |
| `slide` | 1 | skip |
| `fusion_template` | 1 | skip |
| `avada_faq` | 1 | review |
| `itsec-dashboard` | 1 | skip |
| `elementskit_template` | 2 | skip |
| `envato_tk_import` | 1 | skip |
| `wp_global_styles` | 1 | skip |
| `thjm_jobs` | 1 | skip |

## Distribusi `post_status`

| status | Jumlah |
|---|---:|
| `inherit` | 4.579 |
| `publish` | 994 |
| `draft` | 3 |
| `private` | 1 |
| `auto-draft` | 1 |

## Distribusi tahun `post_date`

Rentang utama 2015-2020. Beberapa `post_date` bernilai `0000-00-00` dan diperlakukan tidak valid (dianggap null, bukan tanggal publikasi).

## Klasifikasi konten (hasil engine saat ini)

| Kategori | Jumlah | Tindakan |
|---|---:|---|
| skip | 4.718 | tidak diimpor |
| needs_review | 244 | tidak diimpor otomatis; antre tinjauan |
| berita | 354 | kandidat `berita` |
| prestasi | 124 | kandidat `prestasi` |
| pengumuman | 82 | kandidat `pengumuman` |
| event | 56 | kandidat `events` |
| **total** | **5.578** | |

Sumber angka: `results/dry-run.json` dan `results/migration-plan.json` yang dibuat ulang oleh `npm run wp:analyze` dan `npm run wp:dry-run`.

## Catatan khusus

1. `post_type=post` publish berjumlah 802, tetapi tidak semuanya berita. Beberapa post adalah aset grafis berjudul `Logo ...`, teks template Avada, dan halaman informasi acara; klasifikasi memisahkan kandidat berita dari kandidat review dengan skor kata kunci pada judul dan badan konten.
2. `page` 45 record mayoritas konten struktural sekolah (Profil, Fasilitas, Struktur Organisasi). Tidak dimigrasi otomatis; tersedia untuk review bila butuh konten statis.
3. `tribe_events` hanya 3 record tanpa metadata tanggal terstruktur, sehingga ditempatkan di review, bukan otomatis `events`.
4. Tidak ada record yang dianggap prestasi/pengumuman/event tanpa sinyal judul yang kuat; pasangan yang tidak konklusif masuk `needs_review`.
5. Media: 2.672 URL gambar merespons sebagai image saat divalidasi read-only, 104 unresolved (sebagian besar host demo Avada), 13 URL bukan media gambar. Download aktual selesai: 2.663 berkas (~948 MiB) di `backend/uploads/content-images/wordpress/` (diabaikan Git).
