import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { kisahAlumni } from '../../data/dummyData';
import { saringLowongan } from '../../utils/bkkFilter';
import BkkSearchPanel from './BkkSearchPanel';
import ContentImage from '../ContentImage';

const alumni = kisahAlumni.items.map((item) => ({
  ...item,
  lokasi: item.lokasi || 'Belum dicantumkan',
  tipe_pekerjaan: item.tipe_pekerjaan || 'Belum dicantumkan',
}));

const BkkTalentSection = () => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState({ keyword: '', lokasi: '', kategori: '', tipe: '' });
  const [searched, setSearched] = useState(false);
  const shown = saringLowongan(alumni, filters);

  return (
    <div className="mt-20 sm:mt-24">
      <BkkSearchPanel talent items={alumni} filters={filters} resultsId="hasil-talenta" onChange={(next) => { setFilters(next); setSearched(true); }} onSubmit={() => setSearched(true)} />
      <div id="hasil-talenta" className="scroll-mt-28" role="region" aria-label={t('Hasil pencarian talenta')} aria-live="polite">
        {searched && <>
          <p className="mt-6 text-sm font-semibold text-dark-700">{t('{count} profil alumni ditemukan', { count: shown.length })}</p>
          <p className="mt-2 text-xs leading-relaxed text-dark-500">{t('Profil alumni publik; lokasi, tipe pekerjaan, dan ketersediaan rekrutmen belum dicantumkan.')}</p>
          {shown.length ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((item) => (
                <article key={item.name} className="min-w-0 rounded-2xl border border-dark-100 bg-white p-5 shadow-card">
                  <ContentImage src={item.image} alt={item.name} loading="lazy" className="h-16 w-16 rounded-full object-cover" />
                  <h3 className="mt-4 break-words font-heading text-sm font-bold text-dark-900">{item.name}</h3>
                  <p className="mt-1 text-xs text-dark-500">{t(item.meta)}</p>
                  <p className="mt-2 break-words text-sm text-dark-700">{t(item.role)}</p>
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary">{t('Sumber profil alumni')}</a>
                </article>
              ))}
            </div>
          ) : <p className="mt-5 rounded-xl border border-dark-200 p-6 text-center text-sm text-dark-500">{t('Tidak ada talenta yang cocok. Coba ubah filter atau atur ulang pencarian.')}</p>}
        </>}
      </div>
    </div>
  );
};

export default BkkTalentSection;
