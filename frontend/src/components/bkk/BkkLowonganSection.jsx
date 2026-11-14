import { useLanguage } from '../../context/LanguageContext';
import { formatPublicDate } from '../../utils/publicContent';
import { useMemo, useRef, useState } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { lowonganPopuler } from '../../data/dummyData';
import BkkSearchPanel from './BkkSearchPanel';
import BkkTalentSection from './BkkTalentSection';
import { saringLowongan } from '../../utils/bkkFilter';

const BkkLowonganSection = ({ items = [] }) => {
  const { t, locale } = useLanguage();

  const [filters, setFilters] = useState({ keyword: '', lokasi: '', kategori: '', tipe: '' });
  const resultsRef = useRef(null);
  const shown = useMemo(() => saringLowongan(items, filters), [items, filters]);

  return (
    <section id="lowongan" className="bg-white py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BkkSearchPanel
          items={items}
          filters={filters}
          onChange={setFilters}
          resultsId="hasil-lowongan"
          onSubmit={() => resultsRef.current?.focus({ preventScroll: false })}
        />
        <BkkTalentSection />

        {/* Lowongan populer */}
        <div ref={resultsRef} id="hasil-lowongan" tabIndex={-1} role="region" aria-labelledby="lowongan-title" className="mt-9 scroll-mt-28 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/25">
        <h2 id="lowongan-title" className="font-heading text-xl sm:text-[27.72px] font-extrabold leading-[normal] tracking-[.05em] text-dark-900">
          {t(lowonganPopuler.title)}
        </h2>

        <p role="status" className="sr-only">{t('{count} lowongan ditemukan', { count: shown.length })}</p>
        {shown.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((job) => (
              <article
                key={job.id || `${job.company}-${job.role}`}
                className="flex flex-col rounded-2xl border border-dark-100 bg-white p-4 shadow-card transition-transform hover:-translate-y-1"
              >
                {job.logo && <img
                  key={job.logo}
                  src={job.logo}
                  alt={job.company}
                  onError={({ currentTarget }) => { currentTarget.hidden = true; }}
                  className="h-8 w-auto max-w-[7rem] self-start object-contain"
                />}
                <h3 className="mt-4 font-heading text-[19.4px] font-bold leading-[normal] tracking-[.05em] text-dark-900">{t(job.role)}</h3>
                <p className="mt-1 text-[12.47px] font-semibold leading-[normal] tracking-[.08em] text-dark-500">{job.company}</p>
                <p className="mt-1.5 flex items-center gap-1 text-[12.47px] font-semibold leading-[normal] tracking-[.08em] text-dark-500">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {t(job.lokasi ? job.location : 'Lokasi belum tersedia')}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.badges.map((b) => (
                    <span
                      key={b}
                      className="rounded border border-dark-200 px-2 py-1 text-[13.86px] font-semibold leading-[normal] tracking-[.12em] text-dark-600"
                    >
                      {t(b)}
                    </span>
                  ))}
                </div>

                <p className="mt-3 text-[11px] font-bold leading-[normal] tracking-[.05em] text-primary">{job.deadline ? formatPublicDate(job.deadline, {}, locale) : t('Deadline tidak ditentukan')}</p>

                {job.link_pendaftaran ? <a
                  href={job.link_pendaftaran}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full border border-dark-200 px-3 py-2 text-[10.4px] font-extrabold leading-[normal] tracking-[.12em] text-dark-600 transition-colors hover:border-primary hover:text-primary"
                >
                  {t(lowonganPopuler.ctaText)}
                  <ArrowRight className="h-2.5 w-2.5" />
                </a> : <p className="mt-4 text-[10px] text-dark-500">{t("Tautan lamaran belum tersedia.")}</p>}
              </article>
            ))}
          </div>
        ) : items.length > 0 && (
          // Only when filters hide existing items; empty/error is shown by the page.
          <p className="mt-8 text-center text-xs text-dark-500">
            {t('Tidak ada lowongan yang cocok. Coba ubah filter atau atur ulang pencarian.')}
          </p>
        )}
        </div>
      </div>
    </section>
  );
};

export default BkkLowonganSection;
