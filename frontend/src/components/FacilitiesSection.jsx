import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useLenis } from 'lenis/react';
import { BookOpen, Bot, Building2, Monitor, Network, School } from 'lucide-react';
import { fasilitasData } from '../data/fasilitasData';
import { useLanguage } from '../context/LanguageContext';
import backgroundRight from '../assets/fasilitas/background-right.webp';
import arrowPrev from '../assets/fasilitas/arrow-prev.svg';
import arrowNext from '../assets/fasilitas/arrow-next.svg';
import './FacilitiesSection.css';

const defaultSlides = [
  { name: 'Lab Jaringan', title: 'Laboratorium Jaringan', image: fasilitasData[5].image, category: 'Laboratorium', Icon: Network },
  { name: 'Ruang Kelas', image: fasilitasData[2].image, preview: fasilitasData[2].preview, category: 'Kelas', Icon: School },
  { name: 'Perpustakaan', image: fasilitasData[7].image, preview: fasilitasData[7].preview, category: 'Perpustakaan', Icon: BookOpen },
  { name: 'Lab Komputer', image: fasilitasData[4].image, preview: fasilitasData[4].preview, category: 'Laboratorium', Icon: Monitor },
  { name: 'Lab Robotik', image: fasilitasData[6].image, preview: fasilitasData[6].preview, category: 'Laboratorium', Icon: Bot },
  { name: 'Fasilitas Lainnya', image: fasilitasData[0].image, preview: fasilitasData[0].preview, category: 'Semua', Icon: Building2 },
];
// Profile frame places the robotics lab immediately before the network lab.
const profileSlides = [...defaultSlides.slice(0, 4), defaultSlides[5], defaultSlides[4]];
const adjacentSlide = (active, offset) => (active + offset + defaultSlides.length) % defaultSlides.length;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const measureCard = card => {
  const bounds = card.getBoundingClientRect();
  const style = getComputedStyle(card);
  return {
    x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2,
    width: parseFloat(style.width), height: parseFloat(style.height), rotation: parseFloat(style.rotate) || 0,
  };
};

