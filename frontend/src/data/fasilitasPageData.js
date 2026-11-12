import { classroomPhotoCovers } from './classroomPhotoCovers';
import { facilityPhotoCovers } from './facilityPhotoCovers';

// Inventory follows Figma 242:499 and the user's classroom corrections.
const previews = [
  'Kelas modern yang dilengkapi teknologi belajar lengkap dan pencahayaan terang agar mata tidak mudah lelah.',
  'Kelas yang dirancang sangat rapi dan tenang agar siswa bisa fokus belajar tanpa gangguan.',
  'Kelas dengan tata letak fleksibel yang memudahkan siswa untuk saling berdiskusi dan kerja kelompok.',
  'Kelas yang sejuk, bersih, dan tenang sehingga suasananya sangat ideal untuk mendukung konsentrasi belajar.',
];
const aliases = { 'Kelas C 2.1': 'Kelas C 2.2', 'Kelas D 2.2': 'Kelas D 2.1', 'Lab. RPL': 'Lab. TKJ' };
const section = (id, title, names) => ({
  id, title,
  items: names.map((entry, index) => {
    const [name, preview = previews[index % previews.length]] = Array.isArray(entry) ? entry : [entry];
    const photoKey = aliases[name] || name;
    const photos = classroomPhotoCovers[photoKey] || facilityPhotoCovers[photoKey];
    return { id: `${id}-${index + 1}`, name, image: photos[0].src, photos, preview, photoKey,
      classroomGallery: Boolean(classroomPhotoCovers[photoKey]),
      photoNote: aliases[name] ? 'Foto ruangan ini belum tersedia. Foto yang ditampilkan berasal dari {name}.' : name.startsWith('Parkiran ') ? 'Dokumentasi area parkir sekolah; arah lokasi pada foto belum terverifikasi.' : null,
    };
  }),
});
const rooms = {
  A: ['1.4', '2.2', '3.4', '3.6'], B: ['1.4', '1.5', '2.3', '2.5'],
  C: ['2.2', '2.1', '3.2', '3.1'], D: ['1.2', '2.1', '2.2', '3.1'],
};
const classroomNames = building => rooms[building].map(room => `Kelas ${building} ${room}`);
const labs = [
  ['Lab. Robotik', 'Fasilitas praktik modern untuk merancang dan menguji inovasi teknologi robotika'],
  ['Lab. RPL', 'Ruang praktik nyaman yang mendukung proses pemrograman dan pengembangan perangkat lunak'],
  ['Lab. TKJ', 'Fasilitas interaktif untuk mendalami jaringan komputer dan kolaborasi tim'],
  ['Lab. TJA', 'Ruang belajar kondusif untuk memahami konsep serta sistem telekomunikasi modern'],
];
const library = [
  ['Rak Tas', 'Fasilitas penyimpanan tas yang rapi dan aman untuk menjaga kenyamanan pengunjung'],
  ['DLG', 'Area khusus akses literasi digital untuk mendukung riset dan pencarian referensi'],
  ['Tempat Baca', 'Area baca yang nyaman dan kondusif untuk belajar mandiri maupun diskusi'],
  ['Rak Buku', 'Koleksi buku dan referensi belajar yang tersusun rapi serta mudah diakses'],
];
const hall = [
  ['Panggung', 'Area permanen yang cukup luas di bagian depan untuk pengisi acara, pembicara seminar, podium, atau tempat penampilan seni siswa.'],
  ['Halaman Depan', 'Wajah utama sekolah yang menyambut Anda dengan galeri kegiatan dan agenda terupdate.'],
  ['Area Integrasi GOR', 'Aula ini juga terintegrasi sebagai Gedung Olahraga (GOR) Indoor yang memiliki lapangan serbaguna untuk olahraga siswa'],
  ['Ruangan yang Luas', 'Ruangan ini dirancang sangat lapang dengan konsep dual-fungsi, sehingga bisa bertransformasi menjadi aula pertemuan besar yang menampung ratusan kursi saat acara seminar atau kelulusan'],
];
const sports = [
  ['Lapangan Futsal', 'Lapangan indoor standar dengan lantai berkualitas dan pencahayaan optimal untuk pertandingan.'],
  ['Lapangan Basket', 'Area bermain yang luas, dilengkapi ring standar dan garis lapangan yang jelas.'],
  ['Toilet', 'Fasilitas sanitasi yang bersih, nyaman, dan terawat di area olahraga.'],
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
  Laboratorium: [section('lab', '', [labs[0], labs[2], labs[3], labs[1], ['RPS. Utara', 'Ruang Praktik Siswa'], ['RPS. Selatan', 'Ruang Praktik Siswa']])],
  Kelas: Object.keys(rooms).map(building => section(`kelas-${building.toLowerCase()}`, `Kelas Gedung ${building}`, classroomNames(building))),
  // Photo folders prove the split: Rak Tas, Tempat Baca and Rak Buku come from "Foto Kelas/Perpustakaan" (6 photos), DLG from "Foto Kelas/DLG".
  Perpustakaan: [section('perpustakaan', 'Ruang Perpustakaan', library.filter(([name]) => name !== 'DLG')), section('literasi', 'Digital Literacy Garden', library.filter(([name]) => name === 'DLG'))],
  Aula: [section('aula', '', hall)],
  GOR: [section('gor', '', sports)],
  Parkiran: [section('parkiran', '', parking)],
};
export const fasilitasCategories = Object.keys(fasilitasViews);
