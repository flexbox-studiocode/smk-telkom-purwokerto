# Audit tipografi konten dan fasilitas

Status: audit baca saja pada base fa6fb19, branch fix/figma-typography-consistency. Tidak ada file produksi atau desain Figma yang diubah.

Sumber: Figma ca2iX76GpJSr0QC7Qyv9RV halaman 0:1, session f00f9e5b-bc42-4abd-ac2a-39218347485d. Angka Figma di bawah adalah ukuran asli frame lebar 1847 px, bukan instruksi untuk mengubah ukuran container. Bukti exact styled segments disimpan di content-facilities-evidence/figma-*.json; screenshot target dibaca melalui get_design_context, konteks teks disimpan context-*.txt. Setiap row JSON memuat node ID, posisi, keluarga, ukuran, bobot, line height, dan letter spacing.

Penting: fontSize Figma harus mengikuti rasio container implementasi yang sudah ada. Contoh School Tour memang memakai 1280/1847; 60 px menjadi 41.5809 px dan ini bukan kesalahan ukuran. Jangan mengubah container, warna, aset, atau viewport untuk mengejar angka mentah Figma. PERCENT letter spacing dikonversi ke em: 5%=.05em, 8%=.08em, 12%=.12em. Line height AUTO berarti normal; jangan mengklaim AUTO sama dengan 1.5.

## Cakupan dan batas pemetaan

| Halaman/komponen | Sumber yang cocok | Catatan |
|---|---|---|
| Fasilitas, semua dan filter kategori | 251:535, 251:1018, 251:1911, 251:2257, 251:2586, 251:2917, 251:3246 | Seri 251 lebih baru dan konten judul sesuai implementasi. Seri 174 lebih tua. |
| School Tour/peta | 205:411 dan 205:1177 | Heading dan label peta terbaca sebagai TEXT. |
| Dialog CampusPreview, modal detail fasilitas | Tidak ditemukan frame dialog khusus dalam frame fasilitas yang terpilih | Pertahankan ukuran dialog; konsistensi keluarga dapat mengikuti peran teks yang sudah terverifikasi. Jangan membuat klaim pixel match dialog. |
| BKK | 328:786 | Figma mengandung banyak contoh lowongan dan PKL; data implementasi bisa kosong. |
| Pengumuman daftar | 117:445 | Frame ini berisi PPDB/pengumuman, bukan detail artikel. |
| Berita/detail berita/detail pengumuman | Tidak ditemukan frame khusus pada inventaris top-level halaman 0:1 | Tidak ada ukuran exact Figma yang sah untuk DetailLayout atau slot detail. |
| Kalender | 200:901, dibandingkan 196:371 | Kedua frame punya salinan teks; 200:901 memuat heading Poppins yang jelas. |
| SPMB publik | Tidak ditemukan frame publik | 198:782 ternyata dashboard admin. Jangan terapkan ukuran admin ke SpmbPage publik. |
| SPMB admin, shell dashboard | 198:782 | Hanya 23 TEXT, tabel/statistik sebagian besar berada pada gambar tertanam; tidak ada angka font tabel yang dapat dibaca dari TEXT. |
| Pengaturan admin/login | Tidak ditemukan frame khusus | Shell admin dapat memakai pemetaan198:782; form/tabs/login tidak punya pembanding exact. |

## Fasilitas

File produksi yang diaudit: frontend/src/pages/FasilitasPage.jsx dan frontend/src/styles/fasilitas.css. Semua kategori merender kartu melalui loop yang sama, jadi perbaikan pada selector kartu mencakup Laboratorium, Kelas, Perpustakaan, Aula, GOR, dan Parkiran.

