import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { hallOfFame } from '../../data/dummyData';
import ContentImage from '../ContentImage';
import PrestasiHallDecoration from './PrestasiHallDecoration';
import star from '../../assets/prestasi-remake/AntDesignStarFilled.svg';
import profileIcon from '../../assets/prestasi-remake/Vector2.svg';
import previousIcon from '../../assets/prestasi-remake/Group65.svg';

const PrestasiPerjalananSection = ({ items = hallOfFame.items }) => {
  const { t } = useLanguage();
  const [start, setStart] = useState(0);
  const [perPage, setPerPage] = useState(4);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const tablet = window.matchMedia('(min-width: 640px)');
    const update = () => setPerPage(desktop.matches ? 4 : tablet.matches ? 2 : 1);
    update();
    desktop.addEventListener('change', update);
    tablet.addEventListener('change', update);
    return () => {
      desktop.removeEventListener('change', update);
      tablet.removeEventListener('change', update);
    };
  }, []);

  const canMove = items.length > perPage;
  const move = (step) => {
    if (canMove) setStart((current) => (current + step + items.length) % items.length);
  };
  const shown = Array.from({ length: Math.min(perPage, items.length) }, (_, index) =>
    items[((canMove ? start : 0) + index) % items.length]
  );

  return (
    <section id="hall-of-fame" aria-labelledby="hall-of-fame-title" className="relative isolate overflow-hidden bg-[#cd091d] py-6 font-[family-name:'Plus_Jakarta_Sans',var(--font-sans)] [container-type:inline-size] lg:pb-[1.6811cqw] lg:pt-[1.3015cqw]">
      <PrestasiHallDecoration />
      <h2 id="hall-of-fame-title" className="relative flex items-center justify-center gap-2 text-2xl font-extrabold leading-tight text-white lg:gap-[0.4338cqw] lg:text-[2.603cqw]">
        <span aria-hidden="true" className="relative block size-6 lg:size-[2.17cqw]">
          <img src={star} alt="" className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-12 scale-[0.6] lg:scale-[calc(100cqw/1844px)]" />
        </span>
        {t(hallOfFame.title)}
        <span className="relative block size-6 lg:size-[2.17cqw]">
          <img src={star} alt="" aria-hidden="true" className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 scale-[0.6] lg:scale-[calc(100cqw/1844px)]" />
        </span>
      </h2>

      {items.length ? (
        <div className="relative mx-auto mt-6 w-[92%] max-w-[1512px] lg:mt-[1.3557cqw] lg:w-[82%]">
          <div id="hall-of-fame-cards" role="group" aria-roledescription={t('Karusel')} aria-label={t(hallOfFame.title)} tabIndex={canMove ? 0 : undefined} onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              move(event.key === 'ArrowLeft' ? -1 : 1);
            }
          }} className="mx-auto flex w-[75%] items-stretch justify-center gap-5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-[80%] lg:w-full lg:gap-[3.1453cqw]">
            {shown.map((person) => (
              <article key={person.name} className="flex min-h-84 w-full min-w-0 flex-col items-center rounded-[20px] bg-white px-3 pb-6 pt-4 text-center shadow-[0_0_24px_rgba(130,130,130,0.25)] sm:w-[calc((100%-1.25rem)/2)] lg:min-h-[20.12cqw] lg:w-[15.3471cqw] lg:shrink-0 lg:rounded-[1.0846cqw] lg:px-[1.0846cqw] lg:pb-[2.061cqw] lg:pt-[0.8134cqw]">
                <ContentImage src={person.image} alt={t(person.imageAlt || person.name)} loading="lazy" className="size-24 shrink-0 rounded-full object-cover object-top lg:size-[6.5629cqw]" />
                <h3 className="mt-3 text-sm font-bold leading-tight text-black lg:mt-[0.5423cqw] lg:text-[clamp(0.75rem,1.0846cqw,1.25rem)]">
                  {person.name}
                </h3>
                <p className="mt-1 text-xs font-medium leading-snug text-black/70 lg:text-[clamp(0.6875rem,0.8677cqw,1rem)]">{t(person.achievement)}</p>
                <div className="mt-auto flex flex-col items-center pt-5 lg:pt-[0.7592cqw]">
                  <span className="relative block size-9 overflow-hidden lg:h-[2.4403cqw] lg:w-[2.603cqw]">
                    <img src={profileIcon} alt="" aria-hidden="true" className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 scale-75 lg:scale-[calc(100cqw/1844px)]" />
                  </span>
                  <p className="mt-2 text-xs font-medium leading-snug text-black/70 lg:text-[clamp(0.6875rem,0.8677cqw,1rem)]">{t(person.role)}{person.company && <><br />{person.company}</>}</p>
                </div>
              </article>
            ))}
          </div>
          {[-1, 1].map((step) => (
            <button key={step} type="button" onClick={() => move(step)} disabled={!canMove} aria-controls="hall-of-fame-cards" aria-label={t(step < 0 ? 'Alumni sebelumnya' : 'Alumni berikutnya')} className={`absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-default disabled:opacity-60 lg:size-[3.9046cqw] ${step < 0 ? 'left-0 lg:-left-[0.1627cqw]' : 'right-0 lg:-right-[0.1627cqw]'}`}>
              <span className={`relative block size-full ${step > 0 ? 'rotate-180' : ''}`}>
                <img src={previousIcon} alt="" aria-hidden="true" className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 scale-[0.55] lg:scale-[calc(100cqw/1844px)]" />
              </span>
            </button>
          ))}
          <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{shown.map((person) => person.name).join(', ')}</p>
        </div>
      ) : <p className="relative py-8 text-center text-sm text-white">{t('Profil alumni belum tersedia.')}</p>}
    </section>
  );
};

export default PrestasiPerjalananSection;
