import { useId, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useLanguage } from '../context/LanguageContext';
import { loopDistance, wavePath } from '../utils/waveMarquee';
import ribbon from '../assets/landing/wave-ribbon.svg';
import tourRibbonBack from '../assets/fasilitas/campus/tour-ribbon-back.svg';
import rocket from '../assets/landing/wave-rocket.svg';
import award from '../assets/landing/wave-award.svg';
import bulb from '../assets/landing/wave-bulb.svg';
import './HomeMotion.css';

const items = [
  { label: 'NEXT GENERATION', icon: rocket, width: 46.9967, height: 46.9931 },
  { label: 'GLOBAL TECHNOPRENEUR', icon: award, width: 54.5356, height: 57.4592 },
  { label: 'AKREDITASI A', icon: bulb, width: 64.0013, height: 65.5526 },
];
const copies = [0, 1, 2, 3, 4, 5];

// One shared geometry for every page: the campus-tour ribbon is the reference design.
export default function WaveMarquee() {
  const { t, language } = useLanguage();
  const ref = useRef(null);
  const pathId = `wave-${useId().replace(/:/g, '')}`;

  useLayoutEffect(() => {
    const root = ref.current;
    const media = gsap.matchMedia();
    let disposed = false;
    document.fonts.ready.then(() => {
      if (disposed) return;
      media.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, ({ conditions }) => {
        const path = root.querySelector('[data-wave-center]');
        const length = path.getTotalLength();
        const widths = [...root.querySelectorAll('[data-wave-measure]')].map(node => node.getComputedTextLength());
        const starts = widths.map((_, index) => widths.slice(0, index).reduce((sum, width) => sum + width + 140, 0));
        const period = widths.reduce((sum, width) => sum + width + 140, 0);
        const texts = [...root.querySelectorAll('[data-wave-text]')];
        const icons = [...root.querySelectorAll('[data-wave-icon]')];
        // Cache geometry once; each frame only writes SVG offsets and transforms.
        const samples = Array.from({ length: Math.ceil(length) + 1 }, (_, index) => path.getPointAtLength(index));
        const phase = { distance: 0 };
        const paint = () => {
          const shift = loopDistance(phase.distance, period);
          texts.forEach((node, copy) => node.setAttribute('startOffset', copy * period - shift));
          icons.forEach((node, index) => {
            const item = index % items.length;
            const distance = Math.floor(index / items.length) * period + starts[item] + widths[item] + 70 - shift;
            const position = Math.max(0, Math.min(samples.length - 2, distance));
            const sample = Math.floor(position);
            const point = samples[sample];
            const next = samples[sample + 1];
            const fraction = position - sample;
            const x = point.x + (next.x - point.x) * fraction;
            const y = point.y + (next.y - point.y) * fraction;
            const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
            node.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`);
          });
        };
        paint();
        root.dataset.ready = 'true';
        if (!conditions.motion) return;
        const tween = gsap.to(phase, { distance: period, duration: period / 85, repeat: -1, ease: 'none', onUpdate: paint });
        root.dataset.loopDuration = String(period / 85);
        let visible = false;
        const sync = () => tween.paused(!visible || document.hidden);
        const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
        observer.observe(root);
        document.addEventListener('visibilitychange', sync);
        sync();
        return () => {
          observer.disconnect();
          document.removeEventListener('visibilitychange', sync);
        };
      });
    });
    return () => { disposed = true; media.revert(); };
  }, [language]);

  return (
    <div ref={ref} data-hero-marquee data-wave-marquee className="home-wave relative w-full overflow-hidden bg-white">
      <ul className="sr-only">{items.map(item => <li key={item.label}>{t(item.label)}</li>)}</ul>
      <svg className="home-wave-canvas" viewBox="0 2354.127 1847 340" aria-hidden="true">
        <image href={tourRibbonBack} transform="matrix(.9998604 .01671177 -.02235702 .99975008 -71.72852 2387.76172)" width="1940.51" height="201.035" />
        <g transform="matrix(.99868232 .05131896 -.05924154 .99824375 -66.72852 2354.36523) translate(0 -20)">
        <defs>
          <path id={pathId} d={wavePath(17)} />
          <path data-wave-center d={wavePath()} />
        </defs>
        <image href={ribbon} x="0" y="20" width="1937.06" height="201.07" />
        <g opacity="0">{items.map(item => <text key={item.label} data-wave-measure>{t(item.label)}</text>)}</g>
        {copies.map(copy => (
          <g key={copy}>
            <text><textPath data-wave-text href={`#${pathId}`}>
              {items.map((item, index) => <tspan key={item.label} dx={index ? 140 : 0}>{t(item.label)}</tspan>)}
            </textPath></text>
            {items.map(item => <g key={item.label} data-wave-icon><image href={item.icon} x={-item.width / 2} y={-item.height / 2} width={item.width} height={item.height} /></g>)}
          </g>
        ))}
        </g>
      </svg>
    </div>
  );
}