| Selector/peran | Lokal saat audit pada 1847px | Figma exact | Selisih dan rekomendasi |
|---|---|---|---|
| #fasilitas-title | Poppins 30/700, line37.5, tracking0 | 251:1693 dan251:2249 Poppins48/700, AUTO,.05em | Keluarga benar saat ini tetapi akan salah bila font-heading global dipindah ke Jakarta. Beri keluarga Poppins eksplisit, ukuran berskala dari48, tracking.05em, normal. |
| GroupTitle h3; #fasilitas-grid h3 | Poppins24/700,line30,tracking0 | 251:1162 Laboratorium,251:1196 Ruang Kelas,251:1240 Aula,251:1241 GOR,251:1242 Parkiran: Poppins40/600,AUTO,.05em | Bobot700 perlu600; pertahankan Poppins eksplisit. Ukuran40 dikalibrasi terhadap section, bukan hero. |
| .facility-filters > button, seluruh7 kategori | Inter12/600,line16,tracking0 | 251:1159–1161,1199,1202,1205,1415; juga251:1984–2055: Poppins24/600,AUTO,.05em | Keluarga Inter salah dan tracking hilang. Ukuran filter tidak mengikuti skala yang dipakai lebar/gap tombol. |
| [data-facility-card] h4 | Poppins16/700,line22,tracking0 | 251:1152–1155;251:1192–1195;251:1346–1363: Jakarta32/700,AUTO,0; Area Integrasi GOR251:1352 adalah30 | Keluarga harus Jakarta. Ukuran16 terlalu kecil dibanding kartu yang hampir sama lebar dengan sumber; hitung dari32 pada rasio section. Seluruh kartu memakai selector yang sama. |
| [data-facility-card] p deskripsi | Inter12/400,line19.5,tracking0 | 251:1140–1143,1370–1381: Jakarta12/500,AUTO,0 | Keluarga dan bobot berbeda, line height terlalu longgar terhadap AUTO. Ukuran12 raw sama tetapi jangan memperbesar bersama judul. |
| [data-facility-card] button Selengkapnya | Inter12/600,line16,tracking0 | 251:1144–1147,1382–1396: Jakarta13/400,AUTO,.08em | Bobot600 berbeda dari400; tracking.08em hilang. Ukuran13 dikalibrasi terhadap section. |

Seluruh label header, deskripsi, dan CTA hero serta quick access ditangani audit shared root. Figma hero facility 251:1919 memiliki styled segments Jakarta48/800,AUTO,.05em; paragraf251:1920 Jakarta14/500,AUTO,.12em; CTA251:1928 Jakarta15/600,.12em dan251:1929 Jakarta15/700,.12em.

## School Tour dan detail fasilitas

File: frontend/src/components/fasilitas/CampusExplorer.jsx/.css dan CampusPreview.jsx.

| Selector/peran | Lokal | Figma exact | Tindakan |
|---|---|---|---|
| .campus-heading h2 | Home Motion Jakarta41.5809/800,line52.6831,.1em | 205:1100–1101 Jakarta60/800,lineAUTO,.10em | Keluarga alias Jakarta dan skala ukuran sudah tepat. line1.267 disengaja mendekati metrik tinggi sumber; jangan ratakan ke heading global. |
| .campus-heading p | Home Motion Jakarta24.9486/800,line23.5614,.05em | 205:1102 Jakarta36/800,AUTO,.05em | Keluarga/ukuran/bobot/tracking cocok dengan skala1280/1847. Perbedaan line.9444 perlu verifikasi visual, bukan otomatis ganti. |
| .campus-hotspot-label | Home Motion Jakarta max11,32×campus-unit /700,line1.25,tracking0 | 205:1130,1131,1133,1139,1144,1146,1153,1155,1169,1172 Jakarta32/700,AUTO,0 | Pertahankan alias dan skala32. Jangan terpengaruh perubahan token heading. |
| .campus-hotspot-label > span + span, subtitle RPS | max7,18×campus-unit /400,line1.222 | 205:1147 dan205:1170 Jakarta16/700,AUTO,0 | Mismatch nyata: angka18 perlu16, bobot400 perlu700. Selector saat ini terlalu luas juga menyasar span sesudah span pertama; batasi ke subtitle agar ikon/check tidak terpengaruh. |
| .campus-hint | Home Motion Jakarta20.7905/600,line31.1857,tracking0 | 205:1174 Jakarta30/600,AUTO,0 | Ukuran/bobot cocok dengan1280/1847. line1.5 berasal inheritance; bisa normal jika target screenshot membenarkan. |
| #campus-preview-title | Poppins30/700,line37.5 | Tidak ada dialog exact | Keluarga heading dapat mengikuti Jakarta, jangan menyalin nilai judul kartu32 secara otomatis. |
| .campus-preview-content > div p lokasi | Inter14/600,line20 | Tidak ada dialog exact | Ikuti keluarga body Jakarta; ukuran14 tetap. |
| .campus-preview-content p isi | Inter14/400,line22.75 | Tidak ada dialog exact | Ikuti keluarga body Jakarta; ukuran14 tetap. |
| .campus-preview-content label/select/CTA | Inter12/600 dan14/400 | Tidak ada dialog exact | Perubahan family saja bila token shared belum mencakup, pertahankan aksesibilitas/tombol. |
| Modal daftar fasilitas FasilitasPage | Heading/description melalui Modal dan body14/400 | Tidak ada dialog exact | Hindari perubahan ukuran tanpa sumber. |

