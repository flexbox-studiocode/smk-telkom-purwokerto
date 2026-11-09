import project from '../assets/tentang/profile/learning-project.webp';
import digital from '../assets/tentang/profile/learning-digital.webp';
import book from '../assets/tentang/profile/learning-book.svg';
import processor from '../assets/tentang/profile/learning-processor.webp';
import foundation from '../assets/tentang/profile/learning-foundation.webp';
import skills from '../assets/tentang/profile/learning-skills.webp';
import career from '../assets/tentang/profile/learning-career.webp';
import { navLinks } from './dummyData';

// URL diambil dari dropdown Layanan di Navbar (satu sumber). DITA tidak ada di dropdown, jadi URL-nya eksplisit di sini.
const serviceHref = (label) => navLinks.find(item => item.label === 'Layanan')?.children.find(child => child.label === label)?.href;
const platform = (label, serviceLabel = label) => ({ label, href: serviceHref(serviceLabel) });
const ditaHref = 'https://igracias.telkomschools.sch.id/ts/login/';

export const learningMethods = [
  {
    image: project, width: 852, height: 420, icon: book,
    alt: 'Presentasi proyek siswa', title: 'Belajar lewat proyek nyata',
    description: 'Mengasah keterampilan, kolaborasi, dan karakter melalui Project-Based Learning.',
  },
  {
    image: digital, width: 776, height: 406, icon: processor,
    alt: 'Kolaborasi digital siswa', title: 'Terhubung secara digital',
    description: 'Satu ekosistem untuk mendukung proses belajar.',
    platforms: [platform('LMS', 'Mylms'), platform('JUARA'), platform('LIONS'), { label: 'DITA', href: ditaHref }],
  },
];

export const learningStages = [
  { icon: foundation, grade: 'Kelas X', title: 'Bangun Fondasi', description: 'Dasar kompetensi dan eksplorasi minat' },
  { icon: skills, grade: 'Kelas XI', title: 'Asah Keahlian', description: 'Sertifikasi dan proyek industri' },
  { icon: career, grade: 'Kelas XII', title: 'Siap Berkarya', description: 'Capstone project, magang, dan portofolio' },
];
