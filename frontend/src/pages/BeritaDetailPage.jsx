import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import DetailLayout from '../components/DetailLayout';
import BeritaDetailKonten from '../components/berita/BeritaDetailKonten';
import MainLayout from '../layouts/MainLayout';
import PublicDataState from '../components/PublicDataState';
import ErrorPage from './ErrorPage';
import { getBeritaBySlug, getPublishedBerita } from '../services/beritaService';
import { toBeritaItem } from '../utils/publicContent';

const BeritaDetail = ({ slug }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromGallery = searchParams.get('from') === 'galeri';

  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (loading || error) document.title = `${t(error || 'Berita')} | SMK Telkom Purwokerto`;
  }, [loading, error, item, t]);

  useEffect(() => {
    let active = true;
    Promise.all([getBeritaBySlug(slug), getPublishedBerita().catch(() => [])])
      .then(([row, rows]) => {
        if (!active) return;
        // URL lama (alias) dialihkan ke slug kanonis tanpa menambah riwayat.
        if (row && row.canonicalSlug && row.canonicalSlug !== slug) {
          navigate({ pathname: `/berita/${row.canonicalSlug}`, search: searchParams.toString() }, { replace: true });
          return;
        }
        const current = row ? toBeritaItem(row) : null;
        setItem(current);
        setRelated(rows.map(toBeritaItem).filter((entry) => entry.slug !== slug).slice(0, 3));
      })
      .catch(() => active && setError('Berita belum dapat dimuat. Silakan coba lagi nanti.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug, requestVersion, navigate, searchParams]);

  if (!loading && !error && !item) return <ErrorPage />;

  if (loading || error) return (
    <MainLayout><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PublicDataState loading={loading} error={error} label="berita" onRetry={() => { setLoading(true); setError(''); setRequestVersion((value) => value + 1); }} />
    </div></MainLayout>
  );

  return (
    <DetailLayout item={item} backTo={fromGallery ? '/galeri' : '/berita'} backLabel={fromGallery ? 'Galeri' : 'Berita'}>
      <BeritaDetailKonten item={item} relatedItems={related} />
    </DetailLayout>
  );
};

const BeritaDetailPage = () => {
  const { slug } = useParams();
  return <BeritaDetail key={slug} slug={slug} />;
};

export default BeritaDetailPage;