## BKK

Frame328:786 memakai Jakarta untuk seluruh teks konten kecuali simbol dekoratif `>` Play20/400,.12em (328:891,892,1426). Ikon ChevronDown lokal bukan pengganti jenis font yang harus diubah. Raw Figma berikut perlu skala container BKK yang sudah max1280; sebagai contoh40 menjadi27.72px,28 menjadi19.40px. Jangan memperbesar container.

| Komponen/selector | Lokal desktop | Exact Figma sumber | Selisih |
|---|---|---|---|
| BkkSearchPanel h2 | Poppins28/800,line38.5,.025em | 328:1413 dan1380 Jakarta40/800,AUTO,.05em | Ukuran28 sudah mendekati skala27.72, family dan tracking salah. |
| BkkSearchPanel input/select (.controlClass) | Inter12/400,line16,0 | 328:859–862 dan1387–1390 Jakarta18/600,AUTO,.08em | Bobot600 dan tracking.08em hilang; scaled12.47 dekat12. |
| BkkSearchPanel submit | Inter14/600,.025em | 328:900,1386 Jakarta24/600,AUTO,.08em | Scaled16.63 versus14, tracking berbeda. |
| BkkSearchPanel chips | Inter12/600,.05em | 328:905,1393 Jakarta24/600; kategori lain328:908–954,1396–1412 Jakarta20/600; semuanya AUTO,.12em | Tracking.12em belum ada. Desain chip Semua lebih besar; jangan menyamakan data kategori yang tidak sama. |
| #lowongan-title | Poppins24/800,line32,0 | 328:894 Jakarta40/800,AUTO,.05em | Scaled27.72; family/tracking salah. |
| BkkLowonganSection article h3 role | Poppins14/700,line20,0 | 328:956–958,1002,1094 Jakarta28/700,AUTO,.05em | Scaled19.40,14 terlalu kecil. |
| article company/location p | Inter10/400 | 328:863–870,993–994 Jakarta18/600,AUTO,.08em | Scaled12.47,weight600,tracking.08em. |
| article badge spans | Inter9/600 | 328:923–944,997,1000 Jakarta20/600,AUTO,.12em | Scaled13.86,tracking.12em. |
| article salary/deadline p | Inter11/700 | 328:959–962,1003 Jakarta20/700,AUTO,.05em | Figma contoh salary, lokal memuat deadline, jadi hanya hierarchy/family dapat dipakai; jangan ganti konten/data agar cocok. |
| article Lamar Sekarang link | Inter9/700 | 328:991,1011,1086–1088 Jakarta15/800,AUTO,.12em | Scaled10.40, bobot800 dan tracking.12em. |
| BkkPklSection role h3 | Poppins12/700 | 328:1021,1037,1047,1061,1079 Jakarta28/400;1070 Jakarta24/400,AUTO,.05em | Bobot400 intentional di PKL source, berbeda dari lowongan. Scaled19.40/16.63. |
| BkkPklSection company/location p | Inter9/400 | 328:1012–1013,1028–1029,1044–1045,1052–1053 Jakarta18/400,AUTO,.08em | Scaled12.47; tracking hilang. |
| BkkPklSection kuota p | Inter10/700 | 328:1081,1183,1185 Jakarta20/700,AUTO,.05em | Scaled13.86,tracking hilang. |
| BkkPklSection kota p | Inter9/400 | 328:1080,1184,1186 Jakarta20/400,AUTO,.05em | Scaled13.86,tracking hilang. |
| BkkPklSection CTA link | Inter8/700 | 328:1026,1042,1051,1066,1074,1085 Jakarta15/400,AUTO,.12em | Scaled10.40; bobot400,tracking.12em. |
| BkkPklSection aside h2 | Poppins11/800 | 328:1192 Jakarta24/800,AUTO,.05em | Scaled16.63,tracking hilang. |
| BkkPklSection aside CTA | Inter11/700 | 328:1190 Jakarta32/800,AUTO,.05em | Scaled22.18; perlu validasi CTA layout yang sudah ada. |
| BkkJalurKarierSection h2 | Poppins20/800 | 328:835 Jakarta40/800,AUTO,.05em | Scaled27.72,tracking hilang. |
| BkkJalurKarierSection filter button | Inter10/700 | 328:810,814,831,834 Jakarta24/700,AUTO,.12em | Scaled16.63,tracking hilang. |
| BkkJalurKarierSection step h3 | Poppins11/700 | 328:815–821 Jakarta24/700,AUTO,.12em | Scaled16.63,tracking hilang. |
| BkkJalurKarierSection step p | Inter9/400,line14.625 | 328:822–827 Jakarta20/500,AUTO,.12em | Scaled13.86,weight500,tracking.12em. |
| BkkJalurKarierSection roadmap link | Inter10/700 | 328:818 Jakarta20/700,AUTO,.12em | Scaled13.86,tracking hilang. |
| BkkAlumniSection h2 | Poppins16/800 | 328:849 Jakarta32/800,AUTO,.05em | Scaled22.18,tracking hilang. |
| BkkAlumniSection name p | Poppins12/700 | 328:850,1128,1136 Jakarta24/800,AUTO,.05em | Scaled16.63,weight800,tracking.05em. |
| BkkAlumniSection meta p | Inter10/400 | 328:851,1129,1137 Jakarta20/600,AUTO,.05em | Scaled13.86,weight600,tracking.05em. |
| BkkAlumniSection role/summary p | Inter10/400 dan11/400 | 328:852–854,1130–1131,1138–1139 Jakarta18/600,AUTO,.05em | Scaled12.47,weight600,tracking.05em. |
| BkkAlumniSection tips links | Inter12/400 | 328:1169–1172 Jakarta15/700,AUTO,.05em | Scaled10.40; ukuranlokal justru lebih besar, jadi jangan blanket upscale. Bobot700/tracking.05em. |
| BkkTalentSection results card/status/empty | Body12–14/400–600,heading14/700 | Tidak ada hasil pencarian pada frame | Family Jakarta saja; jangan menambah pemetaan angka. |

