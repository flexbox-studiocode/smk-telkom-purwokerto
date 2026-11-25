import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import HalamanHeader from '../components/HalamanHeader';
import Reveal from '../components/Reveal';
import StatusBadge from '../components/dashboard/StatusBadge';
import { galeriIndex } from '../data/dummyData';
import { getPublishedBerita } from '../services/beritaService';
import { getBeritaGallery, toBeritaItem, formatPublicDate } from '../utils/publicContent';
import ContentImage from '../components/ContentImage';
import PublicDataState from '../components/PublicDataState';

const JEDA = ['', 'delay-100', 'delay-200', 'delay-300'];

const GaleriPage = () => {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);
  useEffect(() => {
    let active = true;
    getPublishedBerita()
      .then((rows) => active && setItems(getBeritaGallery(rows.map(toBeritaItem))))
      .catch(() => active && setError('Berita belum dapat dimuat. Silakan coba lagi nanti.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [requestVersion]);
  return (
  <MainLayout>
    <HalamanHeader
      {...galeriIndex}
      deskripsi="Foto kegiatan dari berita sekolah yang sudah diterbitkan, diurutkan dari yang terbaru."
      aksi={
        <Link to="/berita" className="inline-flex items-center gap-2 rounded-full border border-dark-200 bg-white px-5 py-2.5 text-xs font-semibold text-dark-700 transition-colors hover:border-primary hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('Kembali ke {label}', { label: t('Berita') })}
        </Link>
      }
    />

    <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PublicDataState onRetry={() => { setLoading(true); setError(''); setRequestVersion((value) => value + 1); }} loading={loading} error={error} empty={!loading && !error && items.length === 0} label={t('foto berita')} />
      </div>
      <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((foto, i) => (
          <Reveal key={foto.slug} className={JEDA[i % JEDA.length]}>
            <Link
              to={`/berita/${foto.slug}?from=galeri`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-card transition-transform hover:-translate-y-1"
            >
              <ContentImage variant="berita"
                src={foto.image}
                alt={t(foto.title)}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
              />
              <div className="flex flex-1 flex-col px-5 py-4">
                <StatusBadge nilai={foto.kategori} nada="merah" />
                <h2 className="mt-3 font-heading text-sm font-bold leading-snug text-dark-900">
                  {t(foto.title)}
                </h2>
                <p className="mt-1.5 text-[11px] text-dark-400">{formatPublicDate(foto.iso, {}, locale)}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-dark-500">{t(foto.excerpt)}</p>
                <p className="mt-auto pt-3 text-[11px] font-bold text-primary">{t("Lihat Detail")}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  </MainLayout>
  );
};

export default GaleriPage;