export default function FacilitiesSection({ variant = 'default' }) {
  const slides = variant === 'profile' ? profileSlides : defaultSlides;
  const { t } = useLanguage();
  const navigatePage = useNavigate();
  // Both supported translations have two words; keep the existing accent on the last word.
  const [titleStart, titleEnd] = t('Fasilitas Sekolah').split(' ');
  const root = useRef(null);
  const carousel = useRef(null);
  const indicators = useRef(null);
  const slideAnimation = useRef(null);
  const slideState = useRef(null);
  const turning = useRef(false);
  const direction = useRef(1);
  const [active, setActive] = useState(0);
  const lenis = useLenis();

  useEffect(() => {
    const node = root.current;
    const finishSlide = () => { if (turning.current) slideAnimation.current?.progress(1); };
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finishReducedMotion = () => { if (media.matches) finishSlide(); };
    // Decode the six carousel images before they enter, without loading the detail gallery early.
    const preload = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      carousel.current.querySelectorAll('[data-slide] img').forEach(image => {
        image.loading = 'eager';
        image.decode().catch(() => {});
      });
      preload.disconnect();
    }, { rootMargin: '300px' });
    preload.observe(carousel.current);
    window.addEventListener('resize', finishSlide);
    media.addEventListener('change', finishReducedMotion);
    return () => {
      preload.disconnect();
      window.removeEventListener('resize', finishSlide);
      media.removeEventListener('change', finishReducedMotion);
      slideAnimation.current?.kill();
      turning.current = false;
      gsap.killTweensOf(node?.querySelectorAll('*') ?? []);
    };
  }, []);

  const navigate = useCallback((next) => {
    if (turning.current || next === active) return;
    direction.current = (next - active + slides.length) % slides.length <= slides.length / 2 ? 1 : -1;
    if (!reducedMotion()) {
      const visible = [...carousel.current.querySelectorAll('[data-slide]')].filter(card => card.offsetWidth);
      slideState.current = { poses: new Map(visible.map(card => [card, measureCard(card)])), active };
      turning.current = true;
    }
    setActive((next + slides.length) % slides.length);
  }, [active, slides]);

  const prepareNavigation = (event) => {
    event.preventDefault();
    // Cancel pending smooth-scroll inertia without changing the current viewport.
    lenis?.scrollTo(lenis.actualScroll, { immediate: true });
  };

  useEffect(() => {
    const node = carousel.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let disposed = false;
    let timer;
    const schedule = () => {
      window.clearTimeout(timer);
      if (disposed || !visible || media.matches || document.hidden || node.matches(':hover') || node.querySelector(':focus-visible')) return;
      timer = window.setTimeout(() => navigate(adjacentSlide(active, 1)), 6000);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: 0.35 });
    observer.observe(node);
    const pause = () => window.clearTimeout(timer);
    const resumeFocus = () => queueMicrotask(schedule);
    node.addEventListener('pointerenter', pause);
    node.addEventListener('pointerleave', schedule);
    node.addEventListener('focusin', pause);
    node.addEventListener('focusout', resumeFocus);
    document.addEventListener('visibilitychange', schedule);
    media.addEventListener('change', schedule);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer.disconnect();
      node.removeEventListener('pointerenter', pause);
      node.removeEventListener('pointerleave', schedule);
      node.removeEventListener('focusin', pause);
      node.removeEventListener('focusout', resumeFocus);
      document.removeEventListener('visibilitychange', schedule);
      media.removeEventListener('change', schedule);
    };
  }, [active, navigate]);

  useLayoutEffect(() => {
    const progress = defaultSlides.findIndex(slide => slide.name === slides[active].name) / (slides.length - 1);
    if (!slideState.current) {
      gsap.set(indicators.current, { '--facility-progress': progress, '--facility-line-opacity': 1 });
      return;
    }
    const state = slideState.current;
    slideState.current = null;
    const cards = [...carousel.current.querySelectorAll('[data-slide]')];
    const center = cards.find(card => card.classList.contains('z-10'));
    const captions = cards.filter(card => card === center || Number(card.dataset.flipId.split('-')[1]) === state.active);
    const panels = captions.map(card => card.querySelector('[data-slide-panel]'));
    const previews = captions.map(card => card.querySelector('[data-slide-preview]'));
    const targets = cards.filter(card => card.offsetWidth || state.poses.has(card));
    const destinations = new Map(targets.filter(card => card.offsetWidth).map(card => [card, measureCard(card)]));
    const parent = center.parentElement.getBoundingClientRect();
    const distance = window.innerWidth >= 640
      ? (destinations.get(center).width + [...destinations.values()].find(pose => pose !== destinations.get(center)).width) / 2 - 16
      : destinations.get(center).width + 16;
    const entering = targets.filter(card => !state.poses.has(card));
    const leaving = targets.filter(card => !destinations.has(card));
    // Read geometry in batches; animate only transforms instead of fitting global matrices.
    targets.forEach(card => {
      // Hand CSS individual transforms to GSAP after measuring, then restore them on completion.
      card.style.translate = 'none';
      card.style.rotate = 'none';
      card.style.scale = 'none';
    });
    leaving.forEach(card => {
      const pose = state.poses.get(card);
      gsap.set(card, { display: 'block', position: 'absolute', left: pose.x - parent.left - pose.width / 2, top: pose.y - parent.top - pose.height / 2, width: pose.width, height: pose.height });
    });
    const starts = targets.map(card => {
      const from = state.poses.get(card);
      const to = destinations.get(card);
      return from && to
        ? { x: from.x - to.x, y: from.y - to.y, scaleX: from.width / to.width, scaleY: from.height / to.height, rotation: from.rotation }
        : { x: to ? direction.current * distance : 0, y: 0, scaleX: 1, scaleY: 1, rotation: (to || from).rotation };
    });
    const ends = targets.map(card => ({ x: destinations.has(card) ? 0 : -direction.current * distance, y: 0, scaleX: 1, scaleY: 1, rotation: (destinations.get(card) || state.poses.get(card)).rotation }));
    gsap.set(targets, { willChange: 'transform,opacity', opacity: 1 });
    const wasActive = index => Number(captions[index].dataset.flipId.split('-')[1]) === state.active;
    const isActive = index => captions[index] === center;
    slideAnimation.current = gsap.timeline({
      onComplete: () => {
        gsap.set([...cards, ...panels, ...previews], { clearProps: 'all' });
        turning.current = false;
      },
      onInterrupt: () => { turning.current = false; },
    });
    const from = {};
    const to = { duration: 0.5, ease: 'power3.out', force3D: true };
    for (const property of ['x', 'y', 'scaleX', 'scaleY', 'rotation']) {
      from[property] = index => starts[index][property];
      to[property] = index => ends[index][property];
    }
    slideAnimation.current
      .fromTo(targets, from, to, 0)
      .fromTo(entering, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power1.out' }, 0)
      .to(leaving, { opacity: 0, duration: 0.22, ease: 'power1.in' }, 0.22)
      .fromTo(panels, { opacity: index => wasActive(index) ? 1 : 0 }, { opacity: index => isActive(index) ? 1 : 0, duration: index => isActive(index) ? 0.3 : 0.12, delay: index => isActive(index) ? 0.12 : 0, ease: 'power2.inOut' }, 0)
      .fromTo(previews, { opacity: index => wasActive(index) ? 0 : 1 }, { opacity: index => isActive(index) ? 0 : 1, duration: index => isActive(index) ? 0.12 : 0.3, delay: index => isActive(index) ? 0 : 0.12, ease: 'power2.inOut' }, 0);
    if (Math.abs(active - state.active) === slides.length - 1) {
      // Hide the endpoint reset instead of sweeping the whole line backwards at the seam.
      slideAnimation.current
        .to(indicators.current, { '--facility-line-opacity': 0, duration: 0.25, ease: 'power2.inOut' }, 0)
        .set(indicators.current, { '--facility-progress': progress }, 0.25)
        .to(indicators.current, { '--facility-line-opacity': 1, duration: 0.25, ease: 'power2.inOut' }, 0.25);
    } else {
      slideAnimation.current.to(indicators.current, { '--facility-progress': progress, duration: 0.5, ease: 'power3.out' }, 0);
    }
  }, [active, slides]);

  const showDetails = (category = 'Semua') => {
    navigatePage(category === 'Semua' ? '/fasilitas' : `/fasilitas?kategori=${encodeURIComponent(category)}`);
  };

  return (
    <section ref={root} id="fasilitas" aria-label={t('Fasilitas Sekolah')} className="overflow-hidden bg-white">
      <div ref={carousel} className="relative isolate bg-white py-10 sm:py-12 lg:py-14 [overflow-anchor:none]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <img src={backgroundRight} alt="" className="facilities-background absolute left-[16.3%] top-0 aspect-[1592/1129.08] w-[86.19%] sm:-top-[24%]" />
          <div className="facilities-motif absolute right-[-8.75%] top-4 aspect-[493.607/179] w-[26.72%] rotate-180 sm:top-10" />
        </div>
        <div className="facilities-heading mx-auto max-w-[1546px] px-6 sm:px-12 lg:px-20">
          <p className="text-sm text-dark-600">{t('Fasilitas Kelas')} —</p>
          <h2 className="mt-3 font-heading text-3xl font-extrabold leading-tight tracking-tight text-dark-900 sm:text-4xl lg:text-5xl">{titleStart} <span className="text-primary">{titleEnd}</span></h2>
          <p className="mt-4 max-w-lg text-xs leading-relaxed text-dark-600 sm:text-sm">{t('Fasilitas sekolah adalah sarana dan prasarana yang disediakan untuk mendukung kegiatan belajar mengajar, supaya siswa bisa belajar dengan nyaman, aman, dan maksimal.')}</p>
        </div>
        <div className="relative mx-auto mt-9 max-w-[1546px] px-12 sm:px-16 lg:px-20" aria-roledescription={t('Karusel')} aria-label={t('Pilihan fasilitas')}>
          <div className="relative mb-20 aspect-[611/354] sm:aspect-[611/134.52]">
            <div className="absolute inset-0 flex items-center justify-center gap-0">
            {[-2, -1, 0, 1, 2, 3].map(offset => {
              const index = adjacentSlide(active, offset);
              const slide = slides[index];
              return (
                <button key={index} type="button" data-slide data-flip-id={`facility-${index}`} aria-hidden={Math.abs(offset) > 1 || undefined} disabled={Math.abs(offset) > 1} onClick={() => offset === 0 ? showDetails(slide.category) : navigate(index)}
                  aria-label={offset === 0 ? t('Lihat detail {name}', { name: t(slide.name) }) : t('Tampilkan {name}', { name: t(slide.name) })}
                  className={`facility-slide relative aspect-[611/354] shrink-0 rounded-xl border-[3px] border-white bg-white shadow-card focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-primary ${Math.abs(offset) > 1 ? 'hidden' : offset === 0 ? 'z-10 w-full sm:w-[38%]' : `hidden sm:block sm:w-[33%] ${offset < 0 ? '-mr-4 -rotate-2' : '-ml-4 rotate-2'}`}`}>
                  <img src={slide.image} alt={t(slide.name)} width="611" height="354" loading="lazy" className="h-full w-full rounded-lg object-cover" />
                  <span data-slide-panel aria-hidden={offset !== 0} className={`pointer-events-none absolute -bottom-16 left-[7%] flex min-h-28 w-[86%] flex-col justify-center rounded-xl border-[3px] border-white bg-[#e72033] px-4 py-4 text-left text-white shadow-card lg:min-h-32 lg:px-6 ${offset === 0 ? 'opacity-100' : 'opacity-0'}`}><span className="font-heading text-sm font-bold leading-snug sm:text-base lg:text-xl">{t(slide.title ?? slide.name)}</span><span className="mt-1 text-xs leading-snug">{t(slide.preview ?? 'Ruang praktik untuk belajar mengatur, memasang, dan mengamankan jaringan komputer.')}</span></span>
                  <span data-slide-preview data-classroom={slide.name === 'Ruang Kelas' || undefined} aria-hidden={offset === 0} className={`pointer-events-none absolute inset-0 flex items-end rounded-lg facilities-slide-preview p-4 text-left font-heading text-base font-bold leading-snug text-white lg:text-xl ${offset === 0 ? 'opacity-0' : 'opacity-100'}`}>{t(slide.name)}</span>
                </button>
              );
            })}
            </div>
          </div>
          <button type="button" aria-label={t('Fasilitas sebelumnya')} onPointerDown={prepareNavigation} onClick={(event) => { prepareNavigation(event); navigate(adjacentSlide(active, -1)); }} className="absolute left-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full sm:left-4"><img src={arrowPrev} alt="" className="max-w-none" /></button>
          <button type="button" aria-label={t('Fasilitas berikutnya')} onPointerDown={prepareNavigation} onClick={(event) => { prepareNavigation(event); navigate(adjacentSlide(active, 1)); }} className="absolute right-3 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full sm:right-4"><img src={arrowNext} alt="" className="max-w-none rotate-180" /></button>
          <p aria-live="off" className="sr-only">{String(active + 1).padStart(2, '0')} — {t(slides[active].name)}</p>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] overflow-x-auto px-6 py-9" data-lenis-prevent-horizontal>
        <ol ref={indicators} style={{ '--facility-count': slides.length }} className="facilities-indicators relative flex min-w-[620px] justify-between gap-3 before:absolute before:left-12 before:right-12 before:top-6 before:h-px before:bg-dark-300">
          {defaultSlides.map(({ name, Icon }, position) => {
            const index = slides.findIndex(slide => slide.name === name);
            return <li key={name} className="relative z-10 flex-1 text-center">
            <button type="button" data-facility-index={index} aria-pressed={active === index} onClick={() => navigate(index)} className={`group w-full text-xs ${active === index ? 'font-bold text-primary' : 'text-dark-500'}`}>
              <span className={`relative mx-auto flex size-12 items-center justify-center rounded-full border-2 transition-[background-color,border-color,color,scale] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:scale-100 ${active === index ? 'scale-[1.04] border-primary bg-primary text-white' : 'border-dark-400 bg-white group-hover:border-primary group-hover:text-primary'}`}><Icon className="size-5" /></span>
              <span className="mt-3 block">{t(name)}</span><span className="mt-1 block text-[10px] text-dark-500">{String(position + 1).padStart(2, '0')}</span>
            </button>
          </li>;
          })}
        </ol>
      </div>
      <div className="facilities-actions-wrapper">
        <div className="facilities-actions" data-facilities-actions>
          <Link to="/fasilitas#school-tour" className="facilities-action facilities-action--primary">{t('School Tour')}</Link>
          <Link to="/fasilitas" className="facilities-action facilities-action--secondary">{t('Lihat Fasilitas Lainnya')}</Link>
        </div>
      </div>
    </section>
  );
}
