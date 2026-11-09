import accent from '../assets/landing/section-motif.png';

// Koordinat pusat dan matriks orientasi asli Figma; Y mengikuti section existing.
// Ukuran dibatasi kedua sumbu supaya tinggi konten tidak memperbesar dekorasi.
const positions = {
  departments: [
    ['24:594', 'left-[0.62085%] top-[14.45668%] size-[min(12.6115cqw,28.91331cqh)] [transform:matrix(1,0,0,1,0,0)]'],
    ['24:468', 'left-[12.31569%] top-[14.45668%] size-[min(12.6115cqw,28.91331cqh)] [transform:matrix(-0.0005943586002103984,0.9999998211860657,-0.9999998211860657,-0.0005943586002103984,0,0)]'],
    ['24:471', 'left-[0.76247%] top-[39.0115%] size-[min(12.6115cqw,28.91331cqh)] [transform:matrix(-0.007671474013477564,0.999970555305481,-0.999970555305481,-0.007671474013477564,0,0)]'],
    ['24:474', 'left-[0.67275%] top-[65.79587%] size-[min(12.6115cqw,28.91331cqh)] [transform:matrix(-0.9999658465385437,-0.008265813812613487,0.008265813812613487,-0.9999658465385437,0,0)]'],
    ['24:378', 'left-[94.31958%] top-[31.93629%] size-[min(12.6115cqw,28.91331cqh)] [transform:matrix(-0.007671474013477564,0.999970555305481,-0.999970555305481,-0.007671474013477564,0,0)]'],
    ['24:381', 'left-[94.22987%] top-[58.72066%] size-[min(12.6115cqw,28.91331cqh)] [transform:matrix(-0.9999658465385437,-0.008265813812613487,0.008265813812613487,-0.9999658465385437,0,0)]'],
    ['24:384', 'left-[94.23545%] top-[85.39249%] size-[min(12.6115cqw,28.91331cqh)] [transform:matrix(-0.9999449253082275,-0.010491604916751385,0.010491604916751385,-0.9999449253082275,0,0)]'],
    ['24:387', 'left-[82.55285%] top-[85.11129%] size-[min(12.6115cqw,28.91331cqh)] [transform:matrix(0.01108593214303255,-0.9999385476112366,0.9999385476112366,0.01108593214303255,0,0)]'],
  ],
  achievements: [
    ['24:883', 'col-start-2 row-start-2 [transform:matrix(-0.9999645352363586,-0.008419422432780266,0.008419422432780266,-0.9999645352363586,0,0)]', 'left'],
    ['24:886', 'col-start-1 row-start-1 [transform:matrix(-0.9999645352363586,-0.008419422432780266,0.008419422432780266,-0.9999645352363586,0,0)]', 'left'],
    ['24:889', 'col-start-1 row-start-2 [transform:matrix(0.009013758040964603,-0.9999593496322632,0.9999593496322632,0.009013758040964603,0,0)]', 'left'],
    // Match the four right-side schoolTeachers accents without changing section content.
    ['24:404', 'left-[88.33441%] top-[20.32155%] size-[min(12.6115cqw,32.78147cqh)] [transform:matrix(1,-1.1058862159352145e-16,1.1058862159352145e-16,1,0,0)]'],
    ['24:407', 'left-[98.3469%] top-[43.25126%] size-[min(12.6115cqw,32.78147cqh)] [transform:matrix(1,-1.1058862159352145e-16,1.1058862159352145e-16,1,0,0)]'],
    ['24:410', 'left-[88.87207%] top-[46.62884%] size-[min(12.6115cqw,32.78147cqh)] [transform:matrix(-4.371139183945161e-8,-1,1,-4.371139183945161e-8,0,0)]'],
    ['24:708', 'left-[98.83789%] top-[16.38105%] size-[min(12.6115cqw,32.78147cqh)] [transform:matrix(-0.0005943586002103984,0.9999998211860657,-0.9999998211860657,-0.0005943586002103984,0,0)]'],
  ],
  schoolTeachers: [
    ['24:883', 'left-[13.90042%] top-[80.04703%] size-[min(12.6115cqw,32.78147cqh)] [transform:matrix(-0.9999645352363586,-0.008419422432780266,0.008419422432780266,-0.9999645352363586,0,0)]'],
    ['24:886', 'left-[3.96253%] top-[56.89901%] size-[min(12.6115cqw,32.78147cqh)] [transform:matrix(-0.9999645352363586,-0.008419422432780266,0.008419422432780266,-0.9999645352363586,0,0)]'],
    ['24:889', 'left-[3.38453%] top-[83.75751%] size-[min(12.6115cqw,32.78147cqh)] [transform:matrix(0.009013758040964603,-0.9999593496322632,0.9999593496322632,0.009013758040964603,0,0)]'],
    ['24:894', 'left-[88.33441%] top-[20.32155%] size-[min(12.6115cqw,32.78147cqh)] [transform:matrix(1,-1.1058862159352145e-16,1.1058862159352145e-16,1,0,0)]'],
    ['24:897', 'left-[98.3469%] top-[43.25126%] size-[min(12.6115cqw,32.78147cqh)] [transform:matrix(1,-1.1058862159352145e-16,1.1058862159352145e-16,1,0,0)]'],
    ['24:900', 'left-[88.87207%] top-[46.62884%] size-[min(12.6115cqw,32.78147cqh)] [transform:matrix(-4.371139183945161e-8,-1,1,-4.371139183945161e-8,0,0)]'],
    ['24:964', 'left-[98.83789%] top-[16.38105%] size-[min(12.6115cqw,32.78147cqh)] [transform:matrix(-0.0005943586002103984,0.9999998211860657,-0.9999998211860657,-0.0005943586002103984,0,0)]'],
  ],
  headmaster: [
    ['12:64', 'left-[83.78274%] top-[27.06375%] size-[min(12.6115cqw,51.53414cqh)] [transform:matrix(1,-1.1058862159352145e-16,1.1058862159352145e-16,1,0,0)]'],
    ['12:67', 'left-[94.9901%] top-[74.18765%] size-[min(12.6115cqw,51.53414cqh)] [transform:matrix(1,-1.1058862159352145e-16,1.1058862159352145e-16,1,0,0)]'],
    ['12:70', 'left-[95.48113%] top-[25.75168%] size-[min(12.6115cqw,51.53414cqh)] [transform:matrix(-0.0005943586002103984,0.9999998211860657,-0.9999998211860657,-0.0005943586002103984,0,0)]'],
  ],
  teachers: [
    ['12:73', 'left-[16.2212%] top-[72.89102%] size-[min(12.6115cqw,51.53414cqh)] [transform:matrix(-1,8.742277657347586e-8,-8.742277657347586e-8,-1,0,0)]'],
    ['12:76', 'left-[5.01384%] top-[25.76713%] size-[min(12.6115cqw,51.53414cqh)] [transform:matrix(-1,8.742277657347586e-8,-8.742277657347586e-8,-1,0,0)]'],
    ['12:79', 'left-[4.52281%] top-[74.20309%] size-[min(12.6115cqw,51.53414cqh)] [transform:matrix(0.0005942711723037064,-0.9999998211860657,0.9999998211860657,0.0005942711723037064,0,0)]'],
  ],
  activities: [
    ['59:144', 'left-[95.88967%] top-[16.4727%] size-[min(12.6115cqw,15.84125cqh)] [transform:matrix(-0.007671474013477564,0.999970555305481,-0.999970555305481,-0.007671474013477564,0,0)]'],
    ['59:153', 'left-[95.79996%] top-[31.14753%] size-[min(12.6115cqw,15.84125cqh)] [transform:matrix(-0.9999658465385437,-0.008265813812613487,0.008265813812613487,-0.9999658465385437,0,0)]'],
    ['59:162', 'left-[95.80556%] top-[45.7607%] size-[min(12.6115cqw,15.84125cqh)] [transform:matrix(-0.9999449253082275,-0.010491604916751385,0.010491604916751385,-0.9999449253082275,0,0)]'],
    ['59:192', 'left-[13.88581%] top-[7.91594%] size-[min(12.6115cqw,15.84125cqh)] [transform:matrix(-0.0005943586002103984,0.9999998211860657,-0.9999998211860657,-0.0005943586002103984,0,0)]'],
    ['59:195', 'left-[2.33258%] top-[24.42956%] size-[min(12.6115cqw,15.84125cqh)] [transform:matrix(-0.007671474013477564,0.999970555305481,-0.999970555305481,-0.007671474013477564,0,0)]'],
    ['59:210', 'left-[-1.27635%] top-[92.01413%] size-[min(12.6115cqw,15.84125cqh)] [transform:matrix(-0.9999658465385437,-0.008265813812613487,0.008265813812613487,-0.9999658465385437,0,0)]'],
    ['59:409', 'left-[2.19097%] top-[12.33643%] size-[min(12.6115cqw,15.84125cqh)] [transform:matrix(1,0,0,1,0,0)]'],
  ],
};

