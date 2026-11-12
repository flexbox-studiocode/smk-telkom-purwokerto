import WaveMarquee from '../components/WaveMarquee';
import PageHeroCarousel from '../components/PageHeroCarousel';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import { ArrowRight } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import HeroBadges from '../components/HeroBadges';
import Modal from '../components/dashboard/Modal';
import ContentImage from '../components/ContentImage';
import HeroBreadcrumb from '../components/HeroBreadcrumb';
import CampusExplorer from '../components/fasilitas/CampusExplorer';
import { campusFacilities, campusIdForCard } from '../data/campusData';
import { useLanguage } from '../context/LanguageContext';
import { fasilitasCategories as categories, fasilitasViews } from '../data/fasilitasPageData';
import { ctaMasukPpdb, quickLinks } from '../data/dummyData';
import hero from '../assets/fasilitas/hero-1144.webp';
import hero640 from '../assets/fasilitas/hero-640.webp';
import hero960 from '../assets/fasilitas/hero-960.webp';
import heroLogo from '../assets/fasilitas/hero-logo.png';
import headingIcon from '../assets/fasilitas/heading-icon.svg';
import headingUnderline from '../assets/fasilitas/heading-underline.svg';
import classroomIcon from '../assets/fasilitas/quick-classroom.svg';
import tourIcon from '../assets/fasilitas/quick-tour.svg';
import quickArrow from '../assets/fasilitas/quick-arrow.svg';
import FacilityNametag from '../components/fasilitas/FacilityNametag';
import '../styles/fasilitas.css';

const nexaIcon = '/assets/branding/nexa-mark.png';
const nexttelIcon = '/assets/branding/nexttel-mark.png';

const facilityQuickLinks = [
  { title: 'Ruang Kelas', desc: 'Ruang kelas nyaman berbasis teknologi', linkLabel: 'Lihat Sekarang', href: '/fasilitas?kategori=Kelas#daftar-fasilitas', image: classroomIcon },
  { title: 'School Tour', desc: 'Jelajahi fasilitas modern sekolah kami', linkLabel: 'Jelajah Sekarang', href: '#school-tour', image: tourIcon },
  { ...quickLinks[1], image: nexaIcon },
  { ...quickLinks[2], title: 'NexTel', image: nexttelIcon },
];

function GroupTitle({ title, t }) {
  return <FacilityNametag>{t(title)}</FacilityNametag>;
}

