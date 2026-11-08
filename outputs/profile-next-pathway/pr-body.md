Memperbarui isi halaman /profil-sekolah sesuai Figma 415:6487: border dan proporsi About, Visi/Misi dengan lima pernyataan, tiga pilar terhubung, serta detail timeline. Menambahkan Stematel Next Pathway setelah fasilitas dengan kartu The Founder, The Scholar, dan Professional menggunakan cutout siswa/aset asli Figma dan teks HTML responsif.

Seluruh konten baru terintegrasi dengan terjemahan ID/EN existing. Hero, navbar, footer, section guru/metode/fasilitas, backend, dan admin tetap memakai implementasi existing. Milestone 2023 mempertahankan branding Next Gen dan fakta transformasi digitalnya.

Validasi:
- Lint, build CI dengan prerender 100 rute, profile content, video facade, hero structure, dan bahasa:uji lulus.
- QA bundle produksi lulus pada 1920/1847/1440/1280/1024/768/390/320 px dalam ID/EN; memeriksa teks, aset, pemisahan gambar/teks, alignment, pilar, timeline, dan overflow.
- MP4 sekolah benar-benar berjalan melalui aktivasi keyboard dalam kedua bahasa.
- Smoke test Beranda/Fasilitas/Profil Guru pada desktop/mobile ID/EN serta carousel guru di sembilan ukuran lulus.
- Review kode dan git diff --check lulus. Daftar file, pemetaan layer, dan bukti lokal tercatat di docs/profile-next-pathway-qa.md.

Batas verifikasi: CMS memakai fixture untuk QA tampilan; deployment, autentikasi admin nyata, Safari/perangkat fisik belum diuji. Tautan sertifikat tidak ditambahkan karena sumber valid belum tersedia. Skrip lama uji-profil-sekolah-layout.mjs masih gagal pada ekspektasi kelas CTA guru yang sudah usang di HEAD; komponen terkait tidak berubah dan suite browser guru yang lebih baru lulus.

Referensi: https://www.figma.com/design/ca2iX76GpJSr0QC7Qyv9RV/Figma-MCP?node-id=415-6487&m=dev
