import { useLocation } from 'react-router-dom';
import { Children, useRef, useEffect, useState } from 'react';
import WaveMarquee from '../components/WaveMarquee';
import InnovationReveal from '../components/InnovationReveal';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StelaWidget from '../components/stela/StelaWidget';
import StelaAISection from '../components/StelaAISection';
import CTASection from '../components/CTASection';
import { useLanguage } from '../context/LanguageContext';
import '../styles/hero.css';

export default function MainLayout({ children, busy = false, className = '', ctaHref, showSupportSections = true, showMarquees = true, showOpeningMarquee = true }) {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const mainRef = useRef(null);
  const [opening, ...content] = Children.toArray(children);
  const [SmoothScroll, setSmoothScroll] = useState(null);

  useEffect(() => {
    if (SmoothScroll) return;
    const load = () => import('../components/SmoothScroll').then(m => setSmoothScroll(() => m.default)).catch(() => {}); // Native scrolling remains available if this optional chunk fails.
    if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 2000 });
    else setTimeout(load, 1500);
  }, [SmoothScroll]);

  return (
    <div className={`public-site min-h-screen bg-white ${className}`}>
      {SmoothScroll && <SmoothScroll />}
      <a href="#main-content" className="sr-only z-[100] rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4" onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        mainRef.current?.focus({ preventScroll: true });
        mainRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      }}>
        {t('Lewati ke konten utama')}
      </a>
      <Navbar />
      {/* key={pathname} memaksa <main> dipasang ulang tiap pindah route, supaya
          animasi masuknya ikut jalan saat berpindah antar halaman detail yang
          memakai komponen yang sama (mis. /berita/a -> /berita/b). */}
      <main ref={mainRef} id="main-content" tabIndex={-1} aria-busy={busy || undefined} key={pathname} className="animate-masuk-halaman scroll-mt-24">
        {opening}
        {!busy && showMarquees && showOpeningMarquee && <WaveMarquee />}
        {content}
        {!busy && showMarquees && <InnovationReveal />}
        {showSupportSections && <>
        <StelaAISection variant="prestasi" className="bg-white py-6 lg:py-8" containerClassName="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" />
        <CTASection href={ctaHref} variant="fasilitas" containerClassName="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" />
        </>}
      </main>
      <Footer />
      {!busy && <>
        <StelaWidget />
      </>}
    </div>
  );
}
