import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import HeroBadges from './HeroBadges';
import HeroBreadcrumb from './HeroBreadcrumb';
import hero640 from '../assets/landing/beranda-hero-640.webp';
import hero960 from '../assets/landing/beranda-hero-960.webp';
import heroPanel from '../assets/landing/beranda-hero.webp';

export default function HeroPanel({ content, media, breadcrumb, carousel = false, priority = true, heading = 'h1' }) {
  const Heading = heading;
  const { t, language } = useLanguage();
  const artwork = <img
    src={language === 'en' && media?.srcEn ? media.srcEn : media?.src || heroPanel}
    srcSet={language === 'en' && media?.srcEn ? undefined : media?.srcSet || (!media?.src ? `${hero640} 640w, ${hero960} 960w, ${heroPanel} 1208w` : undefined)}
    sizes="(min-width: 80rem) 876px, (min-width: 64rem) 72vw, (min-width: 40rem) calc(100vw - 3rem), calc(100vw - 2rem)"
    alt={t(media?.alt || 'Siswa SMK Telkom Purwokerto')}
    width={media?.width || 1208} height={media?.height || 679}
    loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'low'} decoding="async"
    className={`hero-image ${media?.className || ''} ${language === 'en' && media?.srcEn ? 'hero-carousel-profile-en' : ''}`}
  />;
  return <div className={`hero-panel hero-panel--slide hero-panel--floating hero-panel--bleed hero-panel--${media?.composition || 'students'}`}>
    <div className="hero-grid">
      <div className="hero-copy">
        {breadcrumb && <HeroBreadcrumb {...breadcrumb} />}
        <HeroBadges tags={content.hashtags} />
        <Heading className="mt-4 font-heading text-3xl sm:text-4xl lg:text-[1.75rem] xl:text-[1.875rem] font-extrabold leading-[1.2] tracking-tight text-dark-900">
          {t(content.title)}{content.titleAccent && <><br /><span className="whitespace-pre-line text-primary">{t(content.titleAccent)}</span></>}
          {heading === 'h1' && <span className="sr-only"> — SMK Telkom Purwokerto</span>}
        </Heading>
        <p className="mt-4 max-w-md text-xs sm:text-sm leading-relaxed text-dark-500">{t(content.description)}</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link to={content.primaryCta.href} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            {t(content.primaryCta.label)}<ArrowRight aria-hidden="true" className="w-4 h-4" />
          </Link>
          {content.secondaryCta && <Link to={content.secondaryCta.href} className="inline-flex items-center gap-2 rounded-full border border-dark-200 bg-white px-6 py-3 text-sm font-semibold text-dark-700 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            {t(content.secondaryCta.label)}<ArrowRight aria-hidden="true" className="w-4 h-4" />
          </Link>}
        </div>
      </div>
      {carousel ? <div className={`hero-media relative ${media?.photo ? 'hero-media--photo' : ''}`}>
        {language === 'en' && media?.srcEn ? <div className="hero-carousel-profile-crop">{artwork}</div> : artwork}
        {media?.logo && <span aria-hidden="true" className="absolute left-[57%] top-[34.61%] aspect-[107/105] w-[9.35%] overflow-hidden rounded-[14%] bg-white">
          <span className="absolute inset-x-[14.95%] bottom-[10.48%] top-[11.43%] overflow-hidden"><img src={media.logo} alt="" className="absolute left-[-0.18%] top-0 h-full w-[346.21%] max-w-none" /></span>
        </span>}
      </div> : artwork}
    </div>
  </div>;
}
