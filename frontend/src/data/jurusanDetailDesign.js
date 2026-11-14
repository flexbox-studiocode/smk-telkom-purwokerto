import rplHero from '../assets/jurusan-detail/rpl-hero.webp';
import pgHero from '../assets/jurusan-detail/pg-hero.webp';
import tkjHero from '../assets/jurusan-detail/tkj-hero.webp';
import tjatHero from '../assets/jurusan-detail/tjat-hero.webp';
import rplLab from '../assets/jurusan-detail/rpl-lab.webp';
import library from '../assets/jurusan-detail/library.webp';
import rplClass from '../assets/jurusan-detail/rpl-class.webp';
import pgDlg from '../assets/jurusan-detail/pg-dlg.webp';
import pgLab from '../assets/jurusan-detail/pg-lab.webp';
import pgStudio from '../assets/jurusan-detail/pg-studio.webp';
import tkjLab from '../assets/jurusan-detail/tkj-lab.webp';
import tkjClass from '../assets/jurusan-detail/tkj-class.webp';
import tjatLab from '../assets/jurusan-detail/tjat-lab.webp';
import tjatClass from '../assets/jurusan-detail/tjat-class.webp';

const libraryDescription = 'Menyediakan koleksi buku cetak, serta ruang baca yang tenang dan nyaman untuk mendukung literasi mandiri.';
const labDescription = 'Dilengkapi perangkat terbaru dengan spesifikasi tinggi untuk mendukung praktik pengembangan software.';
const character = 'Membentuk karakter disiplin dan kolaboratif.';
const project = 'Proyek mini dan praktik industri.';
const internship = 'Magang/Praktik Kerja Lapangan (PKL).';
const certification = 'Persiapan sertifikasi dan dunia kerja.';

