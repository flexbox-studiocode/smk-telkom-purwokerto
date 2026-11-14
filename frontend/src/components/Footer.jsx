import { LockKeyhole, Mail, MapPin, Phone } from 'lucide-react';
import { FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import VisitorCounter from './VisitorCounter';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { footerData as defaults } from '../data/dummyData';
import footerAccentFill from '../assets/footer/footer-motif-fill.svg';
import flexboxLogo from '../assets/footer/flexbox-logo.webp';
import { useLanguage } from '../context/LanguageContext';

const socialIcons = {
  instagram: FaInstagram,
  youtube: FaYoutube,
  tiktok: FaTiktok,
};

const FooterAccent = ({ node }) => (
  <div className="footer-accent" data-figma-node={node}>
    <img src={footerAccentFill} alt="" className="footer-accent-shape" />
  </div>
);

const LinkColumn = ({ title, links }) => {
  const { t } = useLanguage();
  return (
  <div className="min-w-0">
    <h2 className="footer-link-heading text-dark-900">{t(title)}</h2>
    <ul className="footer-link-list mt-3 space-y-2">
      {links.map((link) => (
        <li key={link.label}>
          <Link
            to={link.href}
            className="text-dark-500 transition-colors hover:text-primary"
          >
            {t(link.label)}
          </Link>
        </li>
      ))}
    </ul>
  </div>
  );
};

const Footer = () => {
  const { settings } = useSiteSettings();
  const footerData = settings ? {...defaults, kontak:{...defaults.kontak,address:settings.address,phone:settings.phone,email:settings.email,mapsQuery:settings.address}} : defaults;
  const { t } = useLanguage();
  const schoolMap = (
    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(footerData.kontak.mapsQuery ?? footerData.kontak.address)}`} target="_blank" rel="noopener noreferrer" aria-label={t('Buka lokasi SMK Telkom Purwokerto di Google Maps')} className="mt-3 block self-start overflow-hidden rounded-xl transition-transform hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
      <img src={footerData.map} alt={t('Peta lokasi SMK Telkom Purwokerto')} width="760" height="354" loading="lazy" decoding="async" className="h-auto w-full border border-dark-100" />
    </a>
  );
  return (
  <footer className="site-footer bg-white">
    <div className="relative overflow-hidden pt-6 lg:pt-8">
      {/* Accent Element / Group 478: original masks, positions and rotations. */}
      <div aria-hidden="true" className="footer-accent-side footer-accent-side-left pointer-events-none select-none">
        {['125:161', '125:167'].map((node) => <FooterAccent key={node} node={node} />)}
      </div>
      <div aria-hidden="true" className="footer-accent-side footer-accent-side-right pointer-events-none select-none">
        <FooterAccent node="125:164" />
      </div>

      <div className="footer-content relative z-10 mx-auto px-4 pb-2 sm:px-6 lg:pb-3 max-w-7xl lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 lg:gap-x-8 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1.3fr]">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <a href={settings?.website || '/'} className="flex items-center gap-3">
              <Logo className="h-11 w-11" />
              <span className="footer-brand-name text-dark-900">
                {settings?.school_name || <>SMK Telkom<br />Purwokerto</>}
              </span>
            </a>
            <p className="footer-tagline mt-3 text-dark-500 max-w-xs">
              {t(footerData.tagline)}
            </p>
            <div className="mt-4 flex items-center gap-3">
              {footerData.socials.map((social) => {
                const Icon = socialIcons[social.icon];
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${social.name} SMK Telkom Purwokerto`}
                    className="relative text-dark-500 transition-colors hover:text-primary before:absolute before:-inset-2 before:content-['']"
                  >
                  <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>

            <div className="mt-4 max-w-[280px]">
              <h2 className="footer-link-heading text-dark-900">Supported by:</h2>
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={flexboxLogo}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width="192"
                  height="190"
                  className="h-auto w-12 shrink-0 object-contain"
                />
                <span className="font-heading text-base font-bold text-dark-900">Flexbox</span>
              </div>
            </div>

          </div>

          <div className="min-w-0">
            <LinkColumn title="Menu" links={footerData.menu} />
            <div className="mt-6">
              <VisitorCounter />
            </div>
          </div>
          <LinkColumn title="Informasi" links={footerData.informasi} />

          {/* Kontak */}
          <div className="footer-contact col-span-2 min-w-0 [overflow-wrap:anywhere] lg:col-span-1">
            <h2 className="footer-link-heading text-dark-900">{t('Kontak')}</h2>
            <ul className="footer-contact-list mt-3 space-y-2 text-dark-500">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                {t(footerData.kontak.address)}
              </li>
              <li>
                <a
                  href={`tel:${footerData.kontak.phone.replace(/[^+\d]/g, '')}`}
                  className="flex items-start gap-2 transition-colors hover:text-primary"
                >
                  <Phone className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  {footerData.kontak.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${footerData.kontak.email}`}
                  className="flex items-start gap-2 transition-colors hover:text-primary"
                >
                  <Mail className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  {footerData.kontak.email}
                </a>
              </li>
            </ul>
            {schoolMap}
          </div>
        </div>
      </div>

      {/* Both accent canvases share the same bottom edge. */}
      <div aria-hidden="true" className="footer-accent-band pointer-events-none select-none">
        <div className="footer-accent-canvas">
          {['125:136', '125:139', '125:142', '125:145', '125:148'].map((node) => <FooterAccent key={node} node={node} />)}
        </div>
      </div>
    </div>
    <div className="footer-bottom-bar relative bg-primary text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 pl-4 pr-24 py-2 text-[11px] sm:flex-row sm:pl-6 lg:pl-8 2xl:pr-8">
        <p>© 2026 {settings?.school_name || 'SMK Telkom Purwokerto'}. All Rights Reserved.</p>
        <div className="flex flex-col items-center gap-1 min-[360px]:flex-row min-[360px]:gap-3">
          <Link
            to="/kebijakan-privasi"
            className="whitespace-nowrap underline underline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {t('Kebijakan Privasi')}
          </Link>
          <span aria-hidden="true" className="hidden h-3 border-l border-white/60 min-[360px]:block" />
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 whitespace-nowrap underline-offset-2 transition-opacity hover:opacity-80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <LockKeyhole className="h-3 w-3" aria-hidden="true" />
            {t('Akses Staf & Admin')}
          </Link>
        </div>
      </div>
    </div>
  </footer>
  );
};

export default Footer;
