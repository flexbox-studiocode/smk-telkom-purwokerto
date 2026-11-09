import PageHeroCarousel from '../../components/PageHeroCarousel';
import { useLanguage } from '../../context/LanguageContext';
import { formatPublicDate } from '../../utils/publicContent';
import { useEffect, useState } from 'react';
import { ArrowRight, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { beritaHero, breakingNews } from '../../data/dummyData';
import HeroBreadcrumb from '../HeroBreadcrumb';
import HeroBadges from '../HeroBadges';
import HeroQuickAccess from '../HeroQuickAccess';
import hero640 from '../../assets/banners/berita-640.webp';
import hero960 from '../../assets/banners/berita-960.webp';

const BeritaHeroSection = ({ items = [] }) => {
  const { t, locale, language } = useLanguage();
  const [title, subtitle] = t(beritaHero.title).split('\n');

  const [i, setI] = useState(0);
  const breakingItems = items;

  // Ticker berganti otomatis; dijeda saat kursor menyentuh baris berita.
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return undefined;
    if (breakingItems.length === 0) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % breakingItems.length), 5000);
    return () => clearInterval(t);
  }, [paused, breakingItems.length]);

  const item = breakingItems[i % breakingItems.length];

  return (
    <section className="school-hero">
      <div className="hero-container">
        <PageHeroCarousel page="berita"><div className="hero-panel hero-panel--bleed hero-panel--news">
          <div className="hero-grid">
            <div className="hero-copy">
              <HeroBreadcrumb parent="Informasi" parentTo={null} current="Berita" />
              <HeroBadges />

              <h1 className="mt-3 whitespace-pre-line font-heading text-3xl sm:text-4xl lg:text-[1.75rem] xl:text-[2rem] font-extrabold leading-[1.2] tracking-tight text-dark-900">
                {language === 'en' ? 'Latest News &' : title}
                {'\n'}
                {language !== 'en' && `${subtitle} `}
                <span className="text-primary">{language === 'en' ? 'Activities' : t(beritaHero.titleAccent)}</span>
              </h1>

              <p className="mt-4 max-w-sm text-[11px] sm:text-xs leading-relaxed text-dark-500">
                {t(beritaHero.description)}
              </p>

              <a
                href="#kategori-berita"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-primary-800"
              >
                {t(beritaHero.ctaText)}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <img
              src={beritaHero.image}
              srcSet={`${hero640} 640w, ${hero960} 960w, ${beritaHero.image} 1106w`}
              sizes="(min-width: 1280px) 804px, (min-width: 1024px) 66vw, (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)"
              alt={t(beritaHero.imageAlt)}
              width="1106"
              height="656"
              fetchPriority="high"
              decoding="async"
              className="hero-image"
            />
          </div>
        </div></PageHeroCarousel>
        <HeroQuickAccess />

        {/* Baris breaking news */}
        {item && <div
          className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <span className="inline-flex flex-shrink-0 items-center gap-2 self-start rounded-lg bg-primary px-4 py-2.5 text-[11px] font-semibold tracking-figma-copy text-white sm:self-auto">
            <Megaphone className="h-3.5 w-3.5" />
            {t(breakingNews.label)}
          </span>

          <div
            aria-live="polite"
            className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-primary-50 px-4 py-2.5"
          >
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
            <p className="min-w-[12rem] flex-1 text-[11px] font-semibold tracking-figma-copy text-dark-800">{t(item.text)}</p>
            <span className="text-[10px] font-medium tracking-figma-copy text-dark-500">{formatPublicDate(item.iso, {}, locale)}</span>
            <Link
              to={`/berita/${item.slug}`}
              className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-figma-copy text-primary hover:underline"
            >{t("Baca Berita")}<ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>}
      </div>
    </section>
  );
};

export default BeritaHeroSection;
