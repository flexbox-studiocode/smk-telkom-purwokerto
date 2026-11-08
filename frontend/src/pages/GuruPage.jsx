import PageHeroCarousel from '../components/PageHeroCarousel';
import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';
import RibbonDivider from '../components/RibbonDivider';
import { kepalaSekolah, visiMisi } from '../data/dummyData';
import { kesiswaanData, tenagaPendidikData, profilGuruTranslations } from '../data/profilGuruData';
import MainLayout from '../layouts/MainLayout';
import HeroBadges from '../components/HeroBadges';
import HeroQuickAccess from '../components/HeroQuickAccess';
import HeroBreadcrumb from '../components/HeroBreadcrumb';
import { slugify } from '../utils/slug';
import heroPhoto from '../assets/tentang/guru-page-hero.webp';
import SectionAccents from '../components/SectionAccents';
import TeacherCard from '../components/TeacherCard';
import useSlidingPage from '../hooks/useSlidingPage';
import headmasterAccent from '../assets/tentang/kepala-sekolah-motif.svg';

const getPageSize = () => {
  if (typeof window === 'undefined') return 8;
  if (window.matchMedia('(min-width: 75rem)').matches) return 8;
  return window.matchMedia('(min-width: 48rem)').matches ? 4 : 2;
};

export function GuruGrid({ teachers = tenagaPendidikData, id = 'guru', title = 'Guru & Tenaga Pendidik' }) {
  const { t, language } = useLanguage();
  const teacherText = (text) => t(language === 'en' ? profilGuruTranslations[text] ?? text : text);
  const [pagination, setPagination] = useState(() => ({ size: getPageSize(), page: 0 }));
  const pageSize = pagination.size;
  const pageCount = Math.max(1, Math.ceil(teachers.length / pageSize));
  const page = Math.min(pagination.page, pageCount - 1);
  const shown = teachers.slice(page * pageSize, (page + 1) * pageSize);
  const { viewport: viewportRef, indicators, goTo: slideTo } = useSlidingPage(`${page}-${pageSize}`);
  const indicatorCount = Math.min(pageSize === 2 ? 5 : 10, pageCount);
  // On mobile, advance the dot window gradually rather than resetting batches of four.
  const indicatorStart = Math.min(Math.max(page - Math.floor(indicatorCount / 2), 0), pageCount - indicatorCount);
  const goToPage = next => slideTo(Math.max(0, Math.min(next, pageCount - 1)), page, nextPage => setPagination(current => ({ ...current, page: nextPage })));

  useEffect(() => {
    const tablet = window.matchMedia('(min-width: 48rem)');
    const desktop = window.matchMedia('(min-width: 75rem)');
    const update = () => setPagination(current => {
      const size = getPageSize();
      if (size === current.size) return current;
      const firstTeacher = Math.min(current.page, Math.max(0, Math.ceil(teachers.length / current.size) - 1)) * current.size;
      return { size, page: Math.floor(firstTeacher / size) };
    });
    tablet.addEventListener('change', update);
    desktop.addEventListener('change', update);
    return () => {
      tablet.removeEventListener('change', update);
      desktop.removeEventListener('change', update);
    };
  }, [teachers.length]);

  return (
    <section aria-labelledby={`${id}-list-title`} className="relative overflow-hidden bg-white py-8 lg:py-12">
      <SectionAccents variant="teachers" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 [container-type:inline-size]">
        <Reveal className="mb-8 text-center">
          <h2 id={`${id}-list-title`} className="font-heading text-[clamp(1.5rem,2.755cqw,3rem)] font-bold leading-normal text-dark-900">{t(title)} </h2>
          <p className="mt-1 text-[clamp(.875rem,1.837cqw,2rem)] font-bold text-primary">{t("SMK Telkom Purwokerto")}</p>
        </Reveal>

        <div className="relative">
          <div ref={viewportRef} data-sliding-page className="relative overflow-x-clip">
          {shown.length ? <div id={`${id}-grid`} data-teacher-grid className={`grid auto-rows-fr grid-cols-1 gap-y-8 md:grid-cols-2 md:gap-x-8 min-[75rem]:grid-cols-4 min-[75rem]:gap-x-14 ${pageCount > 1 || shown.length > pageSize / 2 ? 'grid-rows-2' : ''}`}>
            {shown.map(guru => (
              <div key={guru.nama} data-teacher-card={slugify(guru.nama)}>
                <Link
                  to={'/profil-sekolah/guru/' + slugify(guru.nama)}
                  aria-label={t('Lihat profil {name}', { name: guru.nama })}
                  className="group relative block h-full rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  <div className="h-full bg-white transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transform-none">
                    <TeacherCard teacher={guru} role={teacherText(guru.jabatan)} alt={t('Foto {name}', { name: guru.nama })}>
                      {guru.sourceFile && guru.mapel && <p className="text-xs leading-relaxed text-dark-600">{t('Mata Pelajaran')}: {teacherText(guru.mapel)}</p>}
                      <p className="mt-2 text-xs leading-relaxed text-dark-500">{teacherText(guru.deskripsi)}</p>
                    </TeacherCard>
                  </div>
                </Link>
              </div>
            ))}
          </div> : <p className="py-8 text-center text-sm text-dark-500">{t('Belum ada profil guru.')}</p>}
          </div>
          <span className="sr-only" aria-live="polite">{t('Halaman {page} dari {total}', { page: page + 1, total: pageCount })}</span>

          {pageCount > 1 && (
            <nav data-teacher-pagination aria-label={t('Navigasi {category}', { category: t(title) })} className="mt-6 flex items-center justify-center gap-3 sm:mt-8">
              <button type="button" disabled={page === 0} onClick={() => goToPage(page - 1)} aria-controls={`${id}-grid`} aria-label={t('Halaman {category} sebelumnya', { category: t(title) })} className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white transition-colors hover:bg-primary-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={22} className="block shrink-0" aria-hidden="true" />
              </button>
              <div ref={indicators} className="relative flex shrink-0 items-center">
                <span data-teacher-pill data-slide-indicator aria-hidden="true" className="pointer-events-none absolute left-1 top-1/2 z-10 h-3 w-6 rounded-full bg-primary transition-none" style={{ transform: `translate3d(${(page - indicatorStart) * 32}px, -50%, 0)` }} />
                {Array.from({ length: indicatorCount }, (_, offset) => indicatorStart + offset).map((index) => (
                  <button key={index} type="button" onClick={() => goToPage(index)} aria-controls={`${id}-grid`} aria-label={t('Lihat halaman {category} {number}', { category: t(title), number: index + 1 })} aria-current={page === index ? 'page' : undefined} className="grid h-8 w-8 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <span aria-hidden="true" className="h-3 w-3 rounded-full bg-primary/40" />
                  </button>
                ))}
              </div>
              <button type="button" disabled={page === pageCount - 1} onClick={() => goToPage(page + 1)} aria-controls={`${id}-grid`} aria-label={t('Halaman {category} berikutnya', { category: t(title) })} className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white transition-colors hover:bg-primary-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight size={22} className="block shrink-0" aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}

function GuruPage() {
  const { t } = useLanguage();
  return (
    <MainLayout>
      <section className="school-hero school-hero--teachers">
        <div className="hero-container">
          <PageHeroCarousel page="guru"><div className="hero-panel hero-grid hero-panel--floating hero-panel--bleed hero-panel--teachers">
            <div className="hero-copy">
              <HeroBreadcrumb current="Profil Guru" />
              <HeroBadges />
              <h1 className="mt-4 font-heading text-3xl font-extrabold leading-[1.2] tracking-tight text-dark-900 sm:text-4xl lg:text-[1.75rem] xl:text-[2rem]">{t("Profil Guru")}<br /><span className="text-primary">{t("SMK Telkom")} {t("Purwokerto")}</span>
              </h1>
              <p className="mt-4 max-w-md text-xs leading-relaxed text-dark-500 sm:text-sm">{t("Tim pengajar kami memadukan kurikulum berbasis teknologi terbaru dengan metode pembelajaran interaktif. Kami siap membimbing siswa menguasai logika, pemrograman, hingga mampu menciptakan solusi digital masa depan.")} </p>
              <Link to="/profil-sekolah" className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{t("Lihat Profil Sekolah")} <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-media relative">
              <img src={heroPhoto} alt={t("Guru dan tenaga pendidik SMK Telkom Purwokerto")} width="2200" height="1033" fetchPriority="high" className="hero-image" />
            </div>
          </div></PageHeroCarousel>
          <HeroQuickAccess />
        </div>
      </section>

      <section aria-labelledby="kepala-sekolah-title" className="relative overflow-hidden bg-white py-8 lg:py-12">
        <SectionAccents variant="headmaster" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 [container-type:inline-size]">
          <Reveal className="mx-auto grid overflow-hidden rounded-[20px] border-2 border-[#cd091d] bg-white shadow-[0_0_24px_rgba(130,130,130,0.25)] md:grid-cols-[38%_62%]">
            <div className="relative min-h-[280px] overflow-hidden bg-white md:min-h-[420px]">
              <img src={headmasterAccent} alt="" aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 h-full w-auto max-w-none" />
              <img src={kepalaSekolah.image} alt={t('Foto {name}', { name: kepalaSekolah.name })} loading="lazy" className="absolute inset-0 h-full w-full object-contain object-bottom" />
            </div>
            <div className="flex flex-col justify-center px-6 py-8 sm:px-8 lg:px-10">
              <h2 id="kepala-sekolah-title" className="font-heading text-[clamp(1.25rem,2.296cqw,2.5rem)] font-bold leading-normal text-dark-900">{t("Kepala Sekolah")}</h2>
              <p className="mt-1 text-[clamp(.875rem,1.837cqw,2rem)] font-bold text-primary">{t("SMK Telkom Purwokerto")}</p>
              <h3 className="mt-5 font-heading text-[clamp(1.125rem,2.296cqw,2.5rem)] font-bold leading-normal text-dark-900">{t(kepalaSekolah.name)}</h3>
              <p className="mt-2 max-w-2xl text-[clamp(.875rem,1.378cqw,1.5rem)] font-medium leading-normal text-dark-600">{t(kepalaSekolah.quoteFull)}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-heading text-[clamp(.875rem,1.837cqw,2rem)] font-extrabold text-primary">{t("Jabatan/Posisi")}</p>
                  <p className="mt-1 flex items-start gap-1 text-[clamp(.75rem,1.148cqw,1.25rem)] font-medium leading-normal text-dark-600"><Quote aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 fill-primary text-primary" /> {t("Kepala Sekolah")}</p>
                </div>
                <div>
                  <p className="font-heading text-[clamp(.875rem,1.837cqw,2rem)] font-extrabold text-primary">{t("Visi Sekolah")}</p>
                  <p className="mt-1 text-[clamp(.75rem,1.148cqw,1.25rem)] font-medium leading-normal text-dark-600">{t(visiMisi.visi)}</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <GuruGrid teachers={kesiswaanData} id="kesiswaan" title="Bidang Kesiswaan & Karakter" />
      <RibbonDivider />
      <GuruGrid />
    </MainLayout>
  );
}

export default GuruPage;
