import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import navbarLogo from '../assets/landing/beranda-navbar-logo.png';
import LanguageToggle from './LanguageToggle';
import { useLanguage } from '../context/LanguageContext';
import { ctaMasukPpdb, navLinks } from '../data/dummyData';
import { isSectionRoute } from '../utils/navigation';
import './Navbar.css';

const prefetchByHref = {
  '/fasilitas': () => import('../pages/FasilitasPage'),
  '/profil-sekolah': () => import('../pages/TentangPage'),
  '/profil-sekolah/guru': () => import('../pages/GuruPage'),
  '/ekstrakurikuler': () => import('../pages/EkstrakurikulerPage'),
  '/jurusan': () => import('../pages/JurusanPage'),
  '/prestasi': () => import('../pages/PrestasiPage'),
  '/bkk': () => import('../pages/BkkPage'),
  '/sinergi': () => import('../pages/SinergiPage'),
  '/berita': () => import('../pages/BeritaPage'),
  '/pengumuman': () => import('../pages/PengumumanPage'),
  '/kalender': () => import('../pages/KalenderPage'),
  '/spmb': () => import('../pages/SpmbPage'),
  '/nexttel': () => import('../pages/NextTelPage'),
};

const prefetchRoute = (href) => {
  prefetchByHref[href]?.()?.catch(() => {}); // RouteErrorBoundary handles failures when navigating.
};

