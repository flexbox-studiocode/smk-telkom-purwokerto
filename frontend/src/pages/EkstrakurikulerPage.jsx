import PageHeroCarousel from '../components/PageHeroCarousel';
import { useLanguage } from '../context/LanguageContext';
import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import SearchResultStatus from '../components/SearchResultStatus';
import HeroBreadcrumb from '../components/HeroBreadcrumb';
import { useLenis } from 'lenis/react';
import { ArrowRight, Bookmark, BriefcaseBusiness, Search, Trophy, UsersRound, X } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import HeroBadges from '../components/HeroBadges';
import HeroQuickAccess from '../components/HeroQuickAccess';
import SectionAccents from '../components/SectionAccents';
import ContentImage from '../components/ContentImage';
import heroFigma from '../assets/ekstrakurikuler/hero-figma.webp';
import { ekstrakurikulerData } from '../data/dummyData';
import { slugify } from '../utils/slug';

const STAT_ICONS = [BriefcaseBusiness, Trophy, UsersRound, Bookmark];

const CategoryTabs = ({ activeCategory, onSelect }) => {
  const { t } = useLanguage();
  return (
  <div id="ekstrakurikuler-filters" className="mx-auto grid max-w-full grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center">
    {ekstrakurikulerData.categories.map((name) => {
      const active = activeCategory === name;
      return (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name)}
          aria-pressed={active}
          className={`min-h-11 rounded-full border px-4 font-[family-name:var(--font-poppins)] text-[clamp(.75rem,1.378cqw,1.5rem)] font-semibold tracking-[.05em] transition-colors duration-200 sm:min-w-[7.5rem] sm:px-5 ${
            active
              ? 'border-primary bg-primary text-white'
              : 'border-primary/45 bg-white text-primary hover:border-primary hover:bg-primary-50'
          }`}
        >
          {t(name === 'Ekstrakurikuler' ? 'Semua' : name)}
        </button>
      );
    })}
  </div>
  );
};

const ActivityCard = ({ item, onOpen }) => {
  const { t } = useLanguage();
  return (
  <article data-activity={item.title} className="group flex h-full flex-col overflow-hidden [container-type:inline-size] rounded-2xl border border-dark-100 bg-white transition-colors duration-200 hover:border-primary">
    <div className="aspect-[2/1] flex-none overflow-hidden">
      <ContentImage
        src={item.image}
        alt={t('Kegiatan {title}', { title: t(item.title) })}
        loading="lazy"
        className={`h-full w-full object-cover ${item.imageClassName ?? ''}`}
      />
    </div>
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4">
      <h3 className="font-heading text-[clamp(1rem,8cqw,2rem)] group-data-[activity=E-Sport]:text-[clamp(1rem,6cqw,1.5rem)] font-bold leading-normal text-primary">{t(item.title)}</h3>
      <p className="mt-1.5 line-clamp-5 text-xs group-data-[activity=E-Sport]:text-[clamp(.75rem,3.75cqw,.9375rem)] font-medium leading-normal text-dark-600">{t(item.description)}</p>
      <button
        type="button"
        onClick={(event) => onOpen(item, event.currentTarget)}
        className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-3 text-[clamp(.75rem,3.25cqw,.8125rem)] font-medium tracking-[.08em] text-primary transition-colors hover:text-primary-800"
      >{t("Selengkapnya")} <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
      </button>
    </div>
  </article>
  );
};

const CardGrid = ({ items, onOpen }) => (
  <div className="motion-filter-results grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {items.map((item) => (
      <div key={item.title} className="h-full">
        <ActivityCard item={item} onOpen={onOpen} />
      </div>
    ))}
  </div>
);

