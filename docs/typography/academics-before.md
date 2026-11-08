# Audit tipografi halaman akademik

Tanggal: 2026-11-05. Basis lokal: fix/figma-typography-consistency, fa6fb19. Audit baca saja; tidak ada perubahan production/Figma/commit.

## Bukti dan batas perbandingan

Figma ca2iX76GpJSr0QC7Qyv9RV, page 0:1, session f00f9e5b-bc42-4abd-ac2a-39218347485d. Profil 367:799, guru 12:63, ekstrakurikuler 59:133, jurusan 24:1827, prestasi 139:643. Semua frame berukuran 1847px kecuali prestasi 1844px. Angka ukuran Figma di bawah adalah angka sumber pada frame tersebut, bukan instruksi menempel ukuran mentah pada kartu lokal yang lebih sempit.

Konteks high-fidelity profil, ekstra, prestasi tersedia di academics-profile-context.json, academics-59-133-context.json, academics-139-643-context.json. Guru dan jurusan mengembalikan metadata sparse; konteks high-fidelity anak di academics-12-3674-context.json, academics-12-118-context.json, academics-12-119-context.json, academics-12-3644-context.json, academics-24-1833-context.json, academics-24-1895-context.json, academics-24-2073-context.json, academics-24-2136-context.json. Screenshot sudah diminta; guru/jurusan lewat get_screenshot setelah respons sparse. Tidak ada mutasi Figma.

Metrik exact font family, size, weight, lineHeight, letterSpacing, bounding box, node ID berada pada academics-…-metrics.json. Profil dibagi 0/70; jurusan 0/70/140. Node text tidak dibuang. Copy paragraf di metrics dibatasi 150 karakter untuk matching; copy lengkap ada pada konteks. Tabel di bawah mengelompokkan pengulangan sejenis.

Browser awal pada 5181 masih menampilkan Suspense loading, sehingga hasil screenshot/computed yang belum mengandung halaman target telah dihapus. Semua angka lokal pada laporan ini berasal dari deklarasi JSX/CSS, bukan klaim computed browser yang sudah tervalidasi. Browser audit dan proses turunannya sudah dihentikan agar root dapat menjalankan QA serial.

Pemetaan route: 12:63 cocok dengan /profil-sekolah/guru (GuruPage), 24:1827 dengan /jurusan (JurusanPage), 139:643 dengan /prestasi (PrestasiPage). Frame itu bukan desain /…/:slug. GuruDetailPage memakai DetailLayout; JurusanDetailPage memakai JurusanDetailHero/Konten; PrestasiDetailPage memakai DetailLayout dan PrestasiDetailKonten. Jangan menyalin angka listing ke halaman detail. Tidak ditemukan referensi detail yang membenarkan angka ukuran/weight baru untuk komponen detail tersebut.

## Aturan family yang harus dipertahankan

- Mayoritas heading/body akademik memakai Plus Jakarta Sans. Lokal saat audit memakai heading Poppins, body Inter. Perbaikan root public-site dapat menangani default ini tanpa menyentuh admin.
- Poppins adalah sumber yang benar untuk hero guru 12:3674–3676; semua hero, input pencarian, statistik, kategori, judul kategori ekstra 59:141–142/776/783–790/813–833; seluruh metode pembelajaran profil 367:1360–1411.
- Inter pada profil hanya breadcrumb current 367:929 dan dua CTA fasilitas 367:1315–1316. Jangan mempertahankan Inter untuk semua body karena dua pengecualian ini.
- Profile Jakarta di profile.css adalah alias font lokal yang benar untuk prinsip/timeline. Dapat diganti var(--font-jakarta) setelah canonical face didaftarkan root. Jangan memuat font duplikat atau menambah dependency.
- Semua lineHeight selain metode pembelajaran adalah AUTO kecuali catatan yang ada di JSON. AUTO tidak membenarkan mengarang fixed px; gunakan rasio yang aman pada container lokal dan verifikasi wrap.

## Profil /profil-sekolah

File selector di bawah relatif terhadap frontend/src.

