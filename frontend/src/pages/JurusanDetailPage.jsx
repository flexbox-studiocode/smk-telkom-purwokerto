import { useEffect } from 'react';
import { applyPageMetadata } from '../utils/seo';
import { useParams, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import MainLayout from '../layouts/MainLayout';
import JurusanDetailHero from '../components/jurusan/JurusanDetailHero';
import ribbon from '../assets/jurusan-detail/department-ribbon.webp';
import JurusanDetailKonten from '../components/jurusan/JurusanDetailKonten';
import ErrorPage from './ErrorPage';
import { jurusanDetail } from '../data/dummyData';
import { jurusanDetailDesign } from '../data/jurusanDetailDesign';
import '../styles/jurusan-detail.css';

export default function JurusanDetailPage() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const { slug } = useParams();
  const item = jurusanDetail.find(entry => entry.slug === slug);
  const design = Object.hasOwn(jurusanDetailDesign, slug) ? jurusanDetailDesign[slug] : undefined;
  useEffect(() => {
    if (!item || !design) return;
    applyPageMetadata({ pathname, title: `${t(item.title)} | SMK Telkom Purwokerto`, description: t(design.description), indexable: true });
  }, [pathname, item, design, t]);
  if (!item || !design) return <ErrorPage />;
  return (
    <MainLayout showOpeningMarquee={false}>
      <JurusanDetailHero item={item} design={design} />
      <div aria-hidden="true" className="overflow-hidden"><img src={ribbon} width={1847} height={171} alt="" className="block h-auto w-full" /></div>
      <JurusanDetailKonten item={item} design={design} />
    </MainLayout>
  );
}