const ActivityDetailDialog = ({ item, onClose, returnFocusRef }) => {
  const { t } = useLanguage();
  const lenis = useLenis();
  const dialogRef = useRef(null);
  const backdropPointerRef = useRef(false);

  useEffect(() => {
    if (!item) return undefined;
    const trigger = returnFocusRef.current;
    const dialog = dialogRef.current;
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    lenis?.stop();
    return () => {
      lenis?.start();
      requestAnimationFrame(() => {
        if (dialog?.isConnected && dialog.open) return;
        const target = trigger?.isConnected ? trigger : document.getElementById('main-content');
        target?.focus({ preventScroll: true });
      });
    };
  }, [item, lenis, returnFocusRef]);

  if (!item) return null;

  return (
    <dialog
      ref={dialogRef}
      data-lenis-prevent
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        dialogRef.current?.close();
      }}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        backdropPointerRef.current = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
        if (backdropPointerRef.current && outside) dialogRef.current?.close();
        backdropPointerRef.current = false;
      }}
      aria-labelledby="judul-detail-kegiatan"
      className="motion-dialog m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-3xl border border-dark-200 bg-white p-0 backdrop:bg-dark-900/70"
    >
      <div data-lenis-prevent className="relative max-h-[90dvh] overflow-y-auto overscroll-contain">
        <ContentImage src={item.image} alt={t('Kegiatan {title}', { title: t(item.title) })} className={`aspect-[16/7] w-full object-cover ${item.imageClassName ?? ''}`} />
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label={t("Tutup penjelasan kegiatan")}
          className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-dark-200 bg-white text-dark-800 transition-colors hover:border-primary hover:bg-primary hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-5 sm:p-7">
          <span className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-[10px] font-bold text-primary">
            {(item.categories ?? [item.category]).map((category) => t(category)).join(' · ')}
          </span>
          <h2 id="judul-detail-kegiatan" className="mt-3 font-heading text-2xl font-extrabold text-dark-900 sm:text-3xl">
            {t(item.title)}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-dark-600">{t(item.description)}</p>
          {item.focus.length > 0 && <>
          <h3 className="mt-6 font-heading text-sm font-bold text-dark-900">{t("Yang dipelajari dan dikembangkan")}</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {item.focus.map((focus) => (
              <li key={focus} className="flex items-center gap-2 rounded-xl bg-dark-50 px-3 py-2 text-xs font-medium text-dark-700">
                <span aria-hidden="true" className="h-2 w-2 flex-none rounded-full bg-primary" />
                {t(focus)}
              </li>
            ))}
          </ul>
          </>}
        </div>
      </div>
    </dialog>
  );
};

const CategorySection = ({ activeCategory, title, items, onSelect, onOpen }) => {
  const { t } = useLanguage();
  return (
    <section
      id="daftar-ekstrakurikuler"
      className="relative overflow-hidden bg-white pb-8 lg:pb-12"
    >
      <SectionAccents variant="activities" />
      <div className="relative z-10 mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:mt-12 lg:px-8 [container-type:inline-size]">
        <CategoryTabs activeCategory={activeCategory} onSelect={onSelect} />
        <div className="mt-6 flex items-end justify-between gap-4">
          <h2 className="font-[family-name:var(--font-poppins)] text-[clamp(1.25rem,2.296cqw,2.5rem)] font-semibold tracking-[.05em] text-dark-900">{t(title)}</h2>
          <p className="text-xs text-dark-500">{t('{count} kegiatan', { count: items.length })}</p>
        </div>
        {items.length > 0 ? (
          <div className="mt-7">
            <CardGrid key={activeCategory} items={items} onOpen={onOpen} />
          </div>
        ) : (
          <p className="mt-7 rounded-2xl border border-dashed border-dark-200 py-16 text-center text-sm text-dark-500">{t("Kegiatan yang dicari belum ditemukan.")} </p>
        )}
      </div>
    </section>
  );
};

