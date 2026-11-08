import { OFFICIAL_ADMISSIONS_URL } from '../utils/admissions';
import PageHeroCarousel from '../components/PageHeroCarousel';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import HeroBreadcrumb from '../components/HeroBreadcrumb';
import HeroBadges from '../components/HeroBadges';
import HeroQuickAccess from '../components/HeroQuickAccess';
import CalendarBoard from '../components/kalender/CalendarBoard';
import SchoolAgendaSection from '../components/kalender/SchoolAgendaSection';
import PublicDataState from '../components/PublicDataState';
import useEvents from '../hooks/useEvents';
import { toCalendarEvent } from '../utils/events';
import { useLanguage } from '../context/LanguageContext';
import calendar from '../assets/kalender/hero-calendar-lossless.webp';
import wave from '../assets/kalender/hero-wave-figma.webp';
import building from '../assets/kalender/hero-building.webp';
import collage from '../assets/kalender/hero-collage.webp';
import heroLogo from '../assets/kalender/hero-logo.webp';
import './KalenderPage.css';

export default function KalenderPage({ initialItems }) {
  const { t } = useLanguage();
  const { items, loading, error, refresh } = useEvents(true, initialItems);
  const events = items.map(toCalendarEvent);
  const [prefix, ...accent] = t('Kalender Kegiatan Sekolah').split(' ');
  return (
    <MainLayout>
      <section data-calendar-hero className="school-hero">
        <div className="hero-container">
          <PageHeroCarousel page="kalender"><div className="hero-panel hero-panel--calendar hero-panel--bleed">
            <div className="hero-copy">
              <HeroBreadcrumb parent="Informasi" parentTo={null} current="Kalender Kegiatan" />
              <HeroBadges />
              <h1 className="mt-4 font-heading text-3xl font-extrabold leading-tight tracking-tight text-dark-900 sm:text-4xl">{prefix} <span className="text-primary">{accent.join(' ')}</span></h1>
              <p className="mt-4 max-w-md text-xs leading-relaxed text-dark-500 sm:text-sm lg:max-w-xs">{t('Temukan jadwal kegiatan, lomba, dan acara terbaru di SMK Telkom Purwokerto.')}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={OFFICIAL_ADMISSIONS_URL} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-800">{t('Masuk SPMB')}<ArrowRight className="size-4" /></Link>
                <a href="#kalender" className="inline-flex items-center gap-2 rounded-full border border-dark-200 bg-white px-6 py-3 text-sm font-semibold text-dark-700 transition-colors hover:border-primary hover:text-primary">{t('Lihat Event')}<ArrowRight className="size-4 text-primary" /></a>
              </div>
            </div>
            <div aria-hidden="true" className="hero-calendar-art">
              <div className="calendar-hero-building"><img src={building} width="1200" height="900" alt="" /></div>
              <img src={collage} width="545" height="458" alt="" className="calendar-hero-collage" />
              <div className="calendar-hero-logo"><img src={heroLogo} width="600" height="172" alt="" /></div>
              <img src={wave} width="1298" height="770" alt="" className="calendar-hero-wave" />
              <div className="calendar-hero-illustration">
                <img src={calendar} width="1774" height="887" alt="" fetchPriority="high" />
              </div>
            </div>
          </div></PageHeroCarousel>
          <HeroQuickAccess />
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><PublicDataState loading={loading} error={error} onRetry={() => refresh()} label={t('kegiatan')} /></div>
      {!loading && !error && <><CalendarBoard events={events} /><SchoolAgendaSection events={events} /></>}
    </MainLayout>
  );
}
