import { useLanguage } from '../../context/LanguageContext';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
const maskot = '/assets/branding/nexa-mark.png';

const StelaChat = lazy(() => import('./StelaChat'));

// Gelembung chat yang mengambang di seluruh halaman publik. Sengaja tidak
// dipasang di /stela karena di sana chat-nya sudah jadi isi halaman.
const REMINDER_DISMISSED_KEY = 'stela-reminder-dismissed-at';
const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const REMINDER_CYCLE_MS = 5000;

const StelaWidget = () => {
  const { t } = useLanguage();
  const [terbuka, setTerbuka] = useState(false);
  const [pernahDibuka, setPernahDibuka] = useState(false);
  const [reminderVisible, setReminderVisible] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const triggerRef = useRef(null);
  const rootRef = useRef(null);
  const [scrolling, setScrolling] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/stela' || pathname === '/nexa') return undefined;
    let dismissedAt = 0;
    try {
      dismissedAt = Number.parseInt(window.localStorage.getItem(REMINDER_DISMISSED_KEY) || '0', 10) || 0;
    } catch {
      // Continue without persistence when storage is unavailable.
    }
    if (Date.now() - dismissedAt < REMINDER_COOLDOWN_MS) return undefined;

    const typing = () => {
      const element = document.activeElement;
      return element?.matches('input, textarea, select, [contenteditable="true"]');
    };
    const cycle = window.setInterval(() => {
      if (terbuka || reminderDismissed || typing() || document.visibilityState !== 'visible') return;
      setReminderVisible((visible) => !visible);
    }, REMINDER_CYCLE_MS);
    const initialTimer = window.setTimeout(() => {
      if (!terbuka && !reminderDismissed && !typing() && document.visibilityState === 'visible') setReminderVisible(true);
    }, 0);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(cycle);
    };
  }, [pathname, terbuka, reminderDismissed]);

  // On phones the 56px bubble sits over reading text, so it steps aside while the page scrolls.
  useEffect(() => {
    let timer;
    const onScroll = () => {
      if (rootRef.current?.contains(document.activeElement)) return;
      setScrolling(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setScrolling(false), 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (pathname !== '/ekstrakurikuler') return undefined;
    const filters = document.getElementById('ekstrakurikuler-filters');
    if (!filters) return undefined;
    const observer = new IntersectionObserver(([entry]) => setFilterVisible(entry.isIntersecting));
    observer.observe(filters);
    return () => observer.disconnect();
  }, [pathname]);

  if (pathname === '/stela' || pathname === '/nexa') return null;

  const bukaPengingat = () => {
    setReminderVisible(false);
    setPernahDibuka(true);
    setTerbuka(true);
  };

  const tutupPengingat = () => {
    try { window.localStorage.setItem(REMINDER_DISMISSED_KEY, String(Date.now())); } catch { /* no-op */ }
    setReminderVisible(false);
    setReminderDismissed(true);
  };

  return (
    <div ref={rootRef} onKeyDown={(event) => {
      if (event.key !== 'Escape' || !terbuka) return;
      event.preventDefault();
      setTerbuka(false);
      triggerRef.current?.focus();
    }} className={`fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 transition-[transform,opacity] duration-200 motion-reduce:transition-none sm:bottom-6 sm:right-6 ${scrolling && !terbuka ? 'max-sm:pointer-events-none max-sm:translate-y-6 max-sm:opacity-0' : ''} ${pathname === '/ekstrakurikuler' && filterVisible && !terbuka ? 'max-sm:invisible max-sm:pointer-events-none' : ''}`}>
      {reminderVisible && !terbuka && (
        <aside aria-label={t('Pengingat NEXA')} className="relative flex w-[min(20rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl border border-primary/15 bg-white p-3 pr-10 shadow-card motion-chat-enter motion-reduce:animate-none">
          <button type="button" onClick={tutupPengingat} aria-label={t('Tutup pengingat NEXA')} className="absolute right-2 top-2 rounded-full p-1.5 text-dark-500 hover:bg-dark-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><X className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={bukaPengingat} className="flex min-w-0 items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={t('Buka obrolan dengan NEXA')}>
            <img src={maskot} alt="" aria-hidden="true" className="h-12 w-12 shrink-0 rounded-xl bg-primary object-contain p-2" />
            <span className="font-heading text-sm font-bold text-primary">{t('Tanya Nexa!')}</span>
          </button>
        </aside>
      )}

      {pernahDibuka && (
        <div id="stela-widget-panel" role="region" aria-labelledby="stela-widget-title" className={`${terbuka ? 'motion-chat-enter flex' : 'hidden'} max-h-[calc(100dvh-8rem)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl shadow-card sm:max-h-[calc(100dvh-9rem)]`}>
          <div className="flex shrink-0 items-center gap-2.5 bg-primary px-4 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15"><img src={maskot} alt="" aria-hidden="true" className="h-6 w-6 object-contain" /></span>
            <span id="stela-widget-title" className="min-w-0 flex-1 font-heading text-sm font-bold text-white">NEXA AI</span>
            <button type="button" onClick={() => { setTerbuka(false); triggerRef.current?.focus(); }} aria-label={t('Tutup obrolan NEXA')} className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
          <Suspense fallback={<div role="status" className="flex h-96 items-center justify-center bg-white text-xs text-dark-600">{t("Memuat obrolan...")}</div>}>
            <StelaChat focusInput={terbuka} className="min-h-0 h-96 max-h-[calc(100dvh-11.5rem)] rounded-none border-0 sm:max-h-[calc(100dvh-12.5rem)]" kelasPraChat="min-h-0 max-h-[calc(100dvh-11.5rem)] rounded-none border-0 sm:max-h-[calc(100dvh-12.5rem)]" />
          </Suspense>
        </div>
      )}

      <button
        type="button"
        ref={triggerRef}
        onClick={() => {
          setPernahDibuka(true);
          setTerbuka((open) => !open);
        }}
        aria-expanded={terbuka}
        aria-controls="stela-widget-panel"
        aria-label={t(terbuka ? 'Tutup obrolan NEXA' : 'Buka obrolan dengan NEXA')}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-card transition-transform sm:h-14 sm:w-14 duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        {terbuka ? <X aria-hidden="true" className="h-6 w-6" /> : <img src={maskot} alt="" aria-hidden="true" width="40" height="40" className="h-9 w-9 object-contain sm:h-10 sm:w-10" />}
      </button>
    </div>
  );
};

export default StelaWidget;
