import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

// The artwork is a single raster, so its "Ask NEXA" button is baked into the image. The link below is an
// invisible overlay on that button (percent of the image: left, top, width, height) so only the CTA navigates.
// Mobile (<768px) and desktop use different artwork, hence two boxes per language.
const CTA_BOX = {
  id: { mobile: [6.15, 88.8, 87.7, 8.07], desktop: [5.48, 70.99, 29.28, 12.29] },
  en: { mobile: [7.81, 87.3, 84.47, 7.75], desktop: [5.52, 70.86, 26.47, 12.29] },
};
const boxVars = ([left, top, width, height], key) => ({ [`--${key}l`]: `${left}%`, [`--${key}t`]: `${top}%`, [`--${key}w`]: `${width}%`, [`--${key}h`]: `${height}%` });

// Shared by the public page layout and the announcements help card.
const StelaAISection = ({ variant = 'default', className, containerClassName }) => {
  const { language } = useLanguage();
  const locale = language === 'en' ? 'en' : 'id';
  const english = locale === 'en';
  const asset = `/assets/branding/nexa-${locale}`;
  const sizes = variant === 'prestasi'
    ? '(min-width: 1844px) 1683px, (min-width: 1024px) 91.27vw, (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)'
    : '(min-width: 1280px) 1216px, (min-width: 1024px) calc(100vw - 64px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)';

  return (
    <section id="nexa" aria-label={english ? 'Ask NEXA' : 'Tanya NEXA'} className={className ?? 'bg-white py-6 lg:py-8'}>
      <div className={containerClassName ?? (variant === 'prestasi' ? 'mx-auto w-[calc(100%-2rem)] max-w-[1683px] sm:w-[calc(100%-3rem)] lg:w-[91.27%]' : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8')}>
        <div className="relative rounded-3xl">
          <picture>
            <source media="(max-width: 767px)" srcSet={`${asset}-mobile-480.webp 480w, ${asset}-mobile-768.webp 768w, ${asset}-mobile-1024.webp 1024w`} sizes="(min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)" width="1024" height="1536" />
            <img src={`${asset}-desktop-1540.webp`} srcSet={`${asset}-desktop-960.webp 960w, ${asset}-desktop-1540.webp 1540w, ${asset}-desktop-2172.webp 2172w`} sizes={sizes} width="2172" height="724" alt={english ? 'Ask NEXA anything. Get answers about study programs, facilities, achievements, and admissions at SMK Telkom Purwokerto.' : 'Tanyakan apa saja ke NEXA. Tanya seputar jurusan, fasilitas, prestasi, dan pendaftaran SMK Telkom Purwokerto.'} loading="lazy" decoding="async" className="block h-auto w-full" />
          </picture>
          <Link
            to="/nexa"
            aria-label={english ? 'Ask NEXA Now' : 'Tanya NEXA Sekarang'}
            style={{ ...boxVars(CTA_BOX[locale].mobile, 'm'), ...boxVars(CTA_BOX[locale].desktop, 'd') }}
            className="absolute left-[var(--ml)] top-[var(--mt)] h-[var(--mh)] w-[var(--mw)] rounded-[1.25rem] transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:left-[var(--dl)] md:top-[var(--dt)] md:h-[var(--dh)] md:w-[var(--dw)]"
          />
        </div>
        <div className="sr-only">
          <h2>{english ? 'Ask NEXA anything' : 'Tanyakan apa saja ke NEXA'}</h2>
          <p>{english ? 'I enjoy coding and building apps. Which program should I choose?' : 'Aku suka coding dan membuat aplikasi. Jurusan apa yang cocok?'}</p>
          <p>{english ? 'Try Software Engineering (RPL). You will learn programming, web development, and app development.' : 'Coba Rekayasa Perangkat Lunak (RPL). Kamu akan belajar pemrograman, pengembangan web, dan aplikasi.'}</p>
        </div>
      </div>
    </section>
  );
};

export default StelaAISection;
