import { OFFICIAL_ADMISSIONS_URL } from '../../utils/admissions';
import { ArrowRight, BadgeCheck, BookOpen, BriefcaseBusiness, ChevronRight, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import Reveal from '../Reveal';
import HeroBadges from '../HeroBadges';
import wave from '../../assets/kalender/hero-wave-figma.webp';

const features = [
  [BookOpen, 'Kurikulum Up-to-Date'], [Monitor, 'Praktik Langsung'],
  [BadgeCheck, 'Bersertifikasi Industri'], [BriefcaseBusiness, 'Peluang Kerja Luas'],
];

export default function JurusanDetailHero({ item, design }) {
  const { t } = useLanguage();
  const title = t(item.title);
  const name = title.replace(/\s*\([^)]+\)$/, '');
  const lastSpace = name.lastIndexOf(' ');
  return (
    <section className="school-hero school-hero--department-detail" aria-labelledby="jurusan-detail-title">
      <div className="hero-container">
        <div className={`hero-panel hero-panel--bleed hero-panel--background hero-panel--detail hero-panel--detail-${item.slug}`}>
          <div className="hero-copy">
            <nav aria-label={t('Jejak navigasi')} className="flex flex-wrap items-center gap-1 text-[10px] leading-relaxed text-dark-500">
              <Link to="/jurusan" className="hover:text-primary hover:underline">{t('Jurusan')}</Link>
              <ChevronRight aria-hidden="true" className="size-3 shrink-0" />
              <span aria-current="page" className="font-semibold text-primary">{title}</span>
            </nav>
            <Reveal className="mt-4">
              <HeroBadges />
            </Reveal>
            <Reveal className="delay-100">
              <h1 id="jurusan-detail-title" className="detail-hero-title mt-3 max-w-[26rem] font-heading text-2xl font-extrabold leading-[normal] tracking-figma-heading text-dark-900 sm:text-3xl">
                {lastSpace > 0 ? (
                  <>
                    {name.slice(0, lastSpace)}{' '}
                    <span className="sm:block">
                      {name.slice(lastSpace + 1)} <span className="whitespace-nowrap text-primary">({design.code})</span>
                    </span>
                  </>
                ) : (
                  <>
                    {name} <span className="whitespace-nowrap text-primary">({design.code})</span>
                  </>
                )}
              </h1>
              <p className="mt-4 max-w-md text-xs font-medium leading-[normal] tracking-figma-copy text-dark-500 sm:text-sm lg:text-xs">{t(design.description)}</p>
            </Reveal>
            <Reveal className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4 delay-200">
              {features.map(([Icon, label], index) => (
                <div key={label} className={`flex min-w-0 flex-col gap-2 text-[11px] font-medium leading-[normal] tracking-figma-copy text-dark-600 ${index < features.length - 1 ? 'sm:border-r sm:border-dark-200 sm:pr-2' : ''}`}>
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <Icon aria-hidden="true" className="size-5 text-primary" />
                  </span>
                  <span>{t(label)}</span>
                </div>
              ))}
            </Reveal>
            <Reveal className="mt-6 flex flex-wrap gap-3 delay-200">
              <Link to={OFFICIAL_ADMISSIONS_URL} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-semibold leading-[normal] tracking-figma-copy text-white transition-colors hover:bg-primary-800">{t('Masuk SPMB')}<ArrowRight aria-hidden="true" className="size-4" /></Link>
              <a href="#fasilitas-jurusan" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-dark-200 bg-white px-5 py-3 text-xs font-bold leading-[normal] tracking-figma-copy text-dark-700 transition-colors hover:border-primary hover:text-primary">{t('Lihat Fasilitas')}<ArrowRight aria-hidden="true" className="size-4" /></a>
            </Reveal>
          </div>
          <div className="hero-background detail-hero-art">
            <img src={design.hero} width={design.heroWidth} height={design.heroHeight} alt={t(design.heroAlt)} fetchPriority="high" className="detail-hero-photo" />
            <p className="detail-hero-brand font-heading font-extrabold text-white">
              <span>{t('Raih masa depan')}</span>
              <span>{t('bersama {program}', { program: design.code })}</span>
            </p>
          </div>
          <img src={wave} width={649} height={385} alt="" aria-hidden="true" className="detail-hero-wave" />
        </div>
      </div>
    </section>
  );
}
