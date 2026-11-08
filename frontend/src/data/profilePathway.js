// Copy and artwork from Figma 415:6487; program names remain the same in ID/EN.
import digital from '../assets/tentang/profile/pillar-digital.svg';
import global from '../assets/tentang/profile/pillar-global.svg';
import industry from '../assets/tentang/profile/pillar-industry.svg';
import founder from '../assets/tentang/profile/pathway-founder.png';
import scholar from '../assets/tentang/profile/pathway-scholar.png';
import professional from '../assets/tentang/profile/pathway-professional.png';

export const profileMissions = [
  ['Menyelenggarakan pendidikan vokasi berbasis ', 'industri dan teknologi masa depan.', ''],
  ['Mencetak lulusan yang ', 'kompeten, berkarakter,', ' dan berdaya saing global.'],
  ['Mengembangkan ekosistem ', 'smart school modern & adaptif.', ''],
  ['Memperkuat kemitraan dengan industri teknologi ', 'nasional dan global.', ''],
  ['Menumbuhkan ', 'kreativitas, inovasi,', ' dan kepemimpinan melalui project-based learning.'],
];

export const profilePillars = [
  { title: 'Digital Skills', desc: 'Keterampilan digital melalui praktik proyek.', icon: digital },
  { title: 'Global Exposure', desc: 'Bahasa Inggris dan pengalaman lintas negara.', icon: global },
  { title: 'Industry Partnership', desc: 'Pembelajaran yang terhubung dengan dunia kerja.', icon: industry },
];

export const profilePathways = [
  {
    title: 'The Founder', image: founder, variant: 'founder',
    alt: 'Siswa SMK Telkom Purwokerto membawa buku untuk jalur The Founder',
    description: 'Jalur bagi kreator yang ingin memiliki bisnis digital. Siswa mendapatkan pendampingan magang imersif 6 bulan di industri, pembuatan legalitas usaha, financial projection, hingga presentasi bisnis di depan investor. Goal: Lulus langsung punya Startup sendiri.',
  },
  {
    title: 'The Scholar', image: scholar, variant: 'scholar',
    alt: 'Siswi SMK Telkom Purwokerto membawa buku untuk jalur The Scholar',
    description: 'Persiapan intensif masuk Perguruan Tinggi favorit Nasional dan Global. Fokus pada bimbingan UTBK, persiapan TOEFL/IELTS, serta pendampingan penulisan Esai Motivasi untuk tembus ke kampus impian seperti Telkom University, UGM, ITB, hingga Universitas Luar Negeri.',
  },
  {
    title: 'Professional', image: professional, variant: 'professional',
    alt: 'Siswi SMK Telkom Purwokerto menyapa untuk jalur Professional',
    description: 'Langkah cepat menjadi tenaga ahli profesional. Berbekal sertifikasi kompetensi standar dunia (Cisco/Mikrotik) dan portofolio karya nyata, lulusan kami siap diserap langsung oleh ekosistem Telkom Indonesia, BUMN, serta Startup Unicorn seperti Tokopedia dan Bukalapak.',
  },
];
