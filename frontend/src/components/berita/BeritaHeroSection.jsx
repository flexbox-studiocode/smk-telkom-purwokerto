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

        {/* Baris breaking news: judul berita jadi konten utama, seluruh banner bisa diklik */}
        {item && <div
          className="news-breaking mt-5 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <span className="inline-flex flex-shrink-0 items-center gap-2 self-start rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white sm:self-auto">
            <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
            {t(breakingNews.label)}
          </span>

          <div
            aria-live="polite"
            className="group relative flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-primary/10 bg-primary-50/70 px-4 py-3 transition-colors duration-200 hover:border-primary/25 hover:bg-primary-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/60 sm:flex-row sm:items-center sm:gap-4"
          >
            <p className="flex min-w-0 flex-1 items-start gap-2.5 text-sm font-semibold leading-snug text-dark-900 sm:items-center">
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary sm:mt-0" />
              <span className="line-clamp-2">{t(item.title)}</span>
            </p>
            <div className="flex flex-shrink-0 items-center justify-between gap-4 pl-[1.125rem] sm:justify-end sm:pl-0">
              <time dateTime={item.iso} className="text-xs text-dark-500">{formatPublicDate(item.iso, {}, locale)}</time>
              <Link
                to={`/berita/${item.slug}`}
                className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
              >
                {t("Baca Berita")}
                <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>}
      </div>
    </section>
  );
};

export default BeritaHeroSection;
