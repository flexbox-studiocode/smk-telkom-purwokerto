import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DetailLayout from '../components/DetailLayout';
import PrestasiDetailKonten from '../components/prestasi/PrestasiDetailKonten';
import MainLayout from '../layouts/MainLayout';
import PublicDataState from '../components/PublicDataState';
import ErrorPage from './ErrorPage';
import { getPrestasi, getPrestasiBySlug } from '../services/prestasiService';
import { toPrestasiItem } from '../utils/publicContent';

const PrestasiDetail = ({ slug }) => {
  const { t } = useLanguage();

  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (loading || error) document.title = `${t(error || 'Prestasi')} | SMK Telkom Purwokerto`;
  }, [loading, error, item, t]);

  useEffect(() => {
    let active = true;
    Promise.all([getPrestasiBySlug(slug), getPrestasi().catch(() => [])])
      .then(([row, rows]) => {
        if (!active) return;
        setItem(row ? toPrestasiItem(row) : null);
        setRelated(rows.map(toPrestasiItem).filter((entry) => entry.slug !== slug).slice(0, 3));
      })
      .catch(() => active && setError('Prestasi belum dapat dimuat. Silakan coba lagi nanti.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug, requestVersion]);

  if (!loading && !error && !item) return <ErrorPage />;

  if (loading || error) return (
    <MainLayout><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PublicDataState loading={loading} error={error} label="prestasi" onRetry={() => { setLoading(true); setError(''); setRequestVersion((value) => value + 1); }} />
    </div></MainLayout>
  );

  return (
    <DetailLayout imageVariant="prestasi" item={item} backTo="/prestasi" backLabel="Prestasi">
      <PrestasiDetailKonten item={item} relatedItems={related} />
    </DetailLayout>
  );
};

const PrestasiDetailPage = () => {
  const { slug } = useParams();
  // Slug baru memulai state baru; error/isi prestasi sebelumnya tidak ikut terbawa.
  return <PrestasiDetail key={slug} slug={slug} />;
};

export default PrestasiDetailPage;