export default function SectionAccents({ variant }) {
  // Kluster 2x3 rapat (celah ~11% sisi kotak) mengikuti referensi; orientasi per kotak dari Figma.
  if (variant === 'departmentsQuiz') {
    const tiles = ['', 'rotate-90', '-rotate-90', '', '-rotate-90', ''];
    return (
      <div aria-hidden="true" data-accent-section={variant} className="pointer-events-none absolute inset-0 hidden overflow-hidden [container-type:size] min-[1440px]:block">
        <div className="absolute right-[0.5cqw] top-1/2 grid -translate-y-1/2 grid-cols-2 gap-[3.4cqh]">
          {tiles.map((rotation, index) => <img key={index} src={accent} alt="" className={`aspect-square w-[min(30cqh,12.6cqw)] select-none ${rotation}`} />)}
        </div>
      </div>
    );
  }
  return (
    <div aria-hidden="true" data-accent-section={variant} className={`pointer-events-none absolute inset-0 overflow-hidden [container-type:size] ${variant === 'achievements' ? '' : 'hidden min-[1440px]:block'} ${variant === 'schoolTeachers' ? 'min-[1660px]:hidden min-[1800px]:block' : ''}`}>
      {variant === 'achievements' && (
        // Satu grid menjaga jarak antarmotif saat lebar dan tinggi section berubah.
        <div className="absolute bottom-[8%] left-2 grid w-[min(26cqw,60cqh)] grid-cols-2 gap-2 sm:gap-4">
          {positions[variant].filter(([, , side]) => side === 'left').map(([id, position, side]) => (
            <img key={id} data-figma-node={id} data-accent-side={side} src={accent} alt="" className={`aspect-square w-full select-none ${position}`} />
          ))}
        </div>
      )}
      {positions[variant].filter(([, , side]) => side !== 'left').map(([id, position, side]) => (
        <img key={id} data-figma-node={id} data-accent-side={side} src={accent} alt="" className={`absolute max-w-none -translate-x-1/2 -translate-y-1/2 select-none ${variant === 'achievements' && side !== 'left' ? 'hidden min-[1440px]:block' : ''} ${position}`} />
      ))}
    </div>
  );
}