| Lokasi | Lokal sekarang | Figma yang diharapkan | Node |
|---|---|---|---|
| components/tentang/TentangHeroSection.jsx h1 | Poppins 32/800, line 1.2, tracking -0.025em pada xl | Jakarta 55/800, tracking .05em; size adaptif sesuai hero-copy lokal | 367:808 |
| TentangHeroSection .hero-copy > p | Inter 13/400 | Jakarta 16/500, tracking .12em | 367:807 |
| TentangHeroSection .hero-copy > a | Inter 12/600 | Jakarta 15/600, tracking .12em | 367:813 |
| components/tentang/TentangStatsSection.jsx angka | Poppins 20/800 | Jakarta 40/800, tracking .05em | 367:855–859/867–868/873 |
| TentangStatsSection label | Inter 11/400 | Jakarta 20/500, tracking .08em | 367:863–865/872 |
| styles/profile.css .profile-about-copy h2 | Poppins 40/800 di >=1660, line1.3 | Jakarta 40/800, tracking0 | 367:815 |
| .profile-about-copy > p | Inter 27/400 di >=1660 | Jakarta 27/500 | 367:816 |
| .profile-about-action | Inter 14/800 di >=1660, tracking.04em | Jakarta 15/800, tracking.12em | 367:819 |
| .profile-video > p | Poppins 32/800 di >=1660 | Jakarta 42/800; jangan langsung42 bila mengganggu slot caption | 367:996 |
| .profile-principle-description strong kedua | 700 seperti strong pertama | strong pertama700, penekanan Kreator dan Inovator600, body500 | 367:842, segment ranges di metrics |
| .profile-milestone-title | Jakarta scaled20/500, tracking.06em | Jakarta20/500 tracking.08em | 367:1152–1155/1164 |
| .profile-milestone-description | Jakarta scaled16/500, tracking.07em | mayoritas .08em; milestone2026 .07em | 367:1147–1151 |

Prinsip/nilai/timeline telah memakai family Jakarta dan ukuran container-relative yang disengaja. .profile-principle-header h2 64/700, .profile-principle-tagline 32/700, .profile-value-card h3 32/700, descriptions15/500, sectionheading48/700, timelineyear40/800 sesuai peran/weight sumber. Pertahankan cqw/clamp dan container; bukan mismatch karena angka computed pada container lebih kecil tidak mencapai cap.

Bagian kepala sekolah/guru dalam screenshot profil tidak memiliki node TEXT padanan di 123 text node frame 367:799. Jangan menebak ukuran dari bitmap; pertahankan ukuran responsif saat membetulkan family default.

### Metode pembelajaran: koreksi terarah, Poppins wajib

Scope styles/profile.css `.profile-learning` perlu explicit Poppins agar perubahan default public Jakarta tidak mengubahnya. Semua tracking0. Angka berikut berlaku basis lebar; breakpoint ukuran kecil tetap dipertahankan.

| Selector | Lokal sekarang pada >=1660 | Figma | Node |
|---|---|---|---|
| .profile-learning h2 | Poppins64/800 line86.4 | Poppins64/700 line80 | 367:1362–1363 |
| .profile-learning-eyebrow | Inter23/600 | Poppins23/600 AUTO | 367:1364 |
| .profile-learning-intro | Inter29/400 line40.6 | Poppins29/400 line40 | 367:1360 |
| .profile-learning-detail h3 | Poppins32/800 line44.8 | Poppins32/700 line45 | 367:1376/1380 |
| .profile-learning-detail p pertama proyek | Inter23/400 line32.2 | Poppins23/400 line32 | 367:1379 |
| .profile-learning-detail p kedua digital | Inter23/400 line32.2 | Poppins23/400 line34 | 367:1375 |
| .profile-learning-platforms li | Inter22/800 | Poppins22/700 AUTO | 367:1368/1370/1372/1374 |
| .profile-learning-journey > h3 | Poppins32/800 line48 | Poppins32/700 line48 | 367:1411 |
| .profile-learning-stages h4 | Poppins30/800 line40.5 | Poppins30/700 line40 | 367:1390/1396/1402 |
| .profile-learning-stage-title | Inter21/500 line31.5 | Poppins21/500 line29 | 367:1389/1395/1401 |
| .profile-learning-stages p sisanya | Inter18/400 line27 | Poppins18/400 line27 | 367:1388/1394/1400 |

