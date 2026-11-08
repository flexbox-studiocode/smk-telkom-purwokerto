import { useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import HeroBreadcrumb from '../HeroBreadcrumb';
import { asset } from './game/assets';

// Figma 406:1556: choose between the existing Quiz and the new Game mode.
export default function NextTelModeSelect({ onQuiz, onGame, resumeStep }) {
  const { t } = useLanguage();
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  return (
    <div className="nexttel-intro">
      <HeroBreadcrumb current="NexTel" parent="Beranda" parentTo="/" />
      <div className="ntg-mode">
        <div className="ntg-mode__panel" aria-hidden="true"><img src={asset('mode-panel.png')} width="1457" height="486" alt="" /></div>
        <div className="ntg-mode__prompt">
          <img className="ntg-mode__robot" src={asset('mode-robot.png')} width="500" height="500" alt="" aria-hidden="true" />
          <h1 ref={headingRef} tabIndex={-1}>{t('Mau Jawab Pertanyaan Versi Apa?')}</h1>
          <p>{t('Pilih mode favoritmu, yuk!')}</p>
        </div>
        <div className="ntg-mode__cards">
          <button type="button" className="ntg-mode__card" onClick={onQuiz}>
            <img className="ntg-mode__art" src={asset('mode-quiz.png')} width="151" height="151" alt="" />
            <span><span className="ntg-mode__name">{t('Quiz')}</span><span className="ntg-mode__sub">{t('Uji pengetahuanmu')}</span></span>
            <img className="ntg-mode__arrow" src={asset('mode-arrow.svg')} width="62" height="62" alt="" />
          </button>
          <button type="button" className="ntg-mode__card" onClick={onGame}>
            <img className="ntg-mode__art" src={asset('drone.png')} width="578" height="432" alt="" />
            <span>
              <span className="ntg-mode__name">{t('Game')}</span><span className="ntg-mode__sub">{t('Belajar sambil bermain')}</span>
              {resumeStep && <span className="ntg-mode__resume">{t('Lanjutkan dari Misi {n}', { n: resumeStep })}</span>}
            </span>
            <img className="ntg-mode__arrow" src={asset('mode-arrow.svg')} width="62" height="62" alt="" />
          </button>
        </div>
      </div>
    </div>
  );
}
