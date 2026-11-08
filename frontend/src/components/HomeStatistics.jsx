import { useLanguage } from '../context/LanguageContext';
import CountUp from './CountUp';

const statistics = [
  ['1030+', 'Siswa Aktif', 'Active Students'],
  ['57+', 'Guru Profesional', 'Professional Teachers'],
  ['59+', 'Prestasi 2025', 'Achievements in 2025'],
  ['45+', 'Ruang Kelas & Laboratorium', 'Classrooms & Laboratories'],
];

export default function HomeStatistics() {
  const { language } = useLanguage();
  return (
    <section data-home-statistics aria-label={language === 'en' ? 'School statistics' : 'Statistik sekolah'} className="bg-white pb-10 pt-4 sm:pb-12 lg:pb-16">
      <div className="relative isolate mx-auto max-w-7xl px-6 sm:px-10 lg:px-12">
        <span aria-hidden="true" className="absolute inset-x-4 top-1/2 -z-10 h-16 -translate-y-1/2 rounded-full bg-primary shadow-md sm:inset-x-6 lg:h-20" />
        <dl className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 lg:gap-10">
          {statistics.map(([value, id, en]) => (
            <div key={id} className="flex flex-col rounded-2xl border-2 border-primary bg-white px-5 py-4 sm:px-6 sm:py-5">
              <dt className="text-sm font-medium leading-tight text-dark-600 sm:text-lg lg:text-xl">{language === 'en' ? en : id}</dt>
              <dd className="-order-1 font-heading text-3xl font-semibold leading-tight text-primary sm:text-4xl lg:text-5xl"><CountUp value={value} /></dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