Fasilitas profil memakai components/FacilitiesSection.jsx bersama halaman lain. Scope perubahan `variant="profile"` atau wrapper profil; jangan ubah ukuran seluruh fasilitas global.

| Selector/peran FacilitiesSection | Lokal | Figma | Node |
|---|---|---|---|
| eyebrow Fasilitas Kelas | Inter14/400 | Jakarta32/500 tracking.12em | 367:1249 |
| heading | Poppins48/800 lg, tracking-.025em | Jakarta64/800 tracking.12em | 367:1251 |
| description | Inter14/400 | Jakarta16/600 tracking.12em | 367:1252 |
| active card title | Poppins20/700 lg | Jakarta36/600 | 367:1288 |
| active description | Inter12/400 | Jakarta16/500 tracking.12em | 367:1312 |
| preview titles | Poppins20/700 lg | Lab Robotik Jakarta36/600; Ruang Kelas Jakarta36/800 | 367:1269/1286 |
| timeline label/buttons | Inter12 variable weight | Jakarta24/700 for Visi/Misi/Technology/Collaboration | 367:1303–1307 |
| two action links | Inter responsive clamp40/800 | Inter40/800 tracking0; family sudah benar | 367:1315–1316 |

## Guru /profil-sekolah/guru

| File/selector | Lokal | Figma | Node |
|---|---|---|---|
| pages/GuruPage.jsx .school-hero--teachers h1 | Poppins32/800 tracking-.025em | Poppins64/600 tracking.05em | 12:3674–3676 |
| hero .hero-copy > p | Inter14/400 | Jakarta16/500 tracking.12em | 12:3669 |
| hero CTA | Inter14/600 | Jakarta15/600 tracking.12em | 12:3681 |
| #kepala-sekolah-title | Poppins24/800 | Jakarta40/700 | 12:122 |
| kepala sekolah subtitle | Inter16/600 | Jakarta32/700 | 12:121 |
| kepala sekolah h3 nama | Poppins20/700 | Jakarta40/700 | 12:118 |
| kepala sekolah quote | Inter14/400 | Jakarta24/500 | 12:125 |
| Jabatan/Posisi, Motto labels | Poppins14/700 | Jakarta32/800 | 12:83/84 |
| jabatan/motto value | Inter12/400 | Jakarta20/500 | 12:126/127 |
| GuruGrid h2 | Poppins30/800 | Jakarta48/700 | 12:119/120 |
| GuruGrid subtitle | Inter16/600 | Jakarta32/700 | 12:123/124 |
| components/TeacherCard.css .teacher-card-label h3 | Poppins clamp10..17 /700; <=190px9 | Jakarta24/800, tracking.05em; Reza exception16/800 | 12:3644–3666 |
| .teacher-card-label p | Inter clamp9..12 /400; <=190px8 | Jakarta15/500 tracking0 | 12:3604–3623 |

TeacherCard dipakai profil dan GuruGrid. Perbaikan weight/family dapat terpusat; ukuran label harus mengikuti container dan panjang nama dinamis. Figma sendiri Reza16 vs nama lain24 menguatkan perlunya fit berdasarkan ukuran kartu, bukan menempel24 pada semua nama. Local slot pelengkap (mapel/deskripsi baru, organisasi saat ini) tidak punya exact text node sumber. Jangan ubah datanya agar sama dengan placeholder Figma.

## Ekstrakurikuler /ekstrakurikuler

Seluruh markup berada pages/EkstrakurikulerPage.jsx. Nama item pada desain tidak membenarkan mengubah isi/categories data lokal.

