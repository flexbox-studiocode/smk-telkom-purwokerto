import { useLanguage } from '../context/LanguageContext';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import DepartmentCard from './DepartmentCard';
import Reveal from './Reveal';
import SectionAccents from './SectionAccents';
import { jurusanData } from '../data/dummyData';

const revealDelays = ['delay-0', 'delay-100', 'delay-200', 'delay-300'];

const DepartmentsSection = () => {
  const { t } = useLanguage();
  return (
  <section id="jurusan" className="relative overflow-hidden bg-white py-8 lg:py-12">
    <SectionAccents variant="departments" />

    <div className="home-departments-content relative mx-auto max-w-[1546px] px-4 sm:px-6 lg:px-8">
      <h2 className="text-center font-heading text-2xl font-bold leading-tight tracking-wide text-primary sm:text-3xl">
        {t(jurusanData.eyebrow)}
      </h2>
      <p className="mt-2 text-center font-heading text-base font-bold leading-tight text-dark-900 sm:text-lg">
        {t(jurusanData.title)}
      </p>

      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {jurusanData.items.map((item, index) => (
          <Reveal key={item.name} className={`h-full ${revealDelays[index] ?? 'delay-0'}`}>
            <DepartmentCard {...item} />
          </Reveal>
        ))}
      </div>

      <div className="mt-7 flex justify-center">
        <Link
          to="/jurusan"
          className="inline-flex items-center gap-2 rounded-full border border-dark-200 bg-white px-6 py-2.5 text-xs font-semibold text-dark-700 transition-colors hover:border-primary hover:text-primary"
        >
          {t(jurusanData.ctaText)}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  </section>
  );
};

export default DepartmentsSection;
