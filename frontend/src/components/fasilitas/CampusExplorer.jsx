import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ImageOff } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import useCampusPan from '../../hooks/useCampusPan';
import { campusAnnotations, campusFacilities, campusHotspots } from '../../data/campusData';
import { readCampusHint, saveCampusHint } from '../../utils/campusPan';
import CampusPreview from './CampusPreview';
import map from '../../assets/fasilitas/campus/campus-map.webp';
import floor from '../../assets/fasilitas/campus/floor-0.png';
import motif from '../../assets/fasilitas/campus/tour-logo.webp';
import rightMotif from '../../assets/fasilitas/campus/tour-right-motif.svg';
import leftPetal from '../../assets/fasilitas/campus/heading-left.svg';
import leftTop from '../../assets/fasilitas/campus/heading-left-top.svg';
import rightPetal from '../../assets/fasilitas/campus/heading-right.svg';
import rightTop from '../../assets/fasilitas/campus/heading-right-top.svg';
import pin from '../../assets/fasilitas/campus/node-205-1109.svg';
import dot from '../../assets/fasilitas/campus/node-205-1142.svg';
import sliderLeft from '../../assets/fasilitas/campus/node-205-1164.svg';
import sliderRight from '../../assets/fasilitas/campus/tour-arrow-right.svg';
import decor from '../../assets/fasilitas/campus/tour-decor.svg';
import accent from '../../assets/fasilitas/campus/tour-accent-left.svg';
import './CampusExplorer.css';

// Set to an embeddable 360° tour URL (e.g. a Google Street View or Kuula embed) to enable the 360° view.
const tour360 = import.meta.env.VITE_SCHOOL_TOUR_360_URL?.trim();
const versions = [['3d', 'Versi 3D'], ['360', 'Versi 360°']];

function CampusDecorations() {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0">
    <img data-campus-motif="left" src={motif} alt="" width="500" height="500" className="campus-logo absolute" />
    <img src={decor} alt="" className="campus-bottom-decor absolute" />
    <img data-campus-motif="right" src={rightMotif} alt="" width="711" height="226" className="campus-right-motif absolute" />
  </div>;
}