## Kalender

File frontend/src/components/kalender/CalendarBoard.jsx. Hero kalender di luar section ini masuk audit shared root.

| Selector/peran | Lokal source | Figma exact | Rekomendasi |
|---|---|---|---|
| #calendar-title | Poppins30/800,line36 | 200:1271 Poppins55/700,AUTO,.05em | Poppins eksplisit; bobot700 dan tracking.05em. Judul lokal berbeda kata, typography tetap peran yang sama. |
| #calendar-title + p | Inter16/600,line24 | 200:1273 Jakarta32/700,AUTO,0 | Jakarta700, skala32. |
| #calendar-tab-calendar, #calendar-tab-list, Hari ini | Inter12/600 | 200:988,993,994 Jakarta20/700,AUTO,.12em | Jakarta700,.12em,skala20. |
| Month picker label | Inter12/600 | 200:999 Jakarta16/700,AUTO,.12em | Jakarta700,.12em,skala16. |
| Agenda Terdekat h3 | Inter12/700 | 200:1029 Jakarta16/700,AUTO,.12em | Family/tracking; ukuran16×rasio. |
| Agenda Lihat Semua button | Inter9/600 | 200:1034 Jakarta10/700,AUTO,.12em | Weight700,tracking.12em. |
| eventCard date number | Poppins16/700 | 200:1071–1074 Jakarta15/400,AUTO,.12em | Family/bobotberbeda; ukuranlokal lebih besar, jangan blanket increase. |
| eventCard month | Inter9/400 | 200:1075–1078 Jakarta7/500,AUTO,.12em | Family500/tracking.12em; readable minimum perlu dipertahankan. |
| eventCard title | Inter12/700,line19.5 | 200:1087–1090 Jakarta12/700,AUTO,.12em | Family/tracking; ukuranraw sama. |
| eventCard time/location | Inter10/400 | 200:1021–1028 Jakarta10/700,AUTO,.12em | Weight700/tracking.12em. |
| Calendar grid day numbers | Inter12/700 | 200:1069,1070,1079 Jakarta13/400;200:1080–1084 Jakarta10/400,AUTO,.12em | Family/tracking; preserve interactive current/today emphasis when applyingfont. |
| Calendar grid event title | Inter10/600 | 200:1085–1086 Jakarta6/600 dan200:1091 Jakarta10/600,1092–1096 Jakarta13/600,AUTO,.12em | Desain ukuran6 tidak layak disalin mentah; family/tracking only unless visual ratio clarified. |
| Calendar grid event time | Inter8/400 | 200:1097–1101,1112–1113 Jakarta6/600,AUTO,.12em | Family600/tracking, pertahankan readable minimum. |
| Callout h3 Jangan lewatkan | Inter12/700 | 200:1010 Jakarta16/700,AUTO,.12em | Family/tracking,scale16. |
| Callout p | Inter10/400,line16.25 | 200:1012 Jakarta11/700,AUTO,.12em | Weight700/tracking.12em. |
| Callout Lihat Semua Agenda | Inter10/600 | 200:1011 Jakarta11/700,AUTO,.12em | Weight700/tracking.12em. |
| Agenda Sekolah heading /legend | Bagian implementasi tidak identik | 200:1272 Poppins55/700,.05em;legend200:1102–1111 Jakarta8/600,.12em | Jangan membuat layout atau legend baru di tugas tipografi. |

