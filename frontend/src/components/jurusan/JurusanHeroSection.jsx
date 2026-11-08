import { OFFICIAL_ADMISSIONS_URL } from '../../utils/admissions';
import PageHeroCarousel from '../../components/PageHeroCarousel';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import HeroStatsBar from '../HeroStatsBar';
import HeroBadges from '../HeroBadges';
import { jurusanHero, jurusanStats } from '../../data/dummyData';
import jurusanHeroImage from '../../assets/drive/jurusan-hero-artwork.webp';

const JurusanHeroSection = () => {
  const { t } = useLanguage();
  return (
  <section className="school-hero">
    <div className="hero-container">
      <PageHeroCarousel page="jurusan"><div className="hero-panel hero-panel--floating hero-panel--bleed hero-panel--departments">
        <div className="hero-grid">
          <div className="hero-copy">
            <HeroBadges />

            <h1 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-[1.75rem] xl:text-[2rem] font-extrabold leading-[1.2] tracking-tight text-dark-900">
              {t(jurusanHero.title)}
              <br />
              <span className="text-primary">{t(jurusanHero.titleAccent)}</span>
            </h1>

            <p className="mt-4 max-w-md text-xs sm:text-sm leading-relaxed text-dark-500">
              {t(jurusanHero.description)}
            </p>

            <Link
              to={OFFICIAL_ADMISSIONS_URL}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-800"
            >
              {t(jurusanHero.ctaText)}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Preserve the complete supplied artwork at its original aspect ratio. */}
          <img
            src={jurusanHeroImage}
            alt={t('Siswa SMK Telkom Purwokerto')}
            width={1106}
            height={656}
            fetchPriority="high"
            className="hero-image"
          />
        </div>

      </div></PageHeroCarousel>
      <HeroStatsBar items={jurusanStats} />
    </div>
  </section>
  );
};

export default JurusanHeroSection;
