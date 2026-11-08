import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { projectShowcase } from '../../data/dummyData';
import { slugify } from '../../utils/slug';
import ContentImage from '../ContentImage';
import PrestasiCarousel from '../PrestasiCarousel';
import { getUniqueProjects } from '../../utils/publicContent';

const items = getUniqueProjects(projectShowcase.items).map((item) => ({ ...item, slug: item.slug || slugify(item.title) }));

const JurusanShowcaseSection = () => {
  const { t, language } = useLanguage();

  return (
    <section className="overflow-hidden bg-white py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 [container-type:inline-size]">
        <h2 className="font-heading text-[clamp(1.25rem,2.296cqw,2.5rem)] font-extrabold text-dark-900">
          {language === 'en' ? t('Pameran Proyek Siswa') : <>{projectShowcase.title}{' '}
          <span className="text-primary">{projectShowcase.titleAccent}</span>{' '}
          {projectShowcase.titleTail}</>}
        </h2>

        {/* Carousel native yang sama dengan prestasi: setiap proyek hanya dirender sekali, tanpa putaran ulang. */}
        <PrestasiCarousel items={items} showIndicators={false}
          labels={{ previous: 'Project sebelumnya', next: 'Project berikutnya', slide: 'Ke slide project {number}' }}
          renderCard={(item) => (
              <Link
                to={`/jurusan/project/${item.slug}`}
                className="block h-full overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-card transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <div className="relative">
                  <ContentImage
                    src={item.image}
                    alt={t(item.imageAlt || item.title)}
                    className="w-full aspect-[16/10] object-cover object-top"
                  />
                  <span
                    className={`absolute bottom-2 left-2 rounded px-2 py-1 text-[9px] font-bold text-white ${item.tagClass}`}
                  >
                    {item.tag}
                  </span>
                </div>
                <h3 className="px-4 pt-3 font-heading text-sm font-bold leading-snug text-dark-900">
                  {t(item.title)}
                </h3>
                <p className="px-4 pb-4 pt-2 text-xs leading-relaxed text-dark-500">{t(item.description)}</p>
              </Link>
          )}
        />
      </div>
    </section>
  );
};

export default JurusanShowcaseSection;