function FacilityPhotos({ item, t }) {
  const [index, setIndex] = useState(0);
  const [photos, setPhotos] = useState(item.photos);
  useEffect(() => {
    if (!item.classroomGallery) return undefined;
    let active = true;
    import('../data/classroomPhotos').then(({ classroomPhotos }) => {
      if (active) setPhotos(classroomPhotos[item.photoKey] || item.photos);
    }).catch(() => {}); // The cover stays usable if the optional gallery chunk cannot load.
    return () => { active = false; };
  }, [item.classroomGallery, item.photoKey, item.photos]);
  const photo = photos?.[index];
  return <>
    <ContentImage src={photo?.src || item.image} srcSet={photo?.srcSet} sizes="(min-width: 704px) 624px, calc(100vw - 5rem)" alt={t('Foto fasilitas {name}', { name: t(item.photoKey) })} width={photo?.width} height={photo?.height} decoding="async" className="aspect-[4/3] w-full rounded-xl object-cover object-center" />
    {item.photoNote && <p className="mt-3 text-xs leading-relaxed text-dark-500">{t(item.photoNote, { name: t(item.photoKey) })}</p>}
    {photos && <>
      <p className="mt-3 text-xs text-dark-600" aria-live="polite">{t('Foto {current} dari {total}', { current: index + 1, total: photos.length })}</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-2" role="group" aria-label={t('Foto fasilitas {name}', { name: t(item.name) })}>
        {photos.map((candidate, photoIndex) => <button key={candidate.source} type="button" aria-pressed={photoIndex === index} aria-label={t('Lihat foto {number} untuk {name}', { number: photoIndex + 1, name: t(item.name) })} onClick={() => setIndex(photoIndex)} className={`w-20 shrink-0 overflow-hidden rounded-lg border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${photoIndex === index ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}>
          <ContentImage src={candidate.thumbnail} alt="" width="320" height="240" loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
        </button>)}
      </div>
    </>}
  </>;
}

function FacilityCardPhoto({ item, t }) {
  const container = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={container} className="h-full w-full">
    {visible && <ContentImage src={item.image} srcSet={item.photos[0].srcSet} sizes="(min-width: 1847px) 357px, (min-width: 1024px) 22vw, (min-width: 640px) 45vw, calc(100vw - 32px)" alt={t('Foto fasilitas {name}', { name: t(item.photoKey) })} width={item.photos[0].width} height={item.photos[0].height} loading="lazy" decoding="async" className="block h-full w-full object-cover object-center" />}
  </div>;
}

export default function FasilitasPage() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const requested = params.get('kategori');
  const category = categories.includes(requested) ? requested : 'Semua';
  const [selected, setSelected] = useState(null);
  const [mapRequest, setMapRequest] = useState(null);
  const campusActionFrame = useRef(null);
  const selectedCampusId = selected ? campusIdForCard(selected) : null;
  const selectedCampus = selectedCampusId ? campusFacilities[selectedCampusId].content : null;
  // Skip the map note when it only repeats the card's own description (RPS cards share one text with the map).
  const campusNote = selectedCampus && selectedCampus.preview !== selected.preview ? selectedCampus.preview || 'Deskripsi fasilitas ini sedang disiapkan.' : null;
  const lenis = useLenis();
  const groups = fasilitasViews[category];
  const count = groups.reduce((total, group) => total + group.items.length, 0);
  const [titleStart, ...titleEnd] = t('Fasilitas Sekolah').split(' ');

  useEffect(() => {
    if (!selected) return undefined;
    lenis?.stop();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; lenis?.start(); };
  }, [selected, lenis]);

  const selectCategory = name => {
    const next = new URLSearchParams(params);
    if (name === 'Semua') next.delete('kategori');
    else next.set('kategori', name);
    setParams(next, { replace: true });
  };
  useEffect(() => () => cancelAnimationFrame(campusActionFrame.current), []);
  const viewCampusList = list => {
    if (list.category) selectCategory(list.category);
    cancelAnimationFrame(campusActionFrame.current);
    campusActionFrame.current = requestAnimationFrame(() => {
      const target = list.item ? document.querySelector(`[data-facility-card="${list.item}"]`) : document.getElementById(`fasilitas-${list.group}`);
      (target || document.getElementById('daftar-fasilitas'))?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      target?.querySelector('button')?.focus({ preventScroll: true });
    });
  };
  const locateCampus = () => {
    setSelected(null);
    cancelAnimationFrame(campusActionFrame.current);
    campusActionFrame.current = requestAnimationFrame(() => setMapRequest(current => ({ id: selectedCampusId, roomName: selected?.name, sequence: (current?.sequence || 0) + 1 })));
  };

  return (
    <MainLayout showOpeningMarquee={false}>
        <section aria-labelledby="fasilitas-hero-title" className="school-hero hero-container">
          <PageHeroCarousel page="fasilitas"><div className="hero-panel hero-panel--background hero-panel--floating hero-panel--bleed hero-panel--facilities">
            <div className="hero-background relative aspect-[1144/679]">
              <img src={hero} srcSet={`${hero640} 640w, ${hero960} 960w, ${hero} 1144w`} sizes="(min-width: 1280px) 795px, (min-width: 1024px) 65vw, calc(100vw - 2rem)" alt={t('Kolase ruang kelas dan laboratorium SMK Telkom Purwokerto')} width="1144" height="679" fetchPriority="high" decoding="async" className="block h-full w-full object-cover" />
              <span aria-hidden="true" className="absolute left-[57%] top-[34.61%] aspect-[107/105] w-[9.35%] overflow-hidden rounded-[14%] bg-white">
                <span className="absolute inset-x-[14.95%] bottom-[10.48%] top-[11.43%] overflow-hidden"><img src={heroLogo} alt="" className="absolute left-[-0.18%] top-0 h-full w-[346.21%] max-w-none" /></span>
              </span>
            </div>
            <div className="hero-copy">
              <HeroBreadcrumb current="Fasilitas Sekolah" />
              <HeroBadges />
              <h1 id="fasilitas-hero-title" className="mt-4 font-heading text-3xl font-extrabold leading-[1.2] tracking-tight text-dark-900 sm:text-4xl lg:text-[1.75rem] xl:text-[2rem]">
                {t('Ruang Kelas Modern,')}<br /><span className="text-primary">{t('Tempat Inspirasi dan Inovasi Dimulai')}</span>
              </h1>
              <p className="mt-4 max-w-md text-xs leading-relaxed text-dark-500 sm:text-sm">{t('Kami menghadirkan lingkungan belajar yang bersih, representatif, dan berbasis teknologi untuk memicu kreativitas serta produktivitas siswa dalam menguasai keahlian masa depan.')}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={ctaMasukPpdb.href} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{t(ctaMasukPpdb.label)}<ArrowRight aria-hidden="true" className="size-4" /></Link>
                <Link to="#daftar-fasilitas" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-dark-200 bg-white px-6 py-3 text-sm font-semibold text-dark-700 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{t('Lihat Fasilitas')}<ArrowRight aria-hidden="true" className="size-4" /></Link>
              </div>
            </div>
          </div></PageHeroCarousel>
          <div data-facilities-quick-access className="hero-floating hero-floating--quick overflow-hidden">
            <div className="grid grid-cols-1 divide-y divide-dark-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
              {facilityQuickLinks.map((item, index) => <div key={item.title} className={`quick-access-card flex min-w-0 gap-3 px-4 py-3 ${index % 2 ? 'sm:border-l sm:border-dark-200' : ''} ${index >= 2 ? 'sm:border-t sm:border-dark-200 lg:border-t-0' : ''} ${index === 2 ? 'lg:border-l lg:border-dark-200' : ''}`}>
                <span aria-hidden="true" className="quick-access-icon relative flex size-10 shrink-0 items-center justify-center self-start rounded-lg bg-primary">
                  <img src={item.image} alt="" className={`h-auto max-h-[80%] object-contain ${index === 0 ? 'w-[47%]' : index === 1 ? 'w-[57%]' : index === 2 ? 'w-[69%]' : 'w-[80%]'}`} />
                </span>
                <div className="quick-access-content min-w-0 flex-1">
                  <p className="quick-access-title font-heading font-bold text-dark-900">{t(item.title)}</p>
                  <p className="quick-access-description text-dark-600">{t(item.desc)}</p>
                  <Link to={item.href} onClick={index === 0 ? () => viewCampusList({}) : undefined} className="quick-access-cta inline-flex min-h-11 items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{t(item.linkLabel)}<img src={quickArrow} alt="" aria-hidden="true" className="h-auto w-3 shrink-0" /></Link>
                </div>
              </div>)}
            </div>
          </div>
        </section>
        <div className="campus-tour-composition"><CampusExplorer request={mapRequest} onViewFacilities={viewCampusList} /><WaveMarquee /></div>
        <section id="daftar-fasilitas" aria-labelledby="fasilitas-title" className="relative isolate scroll-mt-28 bg-white py-8 lg:py-12">
        {['right', 'left'].map(side => <div key={side} aria-hidden="true" className={`facility-chain facility-chain--${side}`} />)}
          <div className="facility-content mx-auto max-w-[1644px]">
            <h2 id="fasilitas-title" className="mx-auto flex w-fit max-w-full items-center justify-center gap-2 font-heading text-2xl font-bold leading-tight text-black sm:gap-3 sm:text-3xl">
              <img src={headingIcon} alt="" aria-hidden="true" className="size-12 shrink-0 sm:size-16 lg:size-[clamp(4rem,5.52vw,6.375rem)]" />
              <span className="relative"><span className="text-[#cd091d]">{titleStart}</span> {titleEnd.join(' ')}<img src={headingUnderline} alt="" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px w-full" /></span>
            </h2>
            <div className="facility-filters mt-7 lg:mt-10" role="group" aria-label={t('Filter fasilitas')}>
              {categories.map(name => <button key={name} type="button" aria-pressed={category === name} aria-controls="fasilitas-grid" onClick={() => selectCategory(name)} className={`min-h-11 min-w-24 rounded-full px-5 py-2.5 font-sans text-xs font-semibold shadow-[inset_0_0_4px_0_#cd0b20] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:min-h-[clamp(2.75rem,3.47vw,4rem)] min-w-0 w-full lg:px-[clamp(1rem,1.19vw,1.375rem)] ${category === name ? 'bg-[#cd0b20] text-white hover:bg-primary-800' : 'bg-white text-[#cd0b20] hover:bg-primary-50'}`}>{t(name)}</button>)}
            </div>
            <p className="sr-only" role="status">{t('{count} fasilitas dalam kategori {category}', { count, category: t(category) })}</p>
            <div id="fasilitas-grid" className="mt-8 space-y-12 lg:mt-[clamp(2rem,3.3vw,3.8125rem)] lg:space-y-[clamp(3rem,6.6vw,7.625rem)]">
              {groups.map(group => <section key={group.id} id={`fasilitas-${group.id}`} className="scroll-mt-28" aria-label={t(group.title || category)}>
                {group.title && <GroupTitle title={group.title} t={t} />}
                <div data-facility-grid className={`${group.title ? 'mt-4 ' : ''}grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-[clamp(1.5rem,2.44vw,2.8125rem)]`}>
                  {group.items.map(item => <article key={item.id} data-facility-card={item.id} className="group flex h-full min-w-0 flex-col font-sans">
                    <div className="aspect-video shrink-0 overflow-hidden rounded-[20px] bg-dark-50">
                      <FacilityCardPhoto item={item} t={t} />
                    </div>
                    <div className="relative -mt-4 flex min-w-0 flex-1 flex-col rounded-[20px] bg-[#fffdfd] px-6 pt-5 shadow-[0_0_24px_0_rgba(130,130,130,0.25)] lg:-mt-[clamp(1rem,1.41vw,1.625rem)] lg:px-[clamp(1.25rem,1.4vw,1.625rem)]">
                      <h4 className="font-heading text-base font-bold leading-snug text-[#cd0b20]">{t(item.name)}</h4>
                      <p className="mt-1.5 text-xs font-normal leading-relaxed text-black/68">{t(item.preview)}</p>
                      <button type="button" onClick={() => setSelected(item)} aria-label={t('Selengkapnya tentang {name}', { name: t(item.name) })} className="mt-auto inline-flex min-h-11 items-center gap-2 self-start text-xs font-semibold text-[#e8232a] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{t('Selengkapnya')}<ArrowRight aria-hidden="true" className="size-4" /></button>
                    </div>
                  </article>)}
                </div>
              </section>)}
            </div>
          </div>
        </section>
      <Modal terbuka={selected !== null} onTutup={() => setSelected(null)} judul={selected ? t(selected.name) : ''} labelTutup={t('Tutup')} lebar="max-w-2xl">
        {selected && <div data-lenis-prevent className="max-h-[70dvh] overflow-y-auto overscroll-contain"><FacilityPhotos key={selected.id} item={selected} t={t} /><p className="mt-5 text-sm leading-relaxed text-dark-600">{t(selected.preview)}</p>{!selected.photos && <p className="mt-3 text-xs leading-relaxed text-dark-500">{t('Foto merupakan ilustrasi kegiatan belajar. Dokumentasi khusus ruangan ini belum tersedia.')}</p>}
          {selectedCampus && <div className="mt-4 rounded-xl bg-dark-50 p-4"><h3 className="font-heading text-sm font-bold text-primary">{t(selectedCampus.name)}</h3>{campusNote && <p className="mt-2 text-xs leading-relaxed text-dark-600">{t(campusNote)}</p>}<button type="button" onClick={locateCampus} className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">{t('Lihat lokasi di peta')}<ArrowRight className="size-4" aria-hidden="true" /></button></div>}
        </div>}
      </Modal>
    </MainLayout>
  );
}
