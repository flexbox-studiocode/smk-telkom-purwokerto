import upacara from '../assets/kalender/categories/upacara-nasional.svg';
import penilaian from '../assets/kalender/categories/penilaian-siswa.svg';
import liburTahun from '../assets/kalender/categories/libur-tahun-pelajaran.svg';
import pkl from '../assets/kalender/categories/awal-pkl.svg';
import hariPertama from '../assets/kalender/categories/hari-pertama-sekolah.svg';
import hut from '../assets/kalender/categories/hut-smk.svg';
import liburSemester from '../assets/kalender/categories/libur-akhir-semester.svg';
import kelulusan from '../assets/kalender/categories/perkiraan-kelulusan.svg';
import cuti from '../assets/kalender/categories/cuti-bersama.svg';
import ramadhan from '../assets/kalender/categories/libur-ramadhan.svg';

// Figma ca2iX76GpJSr0QC7Qyv9RV, 196:568–577 / 196:752–761; order is left-to-right per row.
// Keep literal Tailwind classes here so Vite can discover them. Only the stable ID is persisted.
export const eventCategories = [
  { value: 'upacara-nasional', label: 'Upacara Hari Nasional', color: '#FF0033', order: 1, indicator: upacara, badgeClass: 'bg-[#FF0033]/10 text-dark-800' },
  { value: 'penilaian-siswa', label: 'Penilaian Siswa (TKA, PSAS, PSAJ)', color: '#0080FF', order: 2, indicator: penilaian, badgeClass: 'bg-[#0080FF]/10 text-dark-800' },
  { value: 'libur-tahun-pelajaran', label: 'Libur Tahun Pelajaran', color: '#A22828', order: 3, indicator: liburTahun, badgeClass: 'bg-[#A22828]/10 text-dark-800' },
  { value: 'awal-pkl', label: 'Awal praktek kerja industri', color: '#B5651D', order: 4, indicator: pkl, badgeClass: 'bg-[#B5651D]/10 text-dark-800' },
  { value: 'hari-pertama-sekolah', label: 'Hari Pertama masuk sekolah', color: '#F2FF00', order: 5, indicator: hariPertama, badgeClass: 'bg-[#F2FF00]/10 text-dark-800' },
  { value: 'hut-smk', label: 'HUT SMK', color: '#CFB53B', order: 6, indicator: hut, badgeClass: 'bg-[#CFB53B]/10 text-dark-800' },
  { value: 'libur-akhir-semester', label: 'Libur Akhir Semester', color: '#B300FF', order: 7, indicator: liburSemester, badgeClass: 'bg-[#B300FF]/10 text-dark-800' },
  { value: 'perkiraan-kelulusan', label: 'Perkiraan Kelulusan', color: '#FF9500', order: 8, indicator: kelulusan, badgeClass: 'bg-[#FF9500]/10 text-dark-800' },
  { value: 'cuti-bersama', label: 'Cuti bersama', color: '#16B900', order: 9, indicator: cuti, badgeClass: 'bg-[#16B900]/10 text-dark-800' },
  { value: 'libur-ramadhan', label: 'Libur awal Ramadhan', color: '#8CF97D', order: 10, indicator: ramadhan, badgeClass: 'bg-[#8CF97D]/10 text-dark-800' },
];

const neutral = { color: '#6B7280', badgeClass: 'bg-dark-100 text-dark-800', legacy: true };
export const legacyEventCategories = [
  { value: 'kegiatan', label: 'Kegiatan Sekolah' }, { value: 'akademik', label: 'Akademik' },
  { value: 'lomba', label: 'Lomba' }, { value: 'karier', label: 'Karier' }, { value: 'lainnya', label: 'Lainnya' },
].map(category => ({ ...neutral, ...category, label: `${category.label} (kategori lama)` }));

export function getEventCategory(value) {
  const normalized = String(value || '').replace(/_/g, '-');
  return eventCategories.find(category => category.value === normalized)
    || legacyEventCategories.find(category => category.value === normalized)
    || { ...neutral, value: normalized, label: normalized ? `Kategori belum dikenali: ${normalized}` : 'Kategori belum ditentukan' };
}
