import { OFFICIAL_ADMISSIONS_URL } from '../../utils/admissions';
import PageHeroCarousel from '../../components/PageHeroCarousel';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import HeroStatsBar from '../HeroStatsBar';
import HeroBreadcrumb from '../HeroBreadcrumb';
import HeroBadges from '../HeroBadges';
import { pengumumanHero, pengumumanStats } from '../../data/dummyData';

// Hero ini dulu terasa datar dibanding halaman lain karena tiga hal yang
// dipunyai Jurusan/Prestasi/BKK tapi tidak ada di sini: chip penanda di atas
// judul, garis tepi bernuansa merah, dan bilah statistik yang mengunci bagian
// bawah panel. Ketiganya sekarang disamakan.
const PengumumanHeroSection = () => {
  const { t } = useLanguage();
  return (
  <section className="school-hero school-hero--announcement">
    <div className="hero-container">
      <PageHeroCarousel page="pengumuman"><div className="hero-panel hero-panel--floating hero-panel--bleed hero-panel--announcement">
        <div className="hero-grid">
          <div className="hero-copy">
            <HeroBreadcrumb parent="Informasi" parentTo={null} current="Pengumuman" />
            <HeroBadges />

            <h1 className="mt-4 whitespace-pre-line font-heading text-3xl sm:text-4xl lg:text-[1.75rem] xl:text-[2rem] font-extrabold leading-[1.2] tracking-tight text-dark-900">
              {t(pengumumanHero.heading)}
              {'\n'}
              <span className="text-primary">{t(pengumumanHero.headingAccent)}</span>
            </h1>

            <p className="mt-4 max-w-md text-xs sm:text-sm leading-relaxed text-dark-500">
              {t(pengumumanHero.description)}
            </p>

            <Link
              to={OFFICIAL_ADMISSIONS_URL}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-800"
            >
              {t(pengumumanHero.ctaText)}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Ilustrasi megafon + ponsel di atas sapuan merah (satu aset dari Figma) */}
          <img
            src={pengumumanHero.image}
            alt={t("Pengumuman SMK Telkom Purwokerto")}
            className="hero-image"
          />
        </div>

      </div></PageHeroCarousel>
      <HeroStatsBar items={pengumumanStats} />

    </div>
  </section>
  );
};

export default PengumumanHeroSection;