| Selector/peran | Lokal | Figma | Node |
|---|---|---|---|
| hero h1 | Poppins32/800 tracking-.025em | Poppins64/600 tracking.05em | 59:141 |
| hero subtitle | Inter14/500 | Poppins20/400 tracking.05em | 59:142 |
| search input | Inter14/400 | Poppins20/400 tracking.05em | 59:776 |
| hero stats label | Inter10/500 | Poppins16/300 tracking.05em | 59:783–786 |
| hero stats value | Poppins18/700 | Poppins24/600 tracking.05em | 59:787–790 |
| CategoryTabs button | Poppins12/700 | Poppins24/600 tracking.05em | 59:813/817/821/829/833 |
| CategorySection h2 | Poppins24/800 | Poppins40/600 tracking.05em | 59:825 |
| ActivityCard h3 | Poppins16/700 | Jakarta32/700 (E-Sport24/700) | 59:262/266/735/270 |
| ActivityCard description | Inter14/400 line1.625 | Jakarta12/500, E-Sport15/500 | 59:274/278/282/286 |
| ActivityCard button | Inter14/700 | Jakarta13/500 tracking.08em | 59:290/294/298/302 |

Dialog tambahan dan counter kegiatan tidak memiliki node exact sumber. Pertahankan ukuran/struktur. Figma category/tab size24 berada container1847, sedangkan lokal max-w7xl dan tombol sempit; ambil weight/tracking/family terlebih dahulu dan scale font hanya setelah wrap terukur.

## Jurusan /jurusan

Semua family pada frame listing Jakarta. Detail jurusan tidak punya frame yang tervalidasi dalam scope ini.

| File/selector | Lokal | Figma | Node |
|---|---|---|---|
| components/jurusan/JurusanHeroSection.jsx h1 | Poppins32/800 tracking-.025em | Jakarta48/800 tracking.05em | 24:1833/1834 |
| hero description | Inter14/400 | Jakarta14/500 tracking.12em | 24:1832 |
| hero CTA | Inter14/600 | Jakarta15/600 tracking.12em | 24:1841/1846 |
| HeroStatsBar values | Poppins20/800 | Jakarta40/800 tracking.05em | 24:1857–1876 |
| HeroStatsBar labels | Inter11/400 | Jakarta20/500 tracking.08em | 24:1851–1856/1873–1874 |
| JurusanListSection.jsx h2 | Poppins24/800 | Jakarta40/800 tracking.05em | 24:1885/1886 |
| JurusanListSection article h3 | Poppins13/700 | Jakarta24/700 | 24:1895/1975/1979/1983/2027 |
| card description | Inter10/400 | Jakarta15/500 | 24:1985–2000 |
| card tags | Inter9/700 | Jakarta15/800 tracking.12em | 24:1911–1968/2043–2050 |
| card link | Inter10/700 | Jakarta13/500 tracking.08em | 24:1969–1974/2001–2002 |
| JurusanQuizSection.jsx h2 | Poppins16/800 xl | Jakarta24/700 | 24:2073 |
| quiz intro/choice | Inter12/400 | Jakarta20/500 | 24:2113/2116/2119/2122 |
| quiz CTA | Inter14/700 tracking.05em | Jakarta24/600 tracking.12em | 24:2076 |
| JurusanShowcaseSection.jsx h2 | Poppins24/800 | Jakarta40/800 | 24:2127/2128 |
| JurusanCompareSection.jsx h2 | Poppins24/800 | Jakarta40/800 | 24:2334/2479 |
| JurusanFaqSection.jsx FAQ h2 | Poppins24/800 | Jakarta48/800 tracking.05em | 24:2136/2151 |
| FAQ question button span | Inter16/700 | Jakarta29/500 tracking.05em | 24:2138–2140/2153–2155 |
| FAQ all link | Inter14/700 | Jakarta36/500 tracking.05em | 24:2137/2152 |

FAQ lokal memiliki hero bantuan dan accordion/desain baru; hanya elemen dengan peran sama di atas dapat dipetakan. Tabel compare dan project image captions sebagian berupa raster atau grup tanpa node TEXT yang padan; angka baru tidak boleh ditebak. Sizing kartu dan quiz tetap mengikuti container, terutama desktop4 kolom.

## Prestasi /prestasi

139:643 yang dipakai, bukan versi lama24:2575. Mayoritas family Jakarta.

