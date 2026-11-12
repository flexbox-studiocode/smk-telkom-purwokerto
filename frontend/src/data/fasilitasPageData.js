import { classroomPhotoCovers } from './classroomPhotoCovers';
import { facilityPhotoCovers } from './facilityPhotoCovers';

// Inventory follows Figma 242:499 and the user's classroom corrections.
// Room texts keep the meaning of the four supplied descriptions, reworded per building so no two rooms share a sentence.
const classroomPreviews = {
  A: [
    'Kelas modern yang dilengkapi teknologi belajar lengkap dan pencahayaan terang agar mata tidak mudah lelah.',
    'Kelas yang dirancang sangat rapi dan tenang agar siswa bisa fokus belajar tanpa gangguan.',
    'Kelas dengan tata letak fleksibel yang memudahkan siswa untuk saling berdiskusi dan kerja kelompok.',
    'Kelas yang sejuk, bersih, dan tenang sehingga suasananya sangat ideal untuk mendukung konsentrasi belajar.',
  ],
  B: [
    'Ruang kelas dengan teknologi belajar yang lengkap dan penerangan terang sehingga mata tidak cepat lelah.',
    'Ruang kelas yang tertata rapi dan tenang agar siswa dapat fokus belajar tanpa terganggu.',
    'Ruang kelas dengan tata letak yang fleksibel sehingga mudah dipakai untuk diskusi dan kerja kelompok.',
    'Ruang kelas yang sejuk, bersih, dan tenang sehingga mendukung konsentrasi belajar.',
  ],
  C: [
    'Kelas berpencahayaan terang dan berteknologi belajar lengkap, sehingga mata tidak mudah lelah saat belajar.',
    'Kelas dengan suasana tenang dan tata ruang yang rapi, sehingga siswa bisa fokus tanpa gangguan.',
    'Kelas bertata letak fleksibel, memudahkan siswa berdiskusi dan mengerjakan tugas kelompok.',
    'Kelas dengan suasana sejuk, bersih, dan tenang yang membantu siswa berkonsentrasi.',
  ],
  D: [
    'Kelas yang terang, dengan teknologi belajar lengkap agar mata tidak mudah lelah saat pelajaran.',
    'Kelas yang rapi dan tenang, dirancang supaya siswa tetap fokus saat belajar.',
    'Kelas dengan susunan ruang yang fleksibel untuk mendukung diskusi serta kerja kelompok.',
    'Kelas yang sejuk, bersih, dan tenang, cocok untuk belajar yang membutuhkan konsentrasi.',
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
  ['Lab. TJA', 'Ruang praktik untuk mempelajari sistem dan jaringan akses telekomunikasi.'],
];
// Neutral on purpose: only the name and the map side are verified, not the equipment or the programs that use the room.
const practiceRoom = { Utara: ['RPS. Utara', 'Ruang Praktik Siswa (RPS) Utara, ruang yang digunakan siswa untuk kegiatan belajar praktik.'], Selatan: ['RPS. Selatan', 'Ruang Praktik Siswa (RPS) Selatan, ruang yang digunakan siswa untuk kegiatan belajar praktik.'] };
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
  ['Lapangan Basket', 'Lapangan basket di area Gedung Olahraga (GOR) untuk latihan dan permainan siswa.'],
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
