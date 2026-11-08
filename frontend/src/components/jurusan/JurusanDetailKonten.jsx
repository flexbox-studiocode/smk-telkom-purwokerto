import { BadgeCheck, BookOpen, BriefcaseBusiness, GraduationCap, Monitor, Quote, School, Users } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import Reveal from '../Reveal';
import WaveMarquee from '../WaveMarquee';

const SectionHeading = ({ children, id }) => (
  <h2 id={id} className="flex items-center gap-3 font-heading text-xl font-extrabold leading-tight text-dark-900 sm:text-2xl">
    <span aria-hidden="true" className="h-7 w-1.5 shrink-0 rounded-full bg-primary" />
    <span>{children}</span>
  </h2>
);
const icons = [Monitor, BookOpen, School];
const levels = ['Kelas X', 'Kelas XI', 'Kelas XII'];
const delays = ['', 'delay-100', 'delay-200'];

export default function JurusanDetailKonten({ item, design }) {
  const { t } = useLanguage();
  const facts = [
    { Icon: GraduationCap, label: 'Jenjang', value: 'Sekolah Menengah Kejuruan (SMK)' },
    { Icon: BriefcaseBusiness, label: 'Karier Lanjutan', value: item.facts.find(fact => fact.label === 'Prospek karier').value },
    { Icon: BadgeCheck, label: 'Sertifikasi', value: item.facts.find(fact => fact.label === 'Sertifikasi').value },
    { Icon: Users, label: 'Pengajar', value: 'Guru produktif berpengalaman dan tersertifikasi industri' },
  ];
  return (
    <>
      <section className="detail-jurusan-overview mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10" aria-labelledby="tentang-jurusan-title">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
          <Reveal>
            <SectionHeading id="tentang-jurusan-title">{t('Apa itu {program}?', { program: design.code })}</SectionHeading>
            <div className="mt-4 space-y-4 text-sm leading-[1.52] text-dark-600 sm:text-base">{design.about.map(text => <p key={text}>{t(text)}</p>)}</div>
          </Reveal>
          <Reveal as="figure" className="relative rounded-2xl bg-primary-50 p-6 lg:mt-2 delay-100">
            <Quote aria-hidden="true" className="mb-3 size-7 fill-primary text-primary" />
            <blockquote className="text-base font-bold italic leading-[1.48] text-dark-600 sm:text-lg">{t(design.quote)}</blockquote>
            <figcaption className="mt-4 text-xs leading-[normal] text-dark-500 sm:text-sm"><span className="block font-bold">{t('Tim {program}', { program: design.code })}</span>SMK Telkom Purwokerto</figcaption>
          </Reveal>
        </div>
        <Reveal as="dl" className="mt-6 grid gap-6 rounded-2xl bg-dark-50 p-5 sm:grid-cols-2 sm:p-6">
          {facts.map(({ Icon, label, value }, index) => (
            <div key={label} className={`flex items-start gap-4 ${index % 2 ? 'sm:border-l sm:border-dark-200 sm:pl-6' : ''}`}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <dt className="text-sm font-bold text-dark-600">{t(label)}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-dark-500">{t(value)}</dd>
              </div>
            </div>
          ))}
        </Reveal>
      </section>
      <WaveMarquee />
      <div className="detail-jurusan-content">
        <section id="fasilitas-jurusan" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12" aria-labelledby="fasilitas-jurusan-title">
          <Reveal><SectionHeading id="fasilitas-jurusan-title">{t('Fasilitas Pendukung')}</SectionHeading><p className="mt-3 max-w-2xl text-sm font-bold leading-[normal] text-dark-500 sm:text-base">{t(design.facilitiesDescription)}</p></Reveal>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {design.facilities.map((facility, index) => {
              const Icon = icons[index];
              return (
                <Reveal as="article" key={facility.title} data-department-facility={facility.title} className={`group overflow-hidden rounded-2xl border border-dark-200 bg-white shadow-soft transition-transform motion-safe:hover:-translate-y-1 ${delays[index]}`}>
                  <div className="overflow-hidden">
                    <img src={facility.image} width={960} height={720} alt={t(facility.title) + ' — ' + design.code} loading="lazy" decoding="async" className="aspect-[5/2] w-full object-cover object-center transition-transform duration-500 motion-safe:group-hover:scale-105" />
                  </div>
                  <div className="relative px-4 pb-5 pt-4">
                    <span aria-hidden="true" className="absolute -top-4 left-4 flex size-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white">
                      <Icon className="size-4" />
                    </span>
                    <h3 className="mt-2 font-heading text-sm font-extrabold leading-[normal] text-dark-900">{t(facility.title)}</h3>
                    <p className="mt-2 text-xs font-medium leading-[normal] text-dark-500">{t(facility.description)}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8 lg:pb-12" aria-labelledby="perjalanan-jurusan-title">
          <Reveal><SectionHeading id="perjalanan-jurusan-title">{t('Perjalanan')} <span className="text-primary">{t('Tiga Tahun')}</span></SectionHeading><p className="mt-3 text-sm font-bold leading-[normal] text-dark-500 sm:text-base">{t('Dari dasar hingga siap terjun ke dunia industri')}</p></Reveal>
          <ol className="mt-6 grid gap-5 md:grid-cols-3">
            {design.journey.map((points, index) => (
              <Reveal as="li" key={levels[index]} data-learning-year={levels[index]} className={`rounded-2xl border border-dark-200 bg-white p-5 ${delays[index]}`}>
                <h3 className="flex items-center gap-3 font-heading text-base font-extrabold leading-[normal] text-primary">
                  <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-white">{index + 1}</span>
                  {t(levels[index])}
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-xs font-bold leading-[normal] text-dark-600">
                  {points.map(point => <li key={point}>{t(point)}</li>)}
                </ul>
              </Reveal>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
