import { classroomPhotoCovers } from './classroomPhotoCovers';
import { facilityPhotoCovers } from './facilityPhotoCovers';

// Inventory follows Figma 242:499 and the user's classroom corrections.
// Each building gets its own facets taken from its supplied building description (A: light and air, desks, devices, focus; B: quiet,
// theory and discussion, devices, space; C: collaboration, groups, presentations, technology; D: spacious, devices, focus, space).
const classroomPreviews = {
  A: [
    'Ruang kelas di Gedung A dengan pencahayaan alami yang baik dan sirkulasi udara yang lancar.',
    'Meja dan kursi di ruang kelas Gedung A ditata rapi.',
    'Proyektor, papan tulis, dan internet di Gedung A dipakai untuk pembelajaran digital.',
    'Ruang kelas bersih tempat siswa Gedung A dapat fokus, bertanya, dan berdiskusi dengan guru maupun teman.',
  ],
  B: [
    'Lingkungan yang tenang dan tertata di Gedung B membantu siswa berkonsentrasi penuh saat pelajaran.',
    'Ruang kelas Gedung B yang dipakai untuk pelajaran teori sekaligus diskusi kelompok siswa.',
    'Fasilitas pendukung Gedung B mencakup proyektor, papan tulis, dan jaringan internet.',
    'Setiap kelas di Gedung B mendapat ruang yang cukup untuk menjalankan kegiatan belajar mengajar secara teratur.',
  ],
  C: [
    'Gedung C mendukung pembelajaran aktif dan kolaboratif di ruang kelas yang fleksibel.',
    'Siswa bisa berdiskusi dan bekerja dalam kelompok di ruang kelas Gedung C.',
    'Presentasi dan proyek bersama dikerjakan siswa di ruang kelas Gedung C.',
    'Teknologi pendukung di Gedung C membantu guru menyampaikan materi dengan cara yang lebih menarik.',
  ],
  D: [
    'Kelas-kelas di Gedung D berukuran luas, bersih, dan tertata rapi.',
    'Tiap ruangan di Gedung D dilengkapi proyektor, papan tulis, serta akses internet.',
    'Siswa Gedung D dapat tetap fokus, aktif berdiskusi, dan lebih mudah menyerap materi pelajaran.',
    'Gedung D melengkapi deretan gedung kelas sekolah dengan ruang yang cukup bagi setiap kelas.',
  ],
};
const aliases = { 'Kelas C 2.1': 'Kelas C 2.2', 'Kelas D 2.2': 'Kelas D 2.1', 'Lab. RPL': 'Lab. TKJ' };
const section = (id, title, names) => ({
  id, title,
  items: names.map((entry, index) => {
    const [name, preview] = entry;
    const photoKey = aliases[name] || name;
    const photos = classroomPhotoCovers[photoKey] || facilityPhotoCovers[photoKey];
    return { id: `${id}-${index + 1}`, name, image: photos[0].src, photos, preview, photoKey,
      classroomGallery: Boolean(classroomPhotoCovers[photoKey]),
      // Internal QA note, not shown to visitors: the compass direction of each Parkiran photo is not verified yet.
      photoNote: aliases[name] ? 'Foto ruangan ini belum tersedia. Foto yang ditampilkan berasal dari {name}.' : null,
    };
  }),
});
const rooms = {
  A: ['1.4', '2.2', '3.4', '3.6'], B: ['1.4', '1.5', '2.3', '2.5'],
  C: ['2.2', '2.1', '3.2', '3.1'], D: ['1.2', '2.1', '2.2', '3.1'],
};
const classroomNames = building => rooms[building].map((room, index) => [`Kelas ${building} ${room}`, classroomPreviews[building][index]]);
const labs = [
  ['Lab. Robotik', 'Ruang praktik tempat siswa merakit, memprogram, dan menguji robot untuk mempelajari dasar otomasi.'],
  ['Lab. RPL', 'Ruang praktik nyaman yang mendukung proses pemrograman dan pengembangan perangkat lunak'],
  ['Lab. TKJ', 'Ruang praktik untuk mempelajari jaringan komputer secara langsung.'],
  ['Lab. TJA', 'Lab tempat siswa belajar sistem dan jaringan akses telekomunikasi.'],
];
// Neutral on purpose: only the name and the map side are verified, not the equipment or the programs that use the room.
const practiceRoom = { Utara: ['RPS. Utara', 'Ruang Praktik Siswa (RPS) Utara, tempat belajar praktik bagi siswa.'], Selatan: ['RPS. Selatan', 'Siswa mengikuti kegiatan belajar praktik di Ruang Praktik Siswa (RPS) Selatan.'] };
const library = [
  ['Rak Tas', 'Rak untuk menyimpan tas pengunjung perpustakaan dengan rapi.'],
  ['DLG', 'Digital Literacy Garden (DLG), area literasi digital untuk mencari referensi dan mendukung riset.'],
  ['Tempat Baca', 'Area untuk membaca, belajar mandiri, dan berdiskusi.'],
  ['Rak Buku', 'Rak koleksi buku dan referensi belajar perpustakaan.'],
];
const hall = [
  ['Panggung', 'Panggung permanen di bagian depan aula untuk pengisi acara, pembicara seminar, dan penampilan seni siswa.'],
  ['Halaman Depan', 'Wajah utama sekolah yang menyambut Anda dengan galeri kegiatan dan agenda terupdate.'],
  ['Area Integrasi GOR', 'Aula ini juga berfungsi sebagai Gedung Olahraga (GOR) indoor dengan lapangan serbaguna untuk kegiatan olahraga siswa.'],
  ['Ruangan yang Luas', 'Ruangan lapang berfungsi ganda yang dapat disiapkan sebagai aula pertemuan besar untuk seminar atau acara kelulusan.'],
];
const sports = [
  ['Lapangan Futsal', 'Lapangan futsal indoor di Gedung Olahraga (GOR) untuk latihan dan pertandingan.'],
  ['Lapangan Basket', 'Siswa berlatih dan bermain basket di lapangan area Gedung Olahraga (GOR).'],
  ['Toilet', 'Toilet untuk pengguna Gedung Olahraga (GOR) di area olahraga.'],
  ['Pintu Masuk', 'Akses utama yang luas dan ramah disabilitas menuju area tribun maupun lapangan.'],
];
const parking = [
  ['Parkiran Timur', 'Area parkir kendaraan yang luas dan tertata rapi di sisi timur'],
  ['Parkiran Utara', 'Fasilitas parkir yang aman dan nyaman untuk kendaraan di area utara'],
  ['Parkiran Selatan', 'Lahan parkir teratur yang memudahkan akses menuju gedung bagian selatan'],
  ['Parkiran Barat', 'Area parkir yang tertata bersih dan mendukung ketertiban lingkungan sekolah'],
];

