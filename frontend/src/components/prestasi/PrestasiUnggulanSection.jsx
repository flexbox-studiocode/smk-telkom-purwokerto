import { useLanguage } from '../../context/LanguageContext';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { prestasiUnggulan } from '../../data/dummyData';
import ContentImage from '../ContentImage';

const PrestasiUnggulanSection = ({ items = [] }) => {
  const { t } = useLanguage();

  const [active, setActive] = useState(0);
  // Satu prestasi utama dan tiga pilihan samping mengikuti komposisi Figma.
  const sourceItems = items.slice(0, 4);
  const selected = active % sourceItems.length;
  const featured = sourceItems[selected];
  const others = sourceItems
    .map((item, i) => ({ item, i }))
    .filter(({ i }) => i !== selected);

  if (!featured) return null;

  return (
    <section data-prestasi-unggulan className="bg-white py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 [container-type:inline-size]">
        <h2 className="font-heading text-[clamp(1.25rem,2.296cqw,2.5rem)] font-extrabold tracking-[.05em] text-dark-900">
          {t(prestasiUnggulan.title)}
        </h2>

        <div className="mt-7 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28%)]">
          {/* Prestasi terpilih */}
          <article data-featured-slug={featured.slug} className="grid min-w-0 items-start gap-5 md:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]">
            <ContentImage src={featured.image} alt={t(featured.title)} loading="lazy" decoding="async" className="aspect-[535/393] w-full rounded-xl bg-dark-50 object-contain" />
            <div className="min-w-0">
            <span className="inline-block rounded bg-primary-50 px-2.5 py-1 text-[clamp(.5625rem,.746cqw,.8125rem)] font-extrabold tracking-[.12em] text-primary">
              {t(featured.level)}
            </span>
            <h3 className="mt-3 max-w-xl font-heading text-[clamp(1.25rem,2.296cqw,2.5rem)] font-extrabold tracking-[.05em] leading-snug text-dark-900">
              {t(featured.title)}
            </h3>
            <p className="mt-3 max-w-xl text-[clamp(.75rem,.918cqw,1rem)] font-medium tracking-[.12em] leading-normal text-dark-600">
              {t(featured.lead || featured.desc)}
            </p>
            <Link
              to={`/prestasi/${featured.slug}`}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-[clamp(.75rem,.861cqw,.9375rem)] font-extrabold tracking-[.12em] text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-primary"
            >
              {t(prestasiUnggulan.ctaText)}
              <ArrowRight className="h-3 w-3" />
            </Link>
            </div>
          </article>

          {/* Daftar prestasi lain — klik untuk menukar yang tampil di kiri */}
          <div className="grid auto-rows-fr gap-3">
            {others.map(({ item, i }) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActive(i)}
                className="flex h-full min-w-0 w-full flex-col items-start rounded-xl border border-dark-100 bg-white px-4 py-3 text-left shadow-card transition-[transform,border-color] hover:-translate-y-0.5 hover:border-primary"
              >
                <span className="inline-block rounded bg-primary-50 px-2 py-0.5 text-[clamp(.5rem,.746cqw,.8125rem)] font-extrabold tracking-[.12em] text-primary">
                  {t(item.level)}
                </span>
                <p className="mt-1.5 font-heading text-[clamp(.875rem,1.148cqw,1.25rem)] font-extrabold tracking-[.05em] leading-normal text-dark-900">
                  {t(item.title)}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrestasiUnggulanSection;
