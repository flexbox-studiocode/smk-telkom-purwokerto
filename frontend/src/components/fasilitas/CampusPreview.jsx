import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ImageOff, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import useSlidingPage from '../../hooks/useSlidingPage';
import { useLenis } from 'lenis/react';
import accent from '../../assets/fasilitas/campus/detail/card-accent.svg';
import cornerTop from '../../assets/fasilitas/campus/detail/corner-top.svg';
import cornerBottom from '../../assets/fasilitas/campus/detail/corner-bottom.svg';
import arrow from '../../assets/fasilitas/campus/detail/carousel-arrow.svg';

function FacilityPhoto({ photo, alt, decorative = false, primary = false }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  if (!photo?.src || failed) return (
    <div data-campus-photo-fallback className="flex h-full items-center justify-center rounded-xl bg-dark-50 p-5 text-center text-xs leading-relaxed text-dark-500">
      <span><ImageOff aria-hidden="true" className="mx-auto mb-2 size-8" />{t('Dokumentasi fasilitas ini belum tersedia.')}</span>
    </div>
  );
  return <img src={photo.src} srcSet={photo.srcSet} sizes={photo.srcSet ? primary ? '(min-width: 1024px) 460px, (min-width: 768px) 400px, 80vw' : '320px' : undefined} alt={decorative ? '' : alt} aria-hidden={decorative || undefined} width={photo.width || 1280} height={photo.height || 960} loading={primary ? 'eager' : 'lazy'} decoding="async" draggable="false" onError={() => setFailed(true)} className="campus-preview-photo h-full w-full rounded-xl bg-dark-50 object-cover object-center" />;
}

function FacilityCarousel({ photos, name }) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const { viewport, indicators, goTo } = useSlidingPage(index);
  const gesture = useRef(null);
  const current = photos[index];
  const move = (target, direction) => {
    if (photos.length < 2) return;
    const bounded = (target + photos.length) % photos.length;
    goTo(bounded, index, setIndex, direction);
  };
  const pointerDown = event => {
    if (event.target.closest('button') || !event.isPrimary || event.button !== 0) return;
    gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerUp = event => {
    const start = gesture.current;
    gesture.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) move(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  };
  const photoAlt = t('Foto fasilitas {name}', { name: t(name) });
  return (
    <section data-facility-carousel data-photo-index={index} aria-label={t('Foto fasilitas {name}', { name: t(name) })} aria-roledescription={t('Galeri foto')} className="min-w-0">
      <div className="campus-gallery-frame relative">
        <span aria-hidden="true" className="campus-gallery-corner campus-gallery-corner--top"><img src={cornerTop} alt="" className="max-w-none" /></span>
        <span aria-hidden="true" className="campus-gallery-corner campus-gallery-corner--bottom"><img src={cornerBottom} alt="" className="max-w-none" /></span>
        <div ref={viewport} className="campus-gallery-viewport relative overflow-hidden" onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={() => { gesture.current = null; }} onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            move(index + (event.key === 'ArrowRight' ? 1 : -1), event.key === 'ArrowRight' ? 1 : -1);
          }
        }}>
          <div className="campus-photo-deck">
            {photos.length > 1 && <div aria-hidden="true" className="campus-photo-side campus-photo-side--previous"><FacilityPhoto key={photos[(index + photos.length - 1) % photos.length].source} photo={photos[(index + photos.length - 1) % photos.length]} alt="" decorative /></div>}
            <div className="campus-photo-main"><FacilityPhoto key={current?.source || 'unavailable'} photo={current} alt={photoAlt} primary /></div>
            {photos.length > 1 && <div aria-hidden="true" className="campus-photo-side campus-photo-side--next"><FacilityPhoto key={photos[(index + 1) % photos.length].source} photo={photos[(index + 1) % photos.length]} alt="" decorative /></div>}
          </div>
        </div>
        {photos.length > 1 && <>
          <button type="button" aria-label={t('Foto fasilitas sebelumnya')} onClick={() => move(index - 1, -1)} className="campus-photo-arrow campus-photo-arrow--previous absolute left-0 top-1/2 z-10 size-11 -translate-y-1/2 rounded-full"><img src={arrow} alt="" aria-hidden="true" className="max-w-none" /></button>
          <button type="button" aria-label={t('Foto fasilitas berikutnya')} onClick={() => move(index + 1, 1)} className="campus-photo-arrow campus-photo-arrow--next absolute right-0 top-1/2 z-10 size-11 -translate-y-1/2 rounded-full"><img src={arrow} alt="" aria-hidden="true" className="max-w-none" /></button>
        </>}
      </div>
      <div ref={indicators} className="mt-3 flex min-h-11 flex-wrap items-center justify-center gap-1" role="group" aria-label={t('Pilih foto fasilitas')}>
        {photos.length > 1 && photos.map((photo, photoIndex) => <button key={photo.source} type="button" aria-label={t('Lihat foto {number} untuk {name}', { number: photoIndex + 1, name: t(name) })} aria-pressed={photoIndex === index} onClick={() => move(photoIndex, photoIndex > index ? 1 : -1)} className="grid size-8 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-primary"><span data-slide-indicator aria-hidden="true" className={`h-2 rounded-full transition-none ${photoIndex === index ? 'w-5 bg-primary' : 'w-2 bg-dark-300'}`} /></button>)}
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{photos.length ? t('Foto {current} dari {total}', { current: index + 1, total: photos.length }) : t('Dokumentasi fasilitas ini belum tersedia.')}</p>
    </section>
  );
}