// Frame Figma 225:10916, 225:12486, 225:11486, 225:11972.
// Identitas, sertifikasi, dan prospek karier tetap berasal dari data jurusan existing.
export const jurusanDetailDesign = {
  rpl: {
    code: 'RPL', hero: rplHero, heroWidth: 1927, heroHeight: 1084,
    heroAlt: 'Siswa RPL mempraktikkan pemrograman di laboratorium komputer',
    description: 'Membangun aplikasi web dan mobile dari nol sampai siap digunakan di dunia industri, dirancang terstruktur untuk menjawab kebutuhan bisnis secara nyata.',
    about: [
      'RPL (Rekayasa Perangkat Lunak) adalah jurusan yang berfokus pada pengembangan perangkat lunak berbasis alur kerja industri, mulai dari menerjemahkan kebutuhan pengguna, menulis kode, menguji, sampai merilis aplikasi.',
      'Selama tiga tahun, siswa dibekali dengan keterampilan pemrograman, struktur data, basis data relasional, sampai pengembangan aplikasi web dan mobile. Setiap materi dibuat selaras dengan kebutuhan dunia kerja, sehingga lulusan RPL siap bersaing di industri teknologi dan digital.',
    ],
    quote: 'Di RPL, kamu tidak hanya belajar coding, tapi juga membangun solusi untuk masa depan.',
    facilitiesDescription: 'Kami menyediakan fasilitas dan lingkungan belajar terbaik untuk mendukung proses pembelajaran RPL agar lebih nyaman, kreatif, dan produktif.',
    facilities: [
      { title: 'Laboratorium Komputer', image: rplLab, description: labDescription },
      { title: 'Perpustakaan', image: library, description: libraryDescription },
      { title: 'Ruang Kelas', image: rplClass, description: 'Ruang belajar interaktif yang dilengkapi fasilitas multimedia modern untuk menciptakan suasana belajar yang kondusif.' },
    ],
    journey: [
      ['Dasar pemrograman, algoritma, logika dan pengenalan dunia IT.', character],
      ['Pemrograman tingkat lanjut, database, dan pengembangan web.', project],
      ['Pengembangan aplikasi web & mobile.', internship, certification],
    ],
  },
  pg: {
    code: 'PG', hero: pgHero, heroWidth: 1920, heroHeight: 1080,
    heroAlt: 'Siswa PG mempraktikkan pengembangan game dan virtual reality',
    description: 'Merancang dan mengembangkan game interaktif dari nol sampai siap dirilis di dunia industri, dirancang terstruktur untuk menghadirkan pengalaman digital dan kebutuhan industri kreatif secara nyata.',
    about: [
      'PG (Pengembangan Game) adalah jurusan yang berfokus pada perancangan dan pembuatan game interaktif berbasis alur kerja industri, mulai dari penyusunan konsep dan cerita, pembuatan aset visual 2D/3D, pemrograman logika game, hingga pengujian dan publikasi.',
      'Selama tiga tahun, siswa dibekali dengan keterampilan game design, pemrograman game engine, pemodelan 3D, animasi, sampai pengembangan game berbasis mobile dan PC. Setiap materi dibuat selaras dengan kebutuhan dunia kerja, sehingga lulusan PG siap bersaing di industri kreatif dan game digital.',
    ],
    quote: 'Di PG, kamu tidak hanya bermain game, tapi menciptakan dunia interaktif untuk masa depan.',
    facilitiesDescription: 'Kami menyediakan fasilitas dan lingkungan belajar terbaik untuk mendukung proses pembelajaran PG agar lebih ekspresif, inovatif, dan penuh karya.',
    facilities: [
      { title: 'Laboratorium Komputer', image: pgLab, description: labDescription },
      { title: 'DLG', image: pgDlg, description: 'Ruang untuk memicu kreativitas dan riset dalam membangun jalan cerita (storyline) atau konsep game yang menarik.' },
      { title: 'Studio Multimedia', image: pgStudio, description: 'Fasilitas untuk mendukung kebutuhan produksi audio, sound effect, dan pengisian suara (voice acting).' },
    ],
    journey: [
      ['Dasar game design, logika pemrograman, dan pengenalan aset 2D/3D.', character],
      ['Pemrograman game engine, animasi, serta desain level & audio.', project],
      ['Pengembangan game siap rilis (PC/Mobile) & publikasi.', internship, certification],
    ],
  },
  tkj: {
    code: 'TKJ', hero: tkjHero, heroWidth: 1920, heroHeight: 1098,
    heroAlt: 'Siswa TKJ melakukan praktik konfigurasi jaringan pada rak perangkat',
    description: 'Membangun dan mengelola infrastruktur jaringan dari nol sampai siap digunakan di dunia industri, dirancang terstruktur untuk menjawab kebutuhan konektivitas bisnis secara nyata.',
    about: [
      'TKJ (Teknik Komputer dan Jaringan) adalah jurusan yang berfokus pada pengelolaan infrastruktur IT berbasis alur kerja industri, mulai dari merakit perangkat, mengonfigurasi jaringan, menjaga keamanan data, hingga merawat sistem komputer.',
      'Selama tiga tahun, siswa dibekali dengan keterampilan perakitan perangkat, pengalamatan IP, administrasi server, sampai pengelolaan keamanan jaringan. Setiap materi dibuat selaras dengan kebutuhan dunia kerja, sehingga lulusan TKJ siap bersaing di industri teknologi dan infrastruktur digital.',
    ],
    quote: 'Di TKJ, kamu tidak hanya belajar merangkai jaringan, tapi juga menghubungkan dunia untuk masa depan.',
    facilitiesDescription: 'Kami menyediakan fasilitas dan lingkungan belajar terbaik untuk mendukung proses pembelajaran TKJ agar lebih interaktif, terstruktur, dan siap kerja.',
    facilities: [
      { title: 'Laboratorium', image: tkjLab, description: 'Fasilitas laboratorium komputer modern yang dirancang khusus untuk praktik perakitan perangkat keras dan konfigurasi server.' },
      { title: 'Ruang Praktik TKJ', image: rplLab, description: 'Tempat siswa melakukan praktik komputer, konfigurasi jaringan, dan demonstrasi hasil proyek.' },
      { title: 'Ruang Kelas', image: tkjClass, description: 'Ruang kelas atau laboratorium TKJ adalah ruang belajar interaktif yang dirancang khusus menyerupai lingkungan kerja IT.' },
    ],
    journey: [
      ['Dasar komputer, jaringan dasar, sistem operasi, dan pengenalan dunia IT.', character],
      ['Administrasi server, konfigurasi routing & switching, serta keamanan jaringan.', project],
      ['Pengelolaan jaringan skala besar & cloud computing.', internship, certification],
    ],
  },
  tjat: {
    code: 'TJAT', hero: tjatHero, heroWidth: 1920, heroHeight: 1080,
    heroAlt: 'Siswa TJAT berlatih instalasi perangkat jaringan telekomunikasi',
    description: 'Merancang dan menginstalasi jaringan telekomunikasi dari nol sampai siap digunakan di dunia industri, dirancang terstruktur untuk mendukung sistem komunikasi bisnis secara nyata.',
    about: [
      'TJAT (Teknik Jaringan Akses Telekomunikasi) adalah jurusan yang berfokus pada pengelolaan infrastruktur jaringan telekomunikasi berbasis alur kerja industri, mulai dari instalasi kabel fiber optik, konfigurasi perangkat akses, pengujian sinyal, hingga pemeliharaan sistem komunikasi.',
      'Selama tiga tahun, siswa dibekali dengan keterampilan transmisi data, konfigurasi jaringan akses, teknologi fiber optik, sampai pengelolaan sistem telekomunikasi modern. Setiap materi dibuat selaras dengan kebutuhan dunia kerja, sehingga lulusan TJAT siap bersaing di industri telekomunikasi dan konektivitas digital.',
    ],
    quote: 'Di TJAT, kamu tidak hanya belajar menghubungkan kabel, tapi juga merangkai jalur komunikasi.',
    facilitiesDescription: 'Kami menyediakan fasilitas dan lingkungan belajar terbaik untuk mendukung proses pembelajaran TJAT agar lebih aplikatif, kondusif, dan berstandar industri.',
    facilities: [
      { title: 'Laboratorium', image: tjatLab, description: 'Fusion splicer untuk praktik penyambungan fiber; OTDR dan power meter untuk pengukuran jalur.' },
      { title: 'Perpustakaan', image: library, description: libraryDescription },
      { title: 'Ruang Kelas', image: tjatClass, description: 'Ruang kelas TJAT Telkom Schools dirancang sebagai laboratorium interaktif modern.' },
    ],
    journey: [
      ['Dasar telekomunikasi, transmisi data, dan pengenalan jaringan akses.', character],
      ['Instalasi fiber optik, pengujian sinyal, dan sistem komunikasi nirkabel.', project],
      ['Pemeliharaan jaringan akses telekomunikasi & infrastruktur broadband.', internship, certification],
    ],
  },
};
