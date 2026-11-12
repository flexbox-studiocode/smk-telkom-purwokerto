import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ImageOff, Map as MapIcon, Navigation } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { campusFacilities, campusHotspots } from '../../data/campusData';
import { campusPanoramas } from '../../data/campusPanoramas';

const hotspots = Object.fromEntries(campusHotspots.map(point => [point.id, point]));
// Names and descriptions come from the School Tour data; only places off the map carry their own.
const placeName = id => campusPanoramas[id]?.label || hotspots[id]?.label || '';
const placeText = id => campusPanoramas[id]?.description || campusFacilities[hotspots[id]?.facilityId]?.content.preview || '';
// Off-map panoramas (the gate) come first, then the map's locations.
const places = [...Object.keys(campusPanoramas).filter(id => !hotspots[id]), ...campusHotspots.map(point => point.id)];
const resetIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';

function PhotoSphere({ place, onNavigate }) {
  const { t } = useLanguage();
  const container = useRef(null), viewer = useRef(null), markers = useRef(null), home = useRef(null), navigate = useRef(onNavigate);
  const [engine, setEngine] = useState(0), [status, setStatus] = useState('loading');
  useEffect(() => { navigate.current = onNavigate; });
  // The WebGL viewer (three.js) is fetched only when a real panorama is opened, and rebuilt when the language changes.
  useEffect(() => {
    let disposed = false, instance = null;
    Promise.all([import('@photo-sphere-viewer/core'), import('@photo-sphere-viewer/markers-plugin'), import('@photo-sphere-viewer/core/index.css'), import('@photo-sphere-viewer/markers-plugin/index.css')]).then(([{ Viewer }, { MarkersPlugin }]) => {
      if (disposed) return;
      instance = new Viewer({
        container: container.current, plugins: [MarkersPlugin], mousewheelCtrlKey: true, loadingTxt: t('Memuat panorama…'),
        navbar: ['zoom', 'move', { id: 'reset', title: t('Kembali ke tampilan awal'), content: resetIcon, onClick: current => current.animate({ ...home.current, speed: '3rpm' }) }, 'caption', 'fullscreen'],
        lang: { zoom: t('Zoom'), zoomIn: t('Perbesar'), zoomOut: t('Perkecil'), moveUp: t('Lihat ke atas'), moveDown: t('Lihat ke bawah'), moveLeft: t('Putar ke kiri'), moveRight: t('Putar ke kanan'), fullscreen: t('Layar penuh'), loading: t('Memuat panorama…'), close: t('Tutup panel'), twoFingers: t('Gunakan dua jari untuk menggeser'), ctrlZoom: t('Tekan Ctrl sambil scroll untuk zoom'), loadError: t('Panorama gagal dimuat.'), webglError: t('Browser ini tidak mendukung WebGL untuk panorama 360°.') },
      });
      viewer.current = instance; markers.current = instance.getPlugin(MarkersPlugin);
      instance.addEventListener('panorama-loaded', () => setStatus('ready'));
      instance.addEventListener('panorama-error', () => setStatus('error'));
      markers.current.addEventListener('select-marker', ({ marker }) => navigate.current(marker.id));
      setEngine(value => value + 1);
    }).catch(() => { if (!disposed) setStatus('error'); });
    return () => { disposed = true; instance?.destroy(); viewer.current = markers.current = null; };
  }, [t]);
  useEffect(() => {
    const instance = viewer.current, pano = campusPanoramas[place];
    if (!instance) return undefined;
    let current = true;
    home.current = { yaw: pano.yaw ?? 0, pitch: pano.pitch ?? 0, zoom: pano.zoom ?? 50 };
    setStatus('loading'); markers.current.clearMarkers();
    // A newer setPanorama() resolves the older call with `false`, so fast switching never leaves a loader behind.
    instance.setPanorama(pano.src, { position: home.current, zoom: home.current.zoom, caption: t(placeName(place)) }).then(done => {
      if (!current || !done) return;
      markers.current.setMarkers((pano.links || []).filter(link => campusPanoramas[link.to] && link.yaw !== undefined).map(link => {
        const element = document.createElement('span');
        element.className = 'campus-pano-link'; element.textContent = t(placeName(link.to));
        return { id: link.to, element, position: { yaw: link.yaw, pitch: link.pitch ?? 0 }, anchor: 'center center', tooltip: t('Menuju {name}', { name: t(placeName(link.to)) }) };
      }));
    }).catch(() => { if (current) setStatus('error'); });
    return () => { current = false; };
  }, [place, engine, t]);
  return <div ref={container} data-campus-sphere={status} className="campus-pano absolute inset-0" />;
}

