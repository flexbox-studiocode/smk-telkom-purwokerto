import { useLanguage } from '../../context/LanguageContext';
import { useState } from 'react';
import { ArrowRight, Award, BookOpen, Briefcase, Building2, Kanban, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { jalurKarier } from '../../data/dummyData';

const icons = [BookOpen, Kanban, Building2, Briefcase, Lightbulb, Award];

const BkkJalurKarierSection = () => {
  const { t } = useLanguage();

  const [tab, setTab] = useState(jalurKarier.tabs[0]);
  const steps = jalurKarier.steps[tab];

  return (
    <section id="jalur-karier" className="bg-white py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-card sm:p-7">
          {/* Judul + tab jurusan */}
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-lg sm:text-[27.72px] font-extrabold leading-[normal] tracking-[.05em] text-dark-900">
              {t(jalurKarier.title)}
            </h2>
            <div role="tablist" aria-label={t("Jalur karier per jurusan")} className="flex flex-wrap gap-2">
              {jalurKarier.tabs.map((kode) => (
                <button
                  key={kode}
                  type="button"
                  role="tab"
                  aria-selected={tab === kode}
                  onClick={() => setTab(kode)}
                  className={`rounded-full border px-3.5 py-1.5 text-[16.63px] font-bold leading-[normal] tracking-[.12em] transition-colors ${
                    tab === kode
                      ? 'border-primary bg-primary text-white'
                      : 'border-dark-200 text-dark-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {kode}
                </button>
              ))}
            </div>
          </div>

          {/* Roadmap 6 tahap */}
          <ol className="relative mt-8 grid grid-cols-2 gap-y-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-8 right-8 top-8 hidden border-t border-primary-200 lg:block"
            />
            {steps.map((step, i) => {
              const Icon = icons[i] ?? BookOpen;
              return (
                <li key={step.title} className="relative flex flex-col items-center text-center">
                  <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
                    <Icon className="h-6 w-6 text-primary" strokeWidth={2.2} />
                    <span className="absolute -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-4 font-heading text-[16.63px] font-bold leading-[normal] tracking-[.12em] text-dark-900">
                    {t(step.title)}
                  </h3>
                  <p className="mt-1 max-w-[9rem] text-[13.86px] font-medium leading-[normal] tracking-[.12em] text-dark-500">
                    {t(step.desc)}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="mt-8 flex justify-center">
            <Link
              to={`/bkk/roadmap/${tab.toLowerCase()}`}
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-[13.86px] font-bold leading-[normal] tracking-[.12em] text-primary transition-colors hover:bg-primary hover:text-white"
            >
              {t(jalurKarier.ctaText)}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BkkJalurKarierSection;
