import { ctaMasukPpdb, heroData, jurusanHero, landingHero, prestasiHero, bkkHero, beritaHero, pengumumanHero, ppdbMeta } from './dummyData';
import facilities640 from '../assets/fasilitas/hero-640.webp';
import facilities960 from '../assets/fasilitas/hero-960.webp';
import facilities from '../assets/fasilitas/hero-1144.webp';
import facilitiesLogo from '../assets/fasilitas/hero-logo.png';
import departments from '../assets/drive/jurusan-hero-artwork.webp';
import achievements640 from '../assets/banners/prestasi-640.webp';
import achievements960 from '../assets/banners/prestasi-960.webp';
import profileEnglish from '../assets/tentang/profil-hero-en.jpeg';
import teachers from '../assets/tentang/guru-page-hero.webp';
import activities from '../assets/ekstrakurikuler/hero-figma.webp';
import admissions from '../assets/spmb/hero-1248.webp';
import admissions640 from '../assets/spmb/hero-640.webp';
import admissions960 from '../assets/spmb/hero-960.webp';

// Each entry uses existing school copy, artwork, and routes; the opening slide stays unchanged.
export const landingHeroSlides = [
  { id: 'beranda', name: 'Beranda', content: landingHero },
  {
    id: 'fasilitas', name: 'Fasilitas Sekolah',
    content: {
      title: 'Fasilitas Modern', titleAccent: 'Berstandar Industri',
      description: 'Jelajahi ruang kelas, laboratorium, dan perpustakaan SMK Telkom Purwokerto.',
      primaryCta: { label: 'Lihat Fasilitas', href: '/fasilitas' }, secondaryCta: ctaMasukPpdb,
    },
    media: { src: facilities, srcSet: `${facilities640} 640w, ${facilities960} 960w, ${facilities} 1144w`, width: 1144, height: 679, logo: facilitiesLogo, composition: 'facilities', alt: 'Kolase ruang kelas dan laboratorium SMK Telkom Purwokerto' },
  },
  {
    id: 'jurusan', name: 'Jurusan',
    content: { ...jurusanHero, primaryCta: { label: 'Lihat Jurusan', href: '/jurusan' }, secondaryCta: ctaMasukPpdb },
    media: { src: departments, width: 1106, height: 656, composition: 'departments', alt: 'Siswa SMK Telkom Purwokerto' },
  },
  {
    id: 'prestasi', name: 'Prestasi',
    content: { ...prestasiHero, title: 'Prestasi', description: 'Siswa terus berinovasi, berkompetisi, dan mengharumkan nama sekolah di tingkat nasional hingga internasional.', titleAccent: 'Membanggakan', primaryCta: { label: prestasiHero.ctaText, href: '/prestasi' }, secondaryCta: ctaMasukPpdb },
    media: { src: prestasiHero.image, srcSet: `${achievements640} 640w, ${achievements960} 960w, ${prestasiHero.image} 1106w`, width: 1106, height: 656, composition: 'achievements', alt: prestasiHero.imageAlt },
  },
  {
    id: 'profil', name: 'Profil Sekolah',
    content: { title: 'Profil Sekolah', titleAccent: '', description: 'Sekolah vokasi berbasis teknologi yang mencetak generasi digital berkarakter, kompeten, dan siap bersaing secara global.', primaryCta: { label: 'Lihat Profil Sekolah', href: '/profil-sekolah' }, secondaryCta: ctaMasukPpdb },
    media: { src: heroData.image, srcEn: profileEnglish, width: 1600, height: 751, composition: 'school', alt: 'Gedung SMK Telkom Purwokerto' },
  },
  {
    id: 'guru', name: 'Profil Guru',
    content: { title: 'Profil Guru', titleAccent: 'SMK Telkom', description: 'Tim pengajar memadukan kurikulum teknologi dan pembelajaran interaktif untuk membimbing siswa menciptakan solusi digital.', primaryCta: { label: 'Profil Guru', href: '/profil-sekolah/guru' } },
    media: { src: teachers, width: 2000, height: 1082, composition: 'teachers', alt: 'Guru dan tenaga pendidik SMK Telkom Purwokerto' },
  },
  {
    id: 'ekstrakurikuler', name: 'Ekstrakurikuler',
    content: { title: 'Ekstrakurikuler', titleAccent: '', description: 'Eksplorasi minat dan bakat melalui beragam organisasi, komunitas, dan kegiatan ekstrakurikuler.', primaryCta: { label: 'Lihat Kegiatan', href: '/ekstrakurikuler' } },
    media: { src: activities, width: 1999, height: 1007, composition: 'activities', alt: 'Ekstrakurikuler' },
  },
  {
    id: 'bkk', name: 'BKK',
    content: { ...bkkHero, description: 'BKK menjembatani siswa dan alumni dengan lowongan kerja, tempat PKL, serta mitra industri yang siap membuka pintu karier.', primaryCta: { label: bkkHero.ctaText, href: '/bkk' } },
    media: { src: bkkHero.image, width: 1106, height: 656, composition: 'careers', alt: bkkHero.imageAlt },
  },
  {
    id: 'berita', name: 'Berita',
    content: { ...beritaHero, primaryCta: { label: beritaHero.ctaText, href: '/berita' } },
    media: { src: beritaHero.image, width: 1106, height: 656, composition: 'news', alt: beritaHero.imageAlt },
  },
  {
    id: 'pengumuman', name: 'Pengumuman',
    content: { title: pengumumanHero.heading, titleAccent: pengumumanHero.headingAccent, description: pengumumanHero.description, primaryCta: { label: 'Pengumuman', href: '/pengumuman' } },
    media: { src: pengumumanHero.image, width: 1600, height: 751, composition: 'announcement', alt: 'Pengumuman sekolah' },
  },
  {
    id: 'kalender', name: 'Kalender Kegiatan',
    content: { title: 'Kalender', titleAccent: 'Kegiatan Sekolah', description: 'Temukan jadwal kegiatan, lomba, dan acara terbaru di SMK Telkom Purwokerto.', primaryCta: { label: 'Lihat Event', href: '/kalender' } },
    media: { src: beritaHero.image, width: 1106, height: 656, composition: 'news', alt: beritaHero.imageAlt },
  },
  {
    id: 'spmb', name: 'Informasi SPMB',
    content: { title: 'Wujudkan Mimpimu', titleAccent: 'di Dunia Digital', description: `Daftar SPMB SMK Telkom Purwokerto Tahun Ajaran ${ppdbMeta.tahun}/${Number(ppdbMeta.tahun) + 1} dan mulai langkah pertamamu menuju karier di bidang teknologi.`, primaryCta: { label: 'Informasi SPMB', href: '/spmb' } },
    media: { src: admissions, srcSet: `${admissions640} 640w, ${admissions960} 960w, ${admissions} 1248w`, width: 1248, height: 676, composition: 'admissions', alt: 'Informasi SPMB' },
  },
];