## SPMB admin dan shell

198:782 merupakan admin. Angka berikut tidak berlaku pada SpmbPage publik. Tabel/statistik dalam screenshot tidak punya TEXT terpisah, sehingga tidak ada nilai exact yang sah untuk SpmbInformationPanel/StatCard. Seluruh admin saat ini mewarisi Inter untuk body dan Poppins untuk heading.

| Komponen/selector | Lokal | Figma exact | Rekomendasi |
|---|---|---|---|
| DashboardSidebar nav NavLink | Inter14/600,line20,0 | 198:795,811,819,824,838,842,847,854,858,866 Jakarta20/700,AUTO,.03em | Jakarta700,.03em,20×rasio sidebar yang sudah ada. |
| DashboardSidebar Menu Utama | Inter10/700,.12em | 198:793 Jakarta16/800,AUTO,.12em | Jakarta800,tracking sudahbenar. |
| DashboardSidebar contact school name | Poppins12/700 | 198:863 Jakarta18/800,AUTO,.02em | Jakarta800,.02em. |
| DashboardSidebar address | Inter11/400,line15.125 | 198:835–836 Jakarta15/600,line22,.03em | Jakarta600,.03em,line22×rasio. Website198:836 tidak ada elemen sepadan; jangan menambahnya. |
| DashboardHeader user name | Poppins12/700,line15 | 198:801 Jakarta20/700,AUTO,.03em | Jakarta700,.03em. |
| DashboardHeader user role | Inter11/400 | 198:802 Jakarta16/500,AUTO,.03em | Jakarta500,.03em. |
| #cari-admin | Inter12/400 | 198:806 Jakarta14/300,AUTO,.03em | Jakarta300,.03em,14×rasio. |
| DashboardLayout footer | Inter11/400 | 198:817 Jakarta15/600,AUTO,.02em | Jakarta600,.02em. |
| #spmb-admin-title | Poppins30/800 | 198:807 Jakarta48/800,AUTO,.03em | Jakarta800,.03em,48×rasio main. |
| #spmb-admin-title preceding Panel Admin | Inter12/600,.2em | 198:815 Jakarta18/700,AUTO,.20em | Jakarta700;tracking sudahbenar. |
| #spmb-admin-title + p | Inter14/400 | 198:808 Jakarta16/400,AUTO,.03em | Jakarta400,.03em. |
| Sidebar information icon i | Lucide Info SVG | 198:873 Podkova28/800,.03em | Ini ikon, bukan konten teks. Jangan mengganti ikon dengan font baru hanya untuk satu glyph. |
| PageHeader h1 (termasuk PengaturanPage) | Poppins24/30,800 | Hanya analog header198:807, tidak ada Pengaturan khusus | Konsisten Jakarta sesuai shell; jangan klaim exact48 untuk halaman yang tidak punyaframe. |
| PengaturanPage tabs/forms/modal | Body12–14;heading18/800 | Tidak ada frame khusus | Family shared saja; ukuran/rich functionality dipertahankan. |
| Login.jsx judul/label/CTA | Heading token danbody Inter | Tidak ada frame login pada inventaris | Family shared saja; jangan menambah proporsi desain baru. |

## Berita, pengumuman, detail, SPMB publik

Tidak ada frame berita atau detail artikel yang dapat ditunjuk sebagai sumber exact. Frame117:445 adalah daftar pengumuman dengan heading Informasi Penting Hari ini36/800,.05em; ini bukan alasan mengubah h1 artikel30 menjadi36.

Peta source lengkap agar perubahan token tetap mencakup seluruh konten:

