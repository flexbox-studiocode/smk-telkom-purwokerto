import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function CountUp({ value, run, duration = 2000 }) {
  const { locale } = useLanguage();
  const ref = useRef(null);
  const target = Number(value.replace(/[^\d]/g, ''));
  const suffix = value.replace(/[\d.,]/g, '');
  const [number, setNumber] = useState(null);

  useEffect(() => {
    if (run === false) return undefined;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame, observer;
    const begin = () => {
      observer?.disconnect();
      if (motion.matches) { setNumber(target); return; }
      setNumber(0);
      let start;
      const tick = (now) => {
        start ??= now;
        const progress = Math.min((now - start) / duration, 1);
        setNumber(Math.round(target * (1 - (1 - progress) ** 3)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const reduceMotion = () => {
      if (!motion.matches) return;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      setNumber(target);
    };
    motion.addEventListener('change', reduceMotion);
    if (run === true) begin();
    else {
      observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) begin(); }, { threshold: 0.2 });
      observer.observe(ref.current.closest('section') || ref.current);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      motion.removeEventListener('change', reduceMotion);
    };
  }, [run, target, duration]);

  const final = target.toLocaleString(locale) + suffix;
  return (
    <span ref={ref} className="relative inline-grid tabular-nums">
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">{final}</span>
      <span aria-hidden="true" data-counter-value className="absolute inset-0 whitespace-nowrap">{(number ?? target).toLocaleString(locale)}{suffix}</span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
