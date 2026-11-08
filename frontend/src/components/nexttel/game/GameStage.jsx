import { useEffect, useRef } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { asset } from './assets';

// Pixel crenellations from the Figma stage (x, y of each 82 × 77 block in a 1605-wide frame).
const TOP_BLOCKS = [[152, 0], [1014, 0], [-1, 11], [465, 11], [702, 11], [1056, 11], [1168, 11], [1522, 11], [230, 17], [937, 17], [1291, 17], [76, 28], [542, 28], [624, 28], [978, 28], [1092, 28], [1446, 28], [312, 37], [855, 37], [1209, 37], [389, 54], [779, 54], [1133, 54]];
const BOTTOM_BLOCKS = [[149, 0], [1011, 0], [1365, 0], [-4, 11], [462, 11], [699, 11], [1053, 11], [1165, 11], [1519, 11], [227, 17], [934, 17], [1288, 17], [73, 28], [539, 28], [621, 28], [975, 28], [1089, 28], [1443, 28], [309, 37], [852, 37], [1206, 37], [386, 54], [776, 54], [1130, 54]];

export function FrameEdge({ side, color = '#67676c' }) {
  if (side === 'top') {
    return (
      <svg className="ntg-edge ntg-edge--top" viewBox="0 0 1605 92" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {TOP_BLOCKS.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="83" height="127" fill={color} />)}
        <rect x="0" y="71" width="1605" height="21" fill={color} />
      </svg>
    );
  }
  return (
    <svg className="ntg-edge ntg-edge--bottom" viewBox="0 0 1605 68" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="1605" height="14" fill="#ebeae8" />
      {BOTTOM_BLOCKS.map(([x, y], index) => <rect key={`${x}-${y}`} x={x} y="0" width="83" height={y + 14} fill={index === 0 ? '#d5d6d1' : '#ebeae8'} />)}
    </svg>
  );
}

const COVER = { hallway: 'bg-hallway.webp', 'hallway-error': 'bg-hallway-error.webp', 'lab-tjat': 'bg-lab-tjat.webp', 'lab-tjkt': 'bg-lab-tjkt.webp', 'lab-pplg': 'bg-lab-pplg.webp' };

export function Backdrop({ scene }) {
  if (COVER[scene]) return <div className="ntg-backdrop" aria-hidden="true"><img className="ntg-backdrop__cover" src={asset(COVER[scene])} alt="" /></div>;
  // Campus (intro, M1) and sunset (M8) are layered from the Figma scene parts.
  return (
    <div className="ntg-backdrop" aria-hidden="true">
      <img className="ntg-backdrop__sky" src={asset(scene === 'sunset' ? 'bg-sunset.webp' : 'stage-sky.png')} alt="" />
      <img className="ntg-backdrop__building ntg-backdrop__building--left" src={asset('stage-building.png')} width="335" height="540" alt="" />
      <img className="ntg-backdrop__small ntg-backdrop__small--left" src={asset('stage-building-small.png')} width="168" height="270" alt="" />
      <img className="ntg-backdrop__small ntg-backdrop__small--right" src={asset('stage-building-small.png')} width="168" height="270" alt="" />
      <img className="ntg-backdrop__ground" src={asset('stage-ground.png')} width="1024" height="161" alt="" />
      <img className="ntg-backdrop__school" src={asset('stage-school.png')} width="578" height="432" alt="" />
    </div>
  );
}

export function Drone({ mood, className = 'ntg-drone' }) {
  return (
    <div className={className} aria-hidden="true">
      <img src={asset('drone.png')} width="578" height="432" alt="" />
      {mood && <span className="ntg-drone__mask" />}
      {mood && <img className="ntg-drone__face" src={asset(mood === 'sad' ? 'drone-face-sad.png' : 'drone-face.png')} alt="" />}
    </div>
  );
}

export function BackButton({ onClick, label = 'Kembali' }) {
  const { t } = useLanguage();
  return (
    <button type="button" className="ntg-btn-dark" onClick={onClick}>
      <img src={asset('icon-back.png')} width="144" height="144" alt="" />{t(label)}
    </button>
  );
}

// Shared mission screen: frame, backdrop, progress, Kembali, drone and Nextel's dialog. `children` is the mission panel.
export default function GameStage({ scene, layout = 'cards', step, done, mood, dialog, onBack, actions, footer, live, children }) {
  const { t } = useLanguage();
  const dialogRef = useRef(null);
  // Move focus to the new dialog so keyboard and screen-reader users land on the mission they just opened.
  useEffect(() => { dialogRef.current?.focus({ preventScroll: true }); }, [dialog]);
  return (
    <div className="ntg">
      <div className="ntg-frame">
        <FrameEdge side="top" />
        <div className={`ntg-scene ntg-scene--${layout}`}>
          <Backdrop scene={scene} />
          <div className="ntg-top">
            <div className="ntg-progress" role="img" aria-label={step ? t('Misi {current} dari {total}', { current: step, total: 8 }) : t('Pengenalan misi')}>
              <span className="ntg-progress__badge" aria-hidden="true">{step ? `${step}/8` : '—'}</span>
              <span className="ntg-progress__bar" aria-hidden="true">
                <span className="ntg-progress__fill ntg-progress__fill--now" data-done={done === true} style={{ width: `${(step ?? 0) / 8 * 100}%` }} />
                <span className="ntg-progress__fill" style={{ width: `${Math.max((step ?? 1) - 1, 0) / 8 * 100}%` }} />
              </span>
            </div>
            <div className="ntg-actions">
              {actions}
              {onBack && <BackButton onClick={onBack} />}
            </div>
          </div>
          <Drone mood={mood} />
          <div className="ntg-talk">
            <div className="ntg-dialog">
              <span className="ntg-dialog__name" aria-hidden="true">Nextel</span>
              <h2 ref={dialogRef} tabIndex={-1} className="ntg-dialog__box"><span className="sr-only">Nextel: </span>{t(dialog)}</h2>
            </div>
            {footer && <div className="ntg-footer">{footer}</div>}
            {live !== undefined && <p className="ntg-live" role="status" aria-live="polite">{live}</p>}
          </div>
          {children}
        </div>
        <FrameEdge side="bottom" />
      </div>
    </div>
  );
}