export default function CampusExplorer({ request, onViewFacilities }) {
  const { t } = useLanguage();
  const [learned, setLearned] = useState(readCampusHint);
  const [mode, setMode] = useState('3d'), [seenRequest, setSeenRequest] = useState(request);
  // A "show on map" request from the facility list always needs the 3D map.
  if (request !== seenRequest) { setSeenRequest(request); setMode('3d'); }
  const [active, setActive] = useState(null), [closing, setClosing] = useState(false), [ready, setReady] = useState(false), [failed, setFailed] = useState(false), [retry, setRetry] = useState(0), [located, setLocated] = useState(null);
  const root = useRef(null), closeTimer = useRef(null), highlightTimer = useRef(null), lastTrigger = useRef(null), restoringFocus = useRef(false);
  const lastRequest = useRef(null), selectionIntent = useRef(0);
  const viewport = useRef(null), stage = useRef(null), scenery = useRef(null), slider = useRef(null), previous = useRef(null), next = useRef(null);
  const learn = useCallback(() => { saveCampusHint(); setLearned(true); }, []);
  const pan = useCampusPan({ viewport, stage, scenery, slider, previous, next }, learn);
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const select = useCallback((point, trigger) => { selectionIntent.current += 1; clearTimeout(closeTimer.current); setClosing(false); lastTrigger.current = trigger; setActive(point); }, []);
  const close = (restoreFocus = true) => {
    if (!active) return;
    selectionIntent.current += 1;
    clearTimeout(closeTimer.current); setClosing(true);
    closeTimer.current = setTimeout(() => {
      setActive(null); setClosing(false);
      if (restoreFocus && lastTrigger.current) {
        const pinBounds = lastTrigger.current.getBoundingClientRect(), viewBounds = viewport.current.getBoundingClientRect();
        restoringFocus.current = true;
        (pinBounds.right > viewBounds.left && pinBounds.left < viewBounds.right ? lastTrigger.current : viewport.current).focus({ preventScroll: true });
        restoringFocus.current = false;
      }
    }, reduced() ? 0 : 280);
  };
  useEffect(() => { pan.refresh(); }, [ready, failed, pan, mode]);
  useEffect(() => () => { clearTimeout(closeTimer.current); clearTimeout(highlightTimer.current); }, []);
  useEffect(() => {
    if (!request || !ready || lastRequest.current === request) return;
    const point = campusHotspots.find(point => point.facilityId === request.id);
    if (!point) return;
    lastRequest.current = request;
    const intent = ++selectionIntent.current;
    const trigger = root.current.querySelector(`[data-campus-hotspot="${point.id}"]`);
    root.current.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    pan.locate(point.x, () => {
      if (selectionIntent.current !== intent) return;
      trigger?.focus({ preventScroll: true }); select({ ...point, roomName: request.roomName }, trigger);
      clearTimeout(highlightTimer.current); setLocated(point.id);
      highlightTimer.current = setTimeout(() => setLocated(null), 1500);
    });
  }, [request, ready, pan, select]);
  return <section ref={root} id="school-tour" aria-labelledby="school-tour-title" data-campus-explorer className="campus-explorer scroll-mt-28 bg-white" onKeyDown={event => { if (event.key === 'Escape' && active) { event.preventDefault(); close(); } }}>
    <div>
      <div className="campus-intro relative">
      <img src={accent} alt="" aria-hidden="true" className="campus-accent campus-accent-left pointer-events-none absolute" />
      <img src={accent} alt="" aria-hidden="true" className="campus-accent campus-accent-right pointer-events-none absolute" />
      <header className="campus-heading text-center">
        <div className="campus-heading-title flex items-center justify-center"><span aria-hidden="true" className="relative block h-8 w-4"><img src={leftTop} alt="" className="campus-petal-left-top absolute left-0 top-0 size-4" /><img src={leftPetal} alt="" className="campus-petal-left-bottom absolute bottom-0 left-0 size-4" /></span><h2 id="school-tour-title" className="font-heading text-2xl font-extrabold leading-tight text-black sm:text-3xl">School Tour</h2><span aria-hidden="true" className="relative block h-8 w-4"><img src={rightTop} alt="" className="campus-petal-right-top absolute right-0 top-0 size-4" /><img src={rightPetal} alt="" className="campus-petal-right-bottom absolute bottom-0 right-0 size-4" /></span></div>
        <p className="mt-2 text-sm font-semibold text-dark-800">{t('Menjelajahi Stematel')}</p>
      </header>
      <div role="group" aria-label={t('Pilih versi School Tour')} className="campus-versions flex justify-center">
        {versions.map(([id, label]) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => { if (id !== mode) { close(false); setMode(id); } }} className="campus-version focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{t(label)}</button>)}
      </div>
      </div>
      <p id="campus-instructions" className="sr-only">{t('Geser peta ke kiri atau kanan. Gunakan tombol arah, slider, atau tombol panah pada keyboard. Pilih titik untuk melihat informasi fasilitas.')}</p>
      {mode === '360' && <div className="campus-360 relative mx-auto max-w-7xl">{tour360
        ? <iframe src={tour360} title={t('Tur 360° SMK Telkom Purwokerto')} allow="accelerometer; gyroscope; fullscreen; xr-spatial-tracking" allowFullScreen loading="lazy" className="aspect-video w-full rounded-2xl border-0 shadow-card" />
        : <div role="status" className="flex aspect-video max-h-96 w-full flex-col items-center justify-center gap-3 rounded-2xl bg-dark-50 px-6 text-center text-sm text-dark-500"><p>{t('Tur 360° belum tersedia. Silakan jelajahi sekolah melalui Versi 3D.')}</p><button type="button" onClick={() => setMode('3d')} className="min-h-11 rounded-lg border border-dark-200 px-4 text-xs font-semibold text-primary">{t('Buka Versi 3D')}</button></div>}
      </div>}
      <div hidden={mode !== '3d'} className="relative mx-auto max-w-7xl">
        {!failed && <div aria-hidden="true" className="campus-scenery pointer-events-none absolute inset-0"><div className="campus-floor absolute"><img src={floor} alt="" /></div><div ref={scenery} className="campus-stage absolute aspect-[3142/1051] w-[960px]"><CampusDecorations /></div></div>}
        <div ref={viewport} className="campus-viewport relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" role="region" aria-label={t('Peta kampus SMK Telkom Purwokerto')} aria-describedby="campus-instructions" tabIndex={ready ? 0 : -1} data-map-ready={ready && !failed} data-map-failed={failed} data-lenis-prevent-horizontal>
          <div ref={stage} data-campus-stage className={failed ? 'relative h-56 w-full' : 'campus-stage relative mx-auto aspect-[3142/1051] w-[960px]'}>
            {!failed && <><img key={retry} src={map} alt={t('Peta isometrik sekolah dengan bangunan beratap merah')} width="2164" height="727" loading="lazy" decoding="async" draggable="false" className="campus-map pointer-events-none relative z-10 block h-full w-full select-none" onLoad={() => setReady(true)} onError={() => { setFailed(true); setReady(false); }} />
              {ready && campusHotspots.map(point => {
                const annotation = campusAnnotations[point.id];
                return <button key={point.id} type="button" data-campus-hotspot={point.id} data-located={located === point.id} data-active={active?.id === point.id && !closing} aria-label={t('Lihat fasilitas {name}', { name: t(point.label) })} aria-controls={active ? 'campus-preview' : undefined} aria-expanded={active?.id === point.id && !closing} onFocus={event => { if (!restoringFocus.current && event.currentTarget.matches(':focus-visible')) pan.reveal(point.x); }} onClick={event => select(point, event.currentTarget)} className={`campus-hotspot group absolute z-20 grid size-11 -translate-x-1/2 -translate-y-full items-end justify-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${point.position} ${annotation.classes}`}>
                  <span className="campus-pin-art pointer-events-none absolute"><img src={pin} alt="" className="max-w-none" /></span>
                  <span className="campus-leader pointer-events-none absolute"><img src={annotation.line} alt="" className="max-w-none" /></span>
                  {annotation.diagonal && <span className="campus-diagonal pointer-events-none absolute"><img src={annotation.diagonal} alt="" className="max-w-none" /></span>}
                  <span className="campus-anchor pointer-events-none absolute"><img src={dot} alt="" className="max-w-none" /></span>
                  <span className="campus-hotspot-label absolute whitespace-nowrap rounded border border-white bg-primary px-2 py-1 text-xs font-semibold text-white shadow-soft sm:text-sm"><span>{t(point.label)}</span>{active?.id === point.id && <Check className="ml-1 inline size-3" aria-hidden="true" />}{annotation.subtitle && <span className="campus-hotspot-subtitle block">({t(annotation.subtitle)})</span>}</span>
                </button>;
              })}</>}
            {failed && <div role="status" className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-dark-50 px-6 text-center text-sm text-dark-500"><ImageOff className="size-9" aria-hidden="true" /><p>{t('Peta belum tersedia. Daftar fasilitas tetap dapat dibuka di bawah.')}</p><button type="button" onClick={() => { setFailed(false); setRetry(value => value + 1); }} className="min-h-11 rounded-lg border border-dark-200 px-4 text-xs font-semibold text-primary">{t('Coba lagi')}</button></div>}
          </div>
        </div>
      </div>
      <div hidden={mode !== '3d'} data-map-failed={failed} data-preview-open={active !== null} className="campus-controls relative z-30">
        <div className="campus-navigation relative bg-white">
          <button ref={previous} type="button" disabled={!ready} onClick={() => pan.by(-0.45)} aria-label={t('Geser peta ke kiri')} className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary disabled:text-dark-300"><ArrowLeft className="size-4" /></button>
          <div className="campus-range relative">
            <span aria-hidden="true" className="campus-track pointer-events-none absolute" />
            <input ref={slider} type="range" min="0" max="1000" step="1" defaultValue="0" disabled={!ready} aria-label={t('Posisi peta sekolah')} className="campus-slider block" onChange={event => pan.fraction(Number(event.target.value) / 1000)} />
            <span aria-hidden="true" className="campus-slider-arrows pointer-events-none absolute"><span className="campus-slider-arrow-left absolute"><img src={sliderLeft} alt="" className="max-w-none" /></span><span className="campus-slider-arrow-right absolute"><img src={sliderRight} alt="" className="max-w-none" /></span></span>
          </div>
          <button ref={next} type="button" disabled={!ready} onClick={() => pan.by(0.45)} aria-label={t('Geser peta ke kanan')} className="grid size-11 shrink-0 place-items-center rounded-full text-primary hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary disabled:text-dark-300"><ArrowRight className="size-4" /></button>
        </div>
        <div className="campus-hint-position relative"><span data-campus-hint data-dismissed={learned || failed} aria-hidden={learned || failed} className="campus-hint pointer-events-none inline-flex items-center justify-center bg-white font-semibold text-primary">{t('Geser Untuk Menjelajah')}</span></div>
      </div>
      {active && <CampusPreview facility={campusFacilities[active.facilityId]} initialRoomName={active.roomName} closing={closing} onClose={close} onList={list => { close(false); onViewFacilities(list); }} />}
    </div>
  </section>;
}