| File/peran | Ukuran/bobot lokal desktop | Batas rekomendasi |
|---|---|---|
| DetailLayout nav/breadcrumb | 12/500 | Family Jakarta melalui shared body; pertahankan ukuran. |
| DetailLayout category/date/author | 10/700;11/400 | Sama. |
| DetailLayout h1/subtitle | 30/800;14/600 | Family heading Jakarta; tidak punya numeric Figma exact. |
| DetailLayout imageNote/lead/body/richBody | 10/400;16/500;14/400 | Family Jakarta. RichContent perlu inherit family agar data HTML tidak memulihkan fontlama. |
| DetailLayout facts dt/dd/source/back | 10/700,.025em;12/700;12/700;12/600 | Family Jakarta, tidak ada sumber angkaexact. |
| BeritaDetailKonten quote/attribution | 16/600;11/500 | Family Jakarta. |
| BeritaDetailKonten related section heading/cards | 20/800;11/700;badge9/700;date9/400 | Family Jakarta, pertahankan ukuran. |
| PengumumanDetailKonten deadline label/date/note | 10/700,.025em;20/800;11/400 | Family Jakarta, pertahankan ukuran. |
| PengumumanDetailKonten step heading/number/body | 20/800;11/700;12/400 | Family Jakarta. |
| PengumumanDetailKonten document/contact heading/body | 12/700;11/400–700 | Family Jakarta. |
| PengumumanDetailKonten related heading/item/meta/CTA | 20/800;11/700;10/400;12/600 | Family Jakarta. |
| SpmbPage section headings (.spmb-section-title) | 24/700,line1.3 | Tidak gunakan198:782; family body/heading shared saja. |
| SpmbPage info cards/timeline/schemes/table/requirements | Body10–16,heading13–20;lihatSpmbPage.css | Tidak ada frame publik, jadi pertahankan ukuran/rhythm. |

Daftar pengumuman117:445 memakai Jakarta hampir menyeluruh. Bukti semua node117:469–703 tersedia JSON; role utamanya: feature headline58/800,.05em; featuredate20/600,.05em; featuredescription16/500,.05em; sectionheading36/800,.05em; stats64/700,.05em; statlabels24/700,.05em; filters20–32/700,.05em; timeline36/700,.05em; cardsheading24/800,.05em; carddescription20/800,.05em; badges16/800,.05em; populerheading24/800,.05em; rank64/700,.05em. Ukuran-ukuran ini raw Figma dan harus memakai rasio section; perubahan family global jauh lebih aman daripada menaikkan seluruh ukuran secara seragam.

## Bukti lokal dan verifikasi

Local Playwright pada http://localhost:5181 memakai viewport1847×1080, Chromeheadless, reducedMotion. local-fasilitas.json berisi224row dan local-bkk.json209row setelah menunggu main h1. local-campus-dialog.json membuktikan dialog terbuka dan metrik font. Screenshot PNG lokal tersedia di folder evidence. Capture awal sempat mengambil Suspense sebelum konten siap; local-fasilitas/local-bkk sudahditimpa capture lengkap. local-berita.json115row dan local-pengumuman.json134row tersedia. local-kalender.json116row tidak mencakup CalendarBoard lengkap, jadi nilai kalender tabel di atas berasal inspeksi source, bukan klaim computed live.

SPMB publik/login belum dicapture tuntas karena timeout dan tekanan RAM. Browser proses milik audit ditutup sebelum audit diserahkan; tidak ada login, request mutasi, atau akses database admin dilakukan.

## Prioritas penerapan

1. Root memperbaiki keluarga/token font shared dan delivery terlebih dahulu; mayoritas body Inter dan heading Poppins pada BKK/admin/detail akan mengikuti Jakarta.
2. Lindungi keluarga Poppins eksplisit pada heading/group/filter Fasilitas dan heading kalender. Pertahankan alias Home Motion Jakarta serta simbol dekoratif Play/Podkova yang memang sesuai peran.
3. Terapkan bobot/tracking page-specific yang ditunjuk exactnode, terutama group/facility card, BKK, dan shell admin. Ukuran mengikuti rasio container existing dan min font yang terbaca.
4. Perubahan nyata SchoolTour subtitle RPS:18→16 unit dan400→700. Heading/peta lain sudahpunya skala desain; jangan reset ke ukuran heading generik.
5. Detail/login/SPMBpublik tanpaframe: family consistency saja. QA lokal serialized oleh root setelah implementasi; janganmengklaim produksi/device verified dari audit ini.

Belum dicek: login/admin terautentikasi, device mobile, serta pixel match produksi. Risiko: angka mentah1847px akan membesarkan konten bila diterapkan tanpa rasio container; keluarga Poppins yang disengaja harusdipertahankan ketika token global beralih Jakarta.
