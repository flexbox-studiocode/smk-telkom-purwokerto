import { useLanguage } from '../../context/LanguageContext';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { kisahAlumni } from '../../data/dummyData';
import { slugify } from '../../utils/slug';
import ContentImage from '../ContentImage';

const BkkAlumniSection = () => {
  const { t } = useLanguage();
  return (
  <section className="bg-white py-8 lg:py-12">
    <div className="max-w-7xl mx-auto grid grid-cols-1 gap-5 px-4 sm:px-6 lg:grid-cols-[1fr_26%] lg:px-8">
      {/* Testimoni alumni */}
      <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-card">
        <h2 className="font-heading text-[22.18px] font-extrabold leading-[normal] tracking-[.05em] text-dark-900">{t(kisahAlumni.title)}</h2>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {kisahAlumni.items.map((alum) => (
            <figure
              key={alum.name}
              className="rounded-xl border border-dark-100 bg-white p-4 transition-all hover:-translate-y-1 hover:border-primary"
            >
              <div className="flex items-center gap-3">
                <ContentImage src={alum.image} alt={alum.name} loading="lazy" className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
                <figcaption className="min-w-0">
                  <p className="font-heading text-[16.63px] font-extrabold leading-[normal] tracking-[.05em] text-dark-900">{alum.name}</p>
                  <p className="mt-1 text-[13.86px] font-semibold leading-[normal] tracking-[.05em] text-dark-500">{t(alum.meta)}</p>
                  <p className="text-[12.47px] font-semibold leading-[normal] tracking-[.05em] text-dark-500">{t(alum.role)}</p>
                </figcaption>
              </div>
              <p className="mt-3 text-[12.47px] font-semibold leading-[normal] tracking-[.05em] text-dark-600">{t(alum.summary)}</p>
            </figure>
          ))}
        </div>
      </div>

      {/* Sumber daya karier */}
      <div className="flex flex-col rounded-2xl border border-dark-100 bg-white p-5 shadow-card">
        <ul className="space-y-3">
          {kisahAlumni.resources.map((item) => (
            <li key={item}>
              <Link
                to={`/bkk/panduan/${slugify(item)}`}
                className="group flex items-center gap-3 py-1.5 text-[10.4px] font-bold leading-[normal] tracking-[.05em] text-dark-600 transition-colors hover:text-primary"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-primary/30">
                  <Lightbulb className="h-3.5 w-3.5 text-primary" />
                </span>
                <span className="min-w-0 leading-[normal]">{t(item)}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-5">
          <Link
            to="/bkk/panduan"
            aria-label={t("Lihat semua sumber daya karier")}
            className="flex items-center justify-between gap-3 rounded-full border border-primary/40 px-4 py-3 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {t("Lihat Semua Panduan")}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  </section>
  );
};

export default BkkAlumniSection;
