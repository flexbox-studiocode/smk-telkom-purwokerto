import { useLanguage } from '../context/LanguageContext';
import { useEffect, useRef, useState } from 'react';
import PrestasiCarousel from './PrestasiCarousel';
import PublicDataState from './PublicDataState';
import SectionAccents from './SectionAccents';
import laurelBranch from '../assets/landing/laurel-branch.png';
import { prestasiData } from '../data/dummyData';
import { toPrestasiItem } from '../utils/publicContent';

const AchievementsSection = ({ initialItems }) => {
  const { t } = useLanguage();
  const sectionRef = useRef(null);
  const [items, setItems] = useState(initialItems || []);
  const [loading, setLoading] = useState(!initialItems);
  const [requestStarted, setRequestStarted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let started = false;
    let observer;
    const load = async () => {
      if (!active || started) return;
      started = true;
      setRequestStarted(true);
      observer?.disconnect();
      try {
        const { getPrestasi } = await import('../services/prestasiService');
        // StrictMode cleanup or route navigation may happen during import.
        if (!active) return;
        const rows = await getPrestasi();
        if (active) setItems(rows.map(toPrestasiItem));
      } catch {
        if (active) setError('Prestasi belum dapat dimuat. Silakan coba lagi nanti.');
      } finally {
        if (active) setLoading(false);
      }
    };
    if (typeof IntersectionObserver !== 'function') {
      load();
    } else {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) load();
      }, { rootMargin: '600px 0px', threshold: 0 });
      if (sectionRef.current) observer.observe(sectionRef.current);
    }
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, []);

  return (
  <section ref={sectionRef} id="prestasi" className="relative overflow-hidden bg-white py-12 sm:py-16 lg:py-20">
    <SectionAccents variant="achievements" />

    <div className="home-achievements-content relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Judul diapit dua cabang laurel (sisi kanan = cabang yang sama, dicerminkan) */}
      <div className="flex items-center justify-center gap-3 sm:gap-6">
        <img
          src={laurelBranch}
          alt=""
          aria-hidden="true"
          className="hidden h-24 w-auto shrink-0 select-none sm:block lg:h-28"
        />
        <div className="text-center">
          <h2 className="font-heading text-[1.75rem] font-extrabold leading-tight tracking-tight text-dark-900 sm:text-[2rem] xl:text-[2.5rem]">
            {t(prestasiData.title)}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-base leading-relaxed text-dark-600 sm:text-lg">
            {t(prestasiData.subtitle)}
          </p>
        </div>
        <img
          src={laurelBranch}
          alt=""
          aria-hidden="true"
          className="hidden h-24 w-auto shrink-0 -scale-x-100 select-none sm:block lg:h-28"
        />
      </div>

      {/* Delapan kartu per halaman, empat kolom pada desktop */}
      <PublicDataState loading={loading} error={t(error)} empty={!loading && !error && !items.length} label="prestasi" carousel twoRows deferred={!requestStarted} />
      {!loading && !error && items.length > 0 && <PrestasiCarousel items={items} twoRows animated />}

    </div>
  </section>
  );
};

export default AchievementsSection;