| File/selector | Lokal | Figma | Node |
|---|---|---|---|
| components/prestasi/PrestasiHeroSection.jsx h1 | Poppins32/800 tracking-.025em | Jakarta48/800 tracking.05em | 139:682 |
| hero description | Inter14/400 | Jakarta14/500 tracking.12em | 139:680 |
| hero CTA | Inter14/600 | Jakarta15/600 tracking.12em | 139:695 |
| HeroStatsBar values/labels | Poppins20/800, Inter11/400 | Jakarta40/800 tracking.05em; labels20/500 tracking.08em | 139:723–745 |
| PrestasiUnggulanSection.jsx h2 | Poppins24/800 | Jakarta40/800 tracking.05em | 139:750 |
| main selected h3 | Poppins24/800 | Jakarta40/800 tracking.05em | 139:752 |
| main badge | Inter9/700 | Jakarta13/800 tracking.12em | 139:726 |
| main narrative | Inter14/400 leading28 | Jakarta16/500 tracking.12em | 139:681 |
| main link | Inter12/700 | Jakarta15/800 tracking.12em | 139:975 |
| side button p titles | Poppins14/700 | Jakarta20/800 tracking.05em | 139:753–755 |
| side button badge | Inter8/700 | Jakarta13/800 tracking.12em | 139:727–729 |
| PrestasiGaleriSection.jsx h2 | Poppins24/800 | Jakarta40/800 tracking.05em | 139:751 |
| gallery filters | Inter11/600 | Jakarta24/600 tracking.12em | 139:698–724 |
| gallery h3 | Poppins10/700 | Jakarta20/700 | 139:1006–1009/1011 |
| gallery dates | Inter9/400 | Jakarta15/500 | 139:993–996/1000 |
| gallery category | Inter8/700 | Jakarta13/600 | 139:1014/1017/1020/1023/1026 |
| gallery all CTA | Inter11/700 | Jakarta15/800 tracking.12em | 139:1030 |
| PrestasiPerjalananSection.jsx name | Jakarta responsive20/700 | Jakarta20/700 | 139:1010/1036/1042/1048 |
| hall achievement/role | Jakarta responsive16/400 | Jakarta16/500 | 139:998–999/1034–1035/1040–1041/1046–1047 |
| PrestasiDukunganSection.jsx eyebrow/title | Jakarta20/600,40/700 (responsive) | Jakarta20/600,40/700; sudah sesuai family/weight | 139:1145/1144 |
| VideoEmbed horizontal caption title | Jakarta24/800 tracking.05em | Jakarta24/800 tracking.05em; sudah sesuai | 139:1143 |
| VideoEmbed horizontal desc | Jakarta15/500 | Jakarta15/500; sudah sesuai family/weight | 139:1146 |

Hall of Fame heading48/800 pada Figma139:939 sudah mengikuti lg2.603cqw lokal; tidak perlu mengganti ukuran mentah. Shared VideoEmbed perubahan tracking harus scoped bila caller lain memakai source berbeda. Galeri lokal6 kolom vs Figma5: jangan ubah columns/layout; angka20px judul Figma bukan target mentah untuk kartu lokal sempit. Main selected item/dates berasal data production dan dapat berbeda; jangan edit konten.

## Urutan implementasi yang aman setelah root menyatukan audit

1. Canonical face/tokens lokal dan public-site default Jakarta oleh root; admin tetap scope lama.
2. Explicit Poppins teacher hero, extra hero/stats/tabs/category title, seluruh profile-learning; explicit Inter tombol fasilitas profil bila default berubah.
3. Koreksi weight per selector yang terbukti. Contoh penting: learning800→700, teacherhero800→600, extrahero800→600, extra statlabel500→300, numbers700→600, tabs700→600, teachersection800→700, cards descriptions400→500, action13/500 hanya pada link yang punya Figma padanan.
4. Koreksi tracking hanya elemen padanan, semua source percent dibagi100 untuk em. Pertahankan0 pada learning. Jangan blanket tracking.12em ke paragraph baru atau seluruh website.
5. Pertahankan clamp/cqw, grid/container, padding, colors, data, dan breakpoints. Terapkan perubahan ukuran hanya bila root QA membuktikan aman pada container aktual. Lakukan browser baseline/after yang benar setelah Suspense selesai, 1847/1280/390px dan English yang lebih panjang.

Belum dicek: computed halaman target, wrap/overflow setelah perubahan, production/device. Risiko: beberapa frame berisi placeholder/raster dan ukuran viewport Figma lebih besar dari container lokal; raw size global akan merusak layout.