export default function CampusPanorama({ place: selected, onPlace, onMap }) {
  const { t } = useLanguage();
  const place = selected ?? places.find(id => campusPanoramas[id]) ?? null;
  const [trail, setTrail] = useState([]);
  const pano = campusPanoramas[place], name = t(placeName(place));
  const available = places.filter(id => campusPanoramas[id]).length;
  const go = (id, walked) => { setTrail(walked ? [...trail, place] : []); onPlace(id); };
  const back = () => { onPlace(trail.at(-1)); setTrail(trail.slice(0, -1)); };
  const links = (pano?.links || []).filter(link => campusPanoramas[link.to]);
  return <div data-campus-360={place || ''} className="campus-360 relative mx-auto max-w-5xl">
    <div role="group" aria-label={t('Pilih lokasi tur 360°')} data-lenis-prevent-horizontal className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
      {places.map(id => <button key={id} type="button" data-campus-place={id} aria-pressed={place === id} onClick={() => go(id)} className="campus-place inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-dark-200 bg-white px-4 text-xs font-semibold text-dark-700 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-white sm:text-sm">
        {t(placeName(id))}{campusPanoramas[id] && <span className="rounded-full bg-primary-50 px-1.5 text-[10px] font-bold text-primary">360°</span>}
      </button>)}
    </div>
    <p className="mt-3 text-center text-xs text-dark-500">{t('{count} dari {total} lokasi sudah memiliki panorama 360° asli.', { count: available, total: places.length })}</p>
    <article className="mt-5 overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-card">
      <div className="relative aspect-[4/3] bg-dark-900 sm:aspect-video">
        {pano?.src && <PhotoSphere place={place} onNavigate={id => go(id, true)} />}
        {pano?.embed && <iframe key={place} src={pano.embed} title={t('Street View {name}', { name })} allow="accelerometer; gyroscope; fullscreen" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 size-full border-0" />}
        {!pano && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-dark-50 px-6 text-center text-sm text-dark-500">
          <ImageOff className="size-9" aria-hidden="true" />
          <p className="max-w-md font-semibold text-dark-700">{place ? t('Panorama 360° untuk {name} belum tersedia.', { name }) : t('Pilih lokasi untuk membuka panorama 360°.')}</p>
          {place && <p className="max-w-md text-xs leading-relaxed">{t('Foto 360° asli lokasi ini sedang disiapkan. Sementara itu, lihat foto dan informasinya di Versi 3D.')}</p>}
        </div>}
      </div>
      {place && <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{pano?.embed ? 'Google Street View' : pano ? t('Tur 360°') : t('Belum ada panorama')}</p>
          <h3 className="mt-1 font-heading text-xl font-bold leading-tight text-dark-900 sm:text-2xl">{name}</h3>
          {placeText(place) && <p className="mt-2 max-w-2xl text-xs leading-relaxed text-dark-600 sm:text-sm">{t(placeText(place))}</p>}
          {links.length > 0 && <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t('Lanjut ke lokasi terhubung')}>
            {links.map(link => <button key={link.to} type="button" onClick={() => go(link.to, true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-white hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><Navigation className="size-3.5" aria-hidden="true" />{t('Menuju {name}', { name: t(placeName(link.to)) })}</button>)}
          </div>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {trail.length > 0 && <button type="button" onClick={back} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dark-200 px-4 text-xs font-semibold text-dark-700 hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><ArrowLeft className="size-4" aria-hidden="true" />{t('Kembali ke {name}', { name: t(placeName(trail.at(-1))) })}</button>}
          <button type="button" onClick={() => onMap(place)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary px-4 text-xs font-semibold text-primary hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><MapIcon className="size-4" aria-hidden="true" />{t('Kembali ke peta')}</button>
        </div>
      </div>}
    </article>
  </div>;
}