function FacilityContent({ facility, outgoing, initialRoomName }) {
  const { t } = useLanguage();
  const item = facility.content;
  const [roomId, setRoomId] = useState(() => facility.rooms?.find(room => room.name === initialRoomName)?.id || facility.rooms?.[0]?.id);
  const [galleries, setGalleries] = useState({});
  const room = facility.rooms?.find(candidate => candidate.id === roomId);
  useEffect(() => {
    if (!room?.classroomGallery) return undefined;
    let mounted = true;
    import('../../data/classroomPhotos').then(({ classroomPhotos }) => {
      if (mounted) setGalleries(previous => ({ ...previous, [room.name]: classroomPhotos[room.photoKey] || room.photos }));
    }).catch(() => {}); // The verified cover remains available if the optional gallery chunk fails.
    return () => { mounted = false; };
  }, [room]);
  const photos = room ? galleries[room.name] || room.photos || [] : facility.photos || (item.image ? [{ source: item.id, src: item.image }] : []);
  const name = room?.name || item.name;
  const type = room ? 'Ruang Kelas' : item.type || item.category || item.name;
  // The eyebrow must add information: never repeat the title.
  const location = facility.location || (type === item.name || item.category === item.name ? 'Fasilitas Sekolah' : item.name);
  return (
    <div data-outgoing={outgoing} aria-hidden={outgoing || undefined} inert={outgoing || undefined} className="campus-preview-content grid min-w-0 gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex min-w-0 flex-col justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{t(location)}</p>
          <h3 id={outgoing ? undefined : 'campus-preview-title'} aria-live={outgoing ? undefined : 'polite'} aria-atomic="true" className="mt-1 font-heading text-2xl font-bold leading-tight text-dark-900 sm:text-3xl">{t(type)}<span className="sr-only"> — {t(location)} {room ? t(room.name) : ''}</span></h3>
          {room && <p className="mt-2 inline-block rounded-md bg-primary px-3 py-1 font-heading text-xl font-bold leading-tight text-white">{room.name.replace(/^Kelas /, '')}</p>}
          <p className="mt-4 text-xs leading-relaxed text-dark-600 sm:text-sm">{t(room?.preview || item.preview || 'Deskripsi fasilitas ini sedang disiapkan.')}</p>
          {room?.photoNote && <p className="mt-3 text-xs leading-relaxed text-dark-500">{t(room.photoNote, { name: t(room.photoKey) })}</p>}
          {facility.rooms && <label className="mt-4 block text-xs font-semibold text-dark-600">
            {t('Pilih ruang kelas')}
            <span className="relative mt-2 block">
            <select value={roomId} onChange={event => setRoomId(event.target.value)} className="block min-h-11 w-full appearance-none rounded-lg border border-dark-200 bg-white py-2 pl-3 pr-10 text-sm font-normal text-dark-800">
              {facility.rooms.map(candidate => <option key={candidate.id} value={candidate.id}>{t(candidate.name)}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 block size-4 -translate-y-1/2" />
            </span>
          </label>}
          {facility.list && <button type="button" onClick={() => facility.onList(facility.list)} className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary hover:underline">{t('Lihat daftar fasilitas')}<ArrowRight className="size-4" aria-hidden="true" /></button>}
        </div>
        <span aria-hidden="true" className="campus-card-accent mt-4"><img src={accent} alt="" className="max-w-none" /></span>
      </div>
      <FacilityCarousel key={room?.id || item.id} photos={photos} name={name} />
    </div>
  );
}

export default function CampusPreview({ facility, initialRoomName, closing, onClose, onList }) {
  const { t } = useLanguage();
  const close = useRef(null), preview = useRef(null);
  const lenis = useLenis();
  const [displayed, setDisplayed] = useState({ facility, initialRoomName });
  const [outgoing, setOutgoing] = useState(null);
  // Keep the previous keyed content briefly so a hotspot change can crossfade without losing the map.
  if (displayed.facility !== facility || displayed.initialRoomName !== initialRoomName) {
    setOutgoing(displayed);
    setDisplayed({ facility, initialRoomName });
  }
  useEffect(() => {
    const dialog = preview.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lenis?.stop();
    dialog.showModal();
    close.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      lenis?.start();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [lenis]);
  useEffect(() => {
    if (!outgoing) return undefined;
    const timer = setTimeout(() => setOutgoing(null), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
    return () => clearTimeout(timer);
  }, [outgoing]);
  return (
    <dialog ref={preview} id="campus-preview" aria-modal="true" aria-labelledby="campus-preview-title" data-campus-preview={facility.content.id} data-closing={closing} data-lenis-prevent onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target !== event.currentTarget) return; const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); }} className="campus-preview campus-preview-modal relative rounded-2xl border border-primary/40 bg-white shadow-card">
      <button ref={close} type="button" onClick={() => onClose()} aria-label={t('Tutup informasi fasilitas')} className="absolute right-2 top-2 z-40 grid size-11 place-items-center rounded-full bg-white text-dark-500 hover:bg-dark-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><X className="size-5" aria-hidden="true" /></button>
      {outgoing && <FacilityContent key={`${outgoing.facility.content.id}:${outgoing.initialRoomName || ''}`} facility={{ ...outgoing.facility, onList }} initialRoomName={outgoing.initialRoomName} outgoing />}
      <FacilityContent key={`${displayed.facility.content.id}:${displayed.initialRoomName || ''}`} facility={{ ...displayed.facility, onList }} initialRoomName={displayed.initialRoomName} outgoing={false} />
    </dialog>
  );
}
