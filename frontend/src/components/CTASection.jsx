import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ctaBanner } from '../data/dummyData';
import { useLanguage } from '../context/LanguageContext';

const CTASection = ({ variant = 'default', containerClassName, href = ctaBanner.href }) => {
  const { t } = useLanguage();
  return (
    <section id="ppdb" className="bg-white pb-8 lg:pb-12">
      <div className={`figma-cta ${containerClassName ?? (variant === 'prestasi' ? 'mx-auto w-[calc(100%-2rem)] max-w-[1703px] sm:w-[calc(100%-3rem)] lg:w-[92.35%]' : 'mx-auto max-w-[1546px] px-4 sm:px-6 lg:px-8')}`}>
        <div className="flex flex-col items-center justify-between gap-5 rounded-3xl bg-[#bf0d1b] px-6 py-6 text-center sm:flex-row sm:px-8 sm:text-left">
          <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row">
            <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white p-2 lg:size-20 lg:p-3"><img src="/assets/branding/spmb-target.svg" alt="" loading="lazy" className="h-auto max-w-full" /></span>
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-bold leading-tight text-white sm:text-xl lg:text-2xl">{t(ctaBanner.title)}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/90">{t(ctaBanner.description)}</p>
            </div>
          </div>
          <Link to={href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            {t(ctaBanner.ctaText)}<ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