// External services open separately; planned services use local coming-soon pages.
const SubmenuLink = ({ child, children, ...props }) => {
  if (/^https?:\/\//.test(child.href)) return <a {...props} href={child.href} target="_blank" rel="noopener noreferrer">{children}</a>;
  return <Link {...props} to={child.href}>{children}</Link>;
};

const Navbar = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const headerRef = useRef(null);
  const desktopMenuRef = useRef(null);
  const desktopTriggerRef = useRef(null);
  const mobileTriggerRef = useRef(null);

  useEffect(() => {
    if (!isMobileOpen && !openDropdown) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      (isMobileOpen ? mobileTriggerRef : desktopTriggerRef).current?.focus();
      setIsMobileOpen(false);
      setOpenDropdown(null);
    };
    const onPointerDown = (event) => {
      const container = isMobileOpen ? headerRef.current : desktopMenuRef.current;
      if (container?.contains(event.target)) return;
      setIsMobileOpen(false);
      setOpenDropdown(null);
    };
    const onFocusIn = (event) => {
      if (!isMobileOpen && !headerRef.current?.contains(event.target)) setOpenDropdown(null);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [isMobileOpen, openDropdown]);

  const navLabel = (link) => t(language === 'en' && link.label === 'Jurusan' ? 'Navigasi jurusan' : link.label);

  const isActive = (link) =>
    link.children
      ? link.children.some((child) => child.href?.startsWith('/') && isSectionRoute(location.pathname, child.href))
      : isSectionRoute(location.pathname, link.href);

  const currentPage = (href) => location.pathname === href ? 'page' : isSectionRoute(location.pathname, href) ? 'location' : undefined;

  const linkClass = (link) =>
    `navbar-link relative inline-flex items-center whitespace-nowrap py-1.5 transition-colors ${
      isActive(link) ? 'text-primary' : 'text-dark-600 hover:text-primary'
    }`;

  const activeBar = (link) =>
    isActive(link) ? (
      <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-primary" />
    ) : null;

  return (
    <header ref={headerRef} className="site-navbar sticky top-0 z-[60] w-full bg-white font-sans">
      <nav aria-label={t('Navigasi utama')} className="mx-auto max-w-[1440px] px-6 sm:px-8">
        <div className="flex h-16 lg:h-[88px] items-center justify-between gap-3">
          {/* Brand */}
          <Link to="/" aria-current={currentPage('/')} className="flex items-center gap-2.5 flex-shrink-0 xl:justify-self-start">
            <img src={navbarLogo} alt="SMK Telkom Purwokerto" width={257} height={74} className="h-[2.875rem] w-40 object-contain object-left lg:h-[3.25rem] lg:w-[11.25rem]" />
          </Link>

          {/* Desktop menu */}
          <div className="hidden min-[1152px]:flex items-center gap-5 xl:gap-7">
            {navLinks.map((link) => {
              if (!link.children) {
                return (
                  <Link key={link.label} to={link.href} aria-current={currentPage(link.href)} className={linkClass(link)} onClick={() => setOpenDropdown(null)} onFocus={() => prefetchRoute(link.href)} onMouseEnter={() => prefetchRoute(link.href)}>
                    {navLabel(link)}
                    {activeBar(link)}
                  </Link>
                );
              }

              return (
                <div
                  key={link.label}
                  ref={openDropdown === link.label ? desktopMenuRef : undefined}
                  className="relative"
                  onMouseEnter={() => {
                    link.children.forEach((child) => prefetchRoute(child.href));
                    if (!isMobileOpen && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setOpenDropdown(link.label);
                  }}
                  onMouseLeave={(event) => {
                    if (isMobileOpen) return;
                    if (!event.currentTarget.contains(document.activeElement) || !document.activeElement.matches(':focus-visible')) setOpenDropdown(open => open === link.label ? null : open);
                  }}
                  onFocus={(event) => {
                    if (!isMobileOpen && event.target.matches(':focus-visible') && !event.currentTarget.contains(event.relatedTarget)) setOpenDropdown(link.label);
                  }}
                  onBlur={(event) => {
                    if (!isMobileOpen && !event.currentTarget.contains(event.relatedTarget)) setOpenDropdown(open => open === link.label ? null : open);
                  }}
                >
                  <button
                    type="button"
                    ref={openDropdown === link.label ? desktopTriggerRef : undefined}
                    onClick={(event) => {
                      // A mouse click on a menu already opened by hover must not close it;
                      // keyboard (detail 0) and touch still toggle.
                      const mouseOnHoverMenu = event.detail > 0 && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
                      setOpenDropdown((open) => open === link.label && !mouseOnHoverMenu ? null : link.label);
                    }}
                    onKeyDown={(event) => {
                      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
                      event.preventDefault();
                      const container = event.currentTarget.parentElement;
                      setOpenDropdown(link.label);
                      requestAnimationFrame(() => {
                        const children = container.querySelectorAll('a');
                        (event.key === 'ArrowDown' ? children[0] : children[children.length - 1])?.focus();
                      });
                    }}
                    className={`${linkClass(link)} inline-flex items-center gap-1`}
                    aria-expanded={openDropdown === link.label}
                    aria-controls={`desktop-${link.label.toLowerCase()}-links`}
                  >
                    {navLabel(link)}
                    <ChevronDown
                      className="block h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    {activeBar(link)}
                  </button>

                  {openDropdown === link.label && (
                    <div
                      className="navbar-dropdown-enter absolute left-1/2 top-full z-20 max-h-[min(70dvh,32rem)] w-48 -translate-x-1/2 overflow-y-auto overscroll-contain rounded-xl border border-dark-100 bg-white p-2 shadow-lg"
                      data-lenis-prevent
                      id={`desktop-${link.label.toLowerCase()}-links`}
                      aria-label={t(`Submenu ${link.label}`)}
                    >
                      {link.children.map((child) => (
                        <SubmenuLink
                          key={child.label}
                          child={child}
                          aria-current={currentPage(child.href)}
                          onFocus={() => prefetchRoute(child.href)}
                          onMouseEnter={() => prefetchRoute(child.href)}
                          onClick={() => setOpenDropdown(null)}
                          className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            location.pathname === child.href
                              ? 'bg-primary-50 text-primary'
                              : 'text-dark-700 hover:bg-dark-50 hover:text-primary'
                          }`}
                        >
                          {t(child.label)}
                        </SubmenuLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop CTA */}
          <div className="ml-auto flex shrink-0 items-center gap-3 min-[1152px]:ml-0">
            <LanguageToggle />
            <Link
              to={ctaMasukPpdb.href}
              className="navbar-cta hidden min-[1152px]:inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 py-3 text-white transition-colors hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t(ctaMasukPpdb.label)}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            ref={mobileTriggerRef}
            onClick={() => { setIsMobileOpen((open) => !open); setOpenDropdown(null); }}
            className="min-[1152px]:hidden flex h-11 w-11 items-center justify-center rounded-lg text-dark-600 hover:bg-dark-50"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-nav"
            aria-label={t(isMobileOpen ? 'Tutup menu' : 'Buka menu')}
          >
            {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMobileOpen && (
          <div id="mobile-nav" data-lenis-prevent className="motion-menu-enter max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-88px)] min-[1152px]:hidden border-t border-dark-100 py-4">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                if (!link.children) {
                  return (
                    <Link
                      key={link.label}
                      to={link.href}
                      aria-current={currentPage(link.href)}
                      onFocus={() => prefetchRoute(link.href)}
                      onMouseEnter={() => prefetchRoute(link.href)}
                      onClick={() => { setIsMobileOpen(false); setOpenDropdown(null); }}
                      className={`min-h-11 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-dark-50 ${isActive(link) ? 'text-primary' : 'text-dark-700'}`}
                    >
                      {navLabel(link)}
                    </Link>
                  );
                }

                return (
                  <div key={link.label}>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown((open) => open === link.label ? null : link.label)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-dark-50 ${isActive(link) ? 'text-primary' : 'text-dark-700'}`}
                      aria-expanded={openDropdown === link.label}
                      aria-controls={`mobile-${link.label.toLowerCase()}-links`}
                    >
                      {navLabel(link)}
                      <ChevronDown
                        className="block h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                    </button>
                    {openDropdown === link.label && (
                      <div id={`mobile-${link.label.toLowerCase()}-links`} className="motion-menu-enter ml-3 border-l border-dark-100 py-1 pl-2">
                        {link.children.map((child) => (
                          <SubmenuLink
                            key={child.label}
                            child={child}
                            aria-current={currentPage(child.href)}
                            onFocus={() => prefetchRoute(child.href)}
                            onMouseEnter={() => prefetchRoute(child.href)}
                            onClick={() => {
                              setOpenDropdown(null);
                              setIsMobileOpen(false);
                            }}
                            className="block min-h-11 rounded-lg px-3 py-3 text-sm font-medium text-dark-600 hover:bg-dark-50 hover:text-primary"
                          >
                            {t(child.label)}
                          </SubmenuLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <Link
                to={ctaMasukPpdb.href}
                onClick={() => setIsMobileOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {t(ctaMasukPpdb.label)}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