const EkstrakurikulerPage = () => {
  const { t, locale } = useLanguage();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const search = params.get('q') || '';
  const category = params.get('kategori');
  const activeCategory = ekstrakurikulerData.categories.includes(category) ? category : 'Ekstrakurikuler';
  const selectedItem = ekstrakurikulerData.items.find((item) => slugify(item.title) === params.get('kegiatan')) || null;
  const returnFocusRef = useRef(null);
  const updateFilters = (query, category) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (query) next.set('q', query); else next.delete('q');
      if (category !== 'Ekstrakurikuler') next.set('kategori', category); else next.delete('kategori');
      return next;
    }, { replace: true });
  };
  const closeActivity = () => {
    if (location.state?.activityModal) navigate(-1);
    else setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('kegiatan');
      return next;
    }, { replace: true });
  };
  const keyword = search.trim().toLocaleLowerCase(locale);

  const filteredItems = useMemo(() => ekstrakurikulerData.items.filter((item) => (
    (activeCategory === 'Ekstrakurikuler' || (item.categories ?? [item.category]).includes(activeCategory))
    && `${item.title} ${item.description} ${(item.aliases ?? []).join(' ')} ${(item.categories ?? [item.category]).map((category) => `${category} ${t(category)}`).join(' ')} ${t(item.title)} ${t(item.description)}`.toLocaleLowerCase(locale).includes(keyword)
  )), [activeCategory, keyword, locale, t]);

  const sectionTitle = keyword
    ? 'Hasil Pencarian'
    : activeCategory === 'Ekstrakurikuler' ? 'Semua kegiatan' : activeCategory;

  return (
    <MainLayout>
      <section className="school-hero">
        <div className="hero-container [container-type:inline-size]">
          <PageHeroCarousel page="ekstrakurikuler"><div className="hero-panel hero-panel--bleed hero-panel--activities">
            <div className="hero-grid">
            <div className="hero-copy">
              <HeroBreadcrumb current="Ekstrakurikuler" />
              <HeroBadges />
              <h1 className="mt-4 font-heading text-3xl font-extrabold leading-[1.2] tracking-tight text-dark-900 sm:text-4xl lg:text-[1.75rem] xl:text-[2rem]">
                {t(ekstrakurikulerData.title)}
              </h1>
              <p className="mt-2 text-sm font-medium text-dark-500">{t(ekstrakurikulerData.subtitle)}</p>

              <label className="mt-5 flex h-11 w-full max-w-md items-center rounded-full border border-dark-200 bg-white pl-4 focus-within:border-primary">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    updateFilters(event.target.value, 'Ekstrakurikuler');
                  }}
                  aria-label={t("Cari kegiatan")}
                  placeholder={t("Cari Kegiatan....")}
                  className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-poppins)] text-[clamp(.75rem,1.148cqw,1.25rem)] font-normal tracking-[.05em] text-dark-700 outline-none placeholder:text-dark-400"
                />
                <span className="mr-1 grid h-9 w-9 flex-none place-items-center rounded-full bg-primary text-white">
                  <Search className="h-4 w-4" />
                </span>
              </label>

              <div className="mt-7 grid max-w-md grid-cols-2 gap-x-4 gap-y-5">
                {ekstrakurikulerData.stats.map((stat, index) => {
                  const Icon = STAT_ICONS[index];
                  return (
                    <div key={stat.label} className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                      <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-primary text-white sm:h-10 sm:w-10">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-[family-name:var(--font-poppins)] text-[clamp(.625rem,.918cqw,1rem)] font-light tracking-normal sm:tracking-[.05em] leading-normal text-dark-600">{t(stat.label)}</p>
                        <p className="mt-0.5 font-[family-name:var(--font-poppins)] text-[clamp(1.125rem,1.378cqw,1.5rem)] font-semibold tracking-[.05em] leading-normal text-dark-900">{stat.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hero-media relative">
              <img
                src={heroFigma}
                alt={t("Siswa SMK Telkom Purwokerto mengeksplorasi teknologi")}
                width="1999"
                height="1007"
                fetchPriority="high"
                className="hero-image"
              />
            </div>
          </div>
        </div></PageHeroCarousel>
        <HeroQuickAccess />
        </div>
      </section>

      <SearchResultStatus message={t('{count} kegiatan ditemukan', { count: filteredItems.length })} />
      <CategorySection
        activeCategory={activeCategory}
        title={sectionTitle}
        items={filteredItems}
        onSelect={(category) => {
          updateFilters('', category);
        }}
        onOpen={(item, trigger) => {
          returnFocusRef.current = trigger;
          setParams((current) => {
            const next = new URLSearchParams(current);
            next.set('kegiatan', slugify(item.title));
            return next;
          }, { state: { activityModal: true } });
        }}
      />
      <ActivityDetailDialog item={selectedItem} onClose={closeActivity} returnFocusRef={returnFocusRef} />
    </MainLayout>
  );
};

export default EkstrakurikulerPage;
