import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DetailLayout from '../components/DetailLayout';
import PengumumanDetailKonten from '../components/pengumuman/PengumumanDetailKonten';
import MainLayout from '../layouts/MainLayout';
import PublicDataState from '../components/PublicDataState';
import ErrorPage from './ErrorPage';
import { getPublishedPengumuman, getPengumumanBySlug } from '../services/pengumumanService';
import { toPengumumanItem } from '../utils/publicContent';

const PengumumanDetail = ({ slug }) => {
  const { t } = useLanguage();

  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (loading || error) document.title = `${t(error || 'Pengumuman')} | SMK Telkom Purwokerto`;
  }, [loading, error, item, t]);

  useEffect(() => {
    let active = true;
    Promise.all([getPengumumanBySlug(slug), getPublishedPengumuman().catch(() => [])])
      .then(([row, rows]) => {
        if (!active) return;
        setItem(row ? toPengumumanItem(row) : null);
        setRelated(rows.map(toPengumumanItem).filter((entry) => entry.slug !== slug).slice(0, 3));
      })
      .catch(() => active && setError('Pengumuman belum dapat dimuat. Silakan coba lagi nanti.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug, requestVersion]);

  if (!loading && !error && !item) return <ErrorPage />;

  if (loading || error) return (
    <MainLayout><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PublicDataState loading={loading} error={error} label="pengumuman" onRetry={() => { setLoading(true); setError(''); setRequestVersion((value) => value + 1); }} />
    </div></MainLayout>
  );

  return (
    <DetailLayout imageVariant="pengumuman" item={item} backTo="/pengumuman" backLabel="Pengumuman">
      <PengumumanDetailKonten item={item} relatedItems={related} />
    </DetailLayout>
  );
};

const PengumumanDetailPage = () => {
  const { slug } = useParams();
  return <PengumumanDetail key={slug} slug={slug} />;
};

export default PengumumanDetailPage;
