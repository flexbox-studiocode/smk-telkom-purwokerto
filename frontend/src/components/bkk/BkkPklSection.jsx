import { useLanguage } from '../../context/LanguageContext';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { pklData } from '../../data/dummyData';
import { slugify } from '../../utils/slug';

const BkkPklSection = () => {
  const { t } = useLanguage();
  return (
  <section id="pkl" className="bg-white py-8 lg:py-12">
    <div className="max-w-7xl mx-auto grid grid-cols-1 gap-5 px-4 sm:px-6 lg:grid-cols-[1fr_26%] lg:px-8">
      {/* Kartu PKL */}
      <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pklData.items.map((pkl) => (
            <article
              key={pkl.role}
              className="flex flex-col rounded-xl border border-dark-100 bg-white p-4 transition-all hover:-translate-y-1 hover:border-primary"
            >
              <img
                src={pkl.logo}
                alt={pkl.company}
                className="h-7 w-auto max-w-[6rem] self-start object-contain"
              />
              <h3 className={`mt-3.5 font-heading ${pkl.role === 'PKL Software Engineer' ? 'text-[16.63px]' : 'text-[19.4px]'} font-normal leading-[normal] tracking-[.05em] text-dark-900`}>{t(pkl.role)}</h3>
              <p className="mt-1 text-[12.47px] leading-[normal] tracking-[.08em] text-dark-500">{pkl.company}</p>
              <p className="text-[12.47px] leading-[normal] tracking-[.08em] text-dark-500">{t(pkl.location)}</p>
              <p className="mt-3 text-[13.86px] font-bold leading-[normal] tracking-[.05em] text-primary">{t(pkl.kuota)}</p>
              <p className="mt-0.5 text-[13.86px] leading-[normal] tracking-[.05em] text-primary">{t(pkl.kota)}</p>
              <Link
                to={`/bkk/pkl/${slugify(`${pkl.role} ${pkl.company}`)}`}
                className="mt-3.5 inline-flex items-center justify-center gap-1.5 rounded-full border border-dark-200 px-2.5 py-1.5 text-[10.4px] font-normal leading-[normal] tracking-[.12em] text-dark-500 transition-colors hover:border-primary hover:text-primary"
              >
                {t(pklData.ctaText)}
                <ArrowRight className="h-2 w-2" />
              </Link>
            </article>
          ))}
        </div>
      </div>

      {/* Ajakan tanya NEXA */}
      <div className="flex flex-col items-center rounded-2xl bg-primary-100 px-5 py-6 text-center">
        <h2 className="whitespace-pre-line font-heading text-[16.63px] font-extrabold leading-[normal] tracking-[.05em] text-primary-900">
          {t(pklData.stela.title)}
        </h2>
        <img
          src={pklData.stela.mascot}
          alt=""
          aria-hidden="true"
          className="mt-4 h-28 w-28 rounded-2xl bg-primary object-contain p-5"
        />
        <Link
          to="/nexa"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[22.18px] font-extrabold leading-[normal] tracking-[.05em] text-white transition-colors hover:bg-primary-800"
        >
          {t(pklData.stela.ctaText)}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  </section>
  );
};

export default BkkPklSection;