export const fasilitasViews = {
  Semua: [
    section('semua-lab', 'Laboratorium', labs),
    section('semua-kelas', 'Ruang Kelas', classroomNames('B')),
    section('semua-perpustakaan', 'Perpustakaan', library),
    section('semua-aula', 'Aula', hall),
    section('semua-gor', 'GOR', sports),
    section('semua-parkiran', 'Parkiran', parking),
  ],
  Laboratorium: [section('lab', '', [labs[0], labs[2], labs[3], labs[1], practiceRoom.Utara, practiceRoom.Selatan])],
  Kelas: Object.keys(rooms).map(building => section(`kelas-${building.toLowerCase()}`, `Kelas Gedung ${building}`, classroomNames(building))),
  // Photo folders prove the split: Rak Tas, Tempat Baca and Rak Buku come from "Foto Kelas/Perpustakaan" (6 photos), DLG from "Foto Kelas/DLG".
  Perpustakaan: [section('perpustakaan', 'Ruang Perpustakaan', library.filter(([name]) => name !== 'DLG')), section('literasi', 'Digital Literacy Garden', library.filter(([name]) => name === 'DLG'))],
  Aula: [section('aula', '', hall)],
  GOR: [section('gor', '', sports)],
  Parkiran: [section('parkiran', '', parking)],
};
export const fasilitasCategories = Object.keys(fasilitasViews);
