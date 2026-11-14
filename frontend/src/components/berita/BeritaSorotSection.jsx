import { useLanguage } from '../../context/LanguageContext';
import { formatPublicDate } from '../../utils/publicContent';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { beritaSorot } from '../../data/dummyData';

// Lihat catatan tampilkanLihatSemua di PengumumanPopulerCard.
const BeritaSorotSection = ({ items = [], tampilkanLihatSemua = true }) => {
  const { t, locale } = useLanguage();

  const [active, setActive] = useState(0);
  const sourceItems = items;
  const featured = sourceItems[active % sourceItems.length];
  const trending = sourceItems
    .map((item, i) => ({ item, i }))
    .filter(({ i }) => i !== active)
    .slice(0, 3);

  if (!featured) return null;

  return (
    <section id="berita-sorot" className="bg-white py-8 lg:py-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 items-start gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_38%] lg:px-8">
        {/* Berita sorotan */}
        <div className="lg:pl-24">
          <div className="flex items-center gap-3">
            <span className="rounded bg-primary-50 px-2.5 py-1 text-[11px] font-extrabold tracking-figma-copy text-primary">
              {t(featured.kategori)}
            </span>
            <span className="text-[11px] font-medium tracking-figma-copy text-dark-500">{formatPublicDate(featured.iso, {}, locale)}</span>
          </div>

          <h2 className="mt-3 max-w-md font-heading text-xl sm:text-2xl font-extrabold leading-[normal] tracking-figma-heading text-dark-900">
            {t(featured.title)}
          </h2>
          <p className="mt-3 max-w-md text-[11px] font-medium leading-[normal] tracking-figma-copy text-dark-500">
            {t(featured.desc)}
          </p>

          <Link
            to={`/berita/${featured.slug}`}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/40 px-3.5 py-2 text-[11px] font-extrabold tracking-figma-copy text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {t(beritaSorot.ctaText)}
          </Link>
        </div>

        {/* Trending — klik untuk menukar berita sorotan di kiri */}
        <div>
          <h2 className="font-heading text-lg sm:text-xl font-extrabold leading-[normal] tracking-figma-heading text-dark-900">
            {t(beritaSorot.trendingTitle)}
          </h2>

          <div className="mt-4 space-y-3">
            {trending.map(({ item, i }) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActive(i)}
                className="block w-full rounded-xl border border-dark-100 bg-white px-4 py-3 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary"
              >
                <span className="inline-block rounded bg-primary-50 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-figma-copy text-primary">
                  {t(item.kategori)}
                </span>
                <p className="mt-1.5 font-heading text-[11px] font-extrabold leading-[normal] tracking-figma-heading text-dark-900">
                  {t(item.title)}
                </p>
                <p className="mt-1.5 text-[11px] font-medium tracking-figma-copy text-dark-400">{formatPublicDate(item.iso, {}, locale)}</p>
              </button>
            ))}
          </div>

          {tampilkanLihatSemua && (
            <div className="mt-5 flex justify-end">
              <Link
                to="/berita/trending"
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-3.5 py-2 text-[11px] font-extrabold tracking-figma-copy text-primary transition-colors hover:bg-primary hover:text-white"
              >
                {t(beritaSorot.trendingCta)}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default BeritaSorotSection;
