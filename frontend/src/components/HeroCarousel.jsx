import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import HeroPanel from './HeroPanel';
import './HeroCarousel.css';

export default function HeroCarousel({ slides, opening, page = 'beranda' }) {
  const { t } = useLanguage();
  const root = useRef(null), actions = useRef({});
  const [active, setActive] = useState(0);

  useEffect(() => {
    const node = root.current;
    const panels = [...node.querySelectorAll('[data-hero-slide]')];
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0, timer, animation, pending = null;
    let moving = false, disposed = false, visible = false, interacting = false;
    const schedule = () => {
      window.clearTimeout(timer);
      if (disposed || moving || interacting || preference.matches || document.hidden || !visible || node.querySelector(':focus-visible') || node.matches(':focus-visible')) return;
      timer = window.setTimeout(() => move(1), 6200);
    };
    const move = async direction => {
      window.clearTimeout(timer);
      if (moving) { pending = () => move(direction); return; }
      const next = (current + direction + panels.length) % panels.length;
      if (next === current) { schedule(); return; }
      moving = true;
      node.dataset.heroMoving = 'true';
      const outgoing = panels[current], incoming = panels[next];
      await Promise.all([...incoming.querySelectorAll('img')].map(image => {
        image.loading = 'eager';
        return image.decode().catch(() => {});
      }));
      if (disposed) return;
      if (document.hidden) {
        pending = 0; moving = false; node.dataset.heroMoving = 'false'; schedule(); return;
      }
      if (outgoing.contains(document.activeElement)) node.focus({ preventScroll: true });
      outgoing.inert = true;
      const complete = () => {
        gsap.set(outgoing, { visibility: 'hidden', clearProps: 'transform,willChange' });
        gsap.set(incoming, { visibility: 'visible', clearProps: 'transform,willChange' });
        current = next;
        animation = null;
        moving = false;
        node.dataset.heroMoving = 'false';
        incoming.inert = false;
        setActive(next);
        if (pending) { const queued = pending; pending = null; queued(); }
        else schedule();
      };
      if (preference.matches) { complete(); return; }
      const sign = Math.sign(direction);
      gsap.set(incoming, { visibility: 'visible', xPercent: sign * 100 });
      gsap.set([outgoing, incoming], { willChange: 'transform' });
      animation = gsap.timeline({ defaults: { duration: 0.8, ease: 'power3.inOut', force3D: true }, onComplete: complete })
        .to(outgoing, { xPercent: -sign * 100 }, 0)
        .to(incoming, { xPercent: 0 }, 0);
    };
    const finish = () => { pending = 0; animation?.progress(1); };
    const mediaChanged = () => { if (preference.matches) finish(); schedule(); };
    const visibilityChanged = () => { if (document.hidden) finish(); schedule(); };
    const focusChanged = () => queueMicrotask(schedule);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: 0.2 });
    observer.observe(node);
    node.addEventListener('focusin', focusChanged);
    node.addEventListener('focusout', focusChanged);
    document.addEventListener('visibilitychange', visibilityChanged);
    preference.addEventListener('change', mediaChanged);
    window.addEventListener('resize', finish);
    mediaChanged();
    actions.current = { move, pause: () => { interacting = true; window.clearTimeout(timer); }, resume: () => { interacting = false; schedule(); } };
    // Load upcoming artwork after the opening image, then decode again before each transition.
    Promise.all([...panels[0].querySelectorAll('img')].map(image => image.decode().catch(() => {}))).then(() => {
      if (disposed) return;
      panels.slice(1).forEach(panel => panel.querySelectorAll('img').forEach(image => { image.loading = 'eager'; image.decode().catch(() => {}); }));
    });
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      animation?.kill();
      observer.disconnect();
      node.removeEventListener('focusin', focusChanged);
      node.removeEventListener('focusout', focusChanged);
      document.removeEventListener('visibilitychange', visibilityChanged);
      preference.removeEventListener('change', mediaChanged);
      window.removeEventListener('resize', finish);
      actions.current = {};
    };
  }, [slides.length]);

  return <div ref={root} data-hero-carousel data-hero-index={active} data-hero-moving="false" className={`hero-carousel hero-carousel--${page} relative`} role="region" tabIndex={0} aria-roledescription={t('Karusel')} aria-label={t('Sorotan sekolah')} aria-describedby="hero-keyboard-instructions" onKeyDown={event => {
    if (!event.target.closest('input,textarea,select') && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) { event.preventDefault(); actions.current.move?.(event.key === 'ArrowRight' ? 1 : -1); }
  }}>
    <p id="hero-keyboard-instructions" className="sr-only">{t('Gunakan tombol panah kiri atau kanan untuk mengganti sorotan sekolah.')}</p>
    <div className="hero-carousel-viewport" aria-live="off">
      {slides.map((slide, index) => <div key={slide.id} id={`hero-${page}-slide-${index}`} data-hero-slide={index} data-active={active === index} className="hero-carousel-slide" role="group" aria-roledescription={t('Slide')} aria-label={t('{number} dari {total}: {name}', { number: index + 1, total: slides.length, name: t(slide.name) })} aria-hidden={active !== index} inert={active !== index}>
        {index === 0 && opening ? opening : <HeroPanel content={slide.content} media={slide.media} carousel heading={index === 0 ? 'h1' : 'h2'} priority={index === 0} />}
      </div>)}
    </div>
    {slides.length > 1 && <div className="hero-carousel-controls" role="group" aria-label={t('Navigasi sorotan sekolah')}
      onPointerEnter={event => { if (event.pointerType === 'mouse') actions.current.pause?.(); }} onPointerLeave={event => { if (event.pointerType === 'mouse') actions.current.resume?.(); }}
      onPointerDown={event => { if (event.pointerType !== 'mouse') actions.current.pause?.(); }} onPointerUp={event => { if (event.pointerType !== 'mouse') actions.current.resume?.(); }} onPointerCancel={() => actions.current.resume?.()}
      >
      <button type="button" className="hero-carousel-previous" aria-label={t('Sorotan sebelumnya')} onClick={() => actions.current.move?.(-1)}><ChevronLeft aria-hidden="true" /></button>
      <button type="button" className="hero-carousel-next" aria-label={t('Sorotan berikutnya')} onClick={() => actions.current.move?.(1)}><ChevronRight aria-hidden="true" /></button>
    </div>}
  </div>;
}
