import { useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { SWITCHES_REQUIRED } from '../../../features/nexttel-game/engine.mjs';
import { asset } from './assets';

// M1–M3: four slanted cards. Picking one answers the mission (the container then moves on).
export function ChoiceCards({ mission, value, onPick }) {
  const { t } = useLanguage();
  return (
    <div className="ntg-cards" role="group" aria-label={t('Pilihan jawaban')}>
      {mission.options.map((option) => (
        <button key={option.id} type="button" className="ntg-card" aria-pressed={value === option.id} onClick={() => onPick(option.id)}>
          <span className="ntg-card__body">
            <img className="ntg-card__icon" src={asset(option.icon)} alt="" />
            <span className="ntg-card__label">{t(option.label)}</span>
          </span>
          <span className="ntg-card__tag" aria-hidden="true">{option.id.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}

// M5: exactly two switches may be on.
export function SwitchPanel({ mission, value, onChange }) {
  const { t } = useLanguage();
  const [notice, setNotice] = useState('');
  const toggle = (id) => {
    if (value.includes(id)) { setNotice(''); onChange(value.filter((item) => item !== id)); return; }
    if (value.length >= SWITCHES_REQUIRED) { setNotice(t('Maksimal 2 sakelar. Matikan salah satu dulu.')); return; }
    setNotice('');
    onChange([...value, id]);
  };
  return (
    <section className="ntg-panel" aria-labelledby="ntg-switch-title">
      <h3 id="ntg-switch-title" className="ntg-panel__title ntg-panel__title--center">{t('Panel Sakelar Sistem')}<br />({t('{count}/{total} Aktif', { count: value.length, total: SWITCHES_REQUIRED })})</h3>
      <div className="ntg-switches">
        {mission.switches.map((item) => {
          const on = value.includes(item.id);
          const locked = !on && value.length >= SWITCHES_REQUIRED;
          return (
            <div key={item.id} className="ntg-switch-row">
              <span id={`ntg-switch-${item.id}`}>{t(item.label)}</span>
              <button type="button" role="switch" className="ntg-toggle" aria-checked={on} aria-disabled={locked} aria-labelledby={`ntg-switch-${item.id}`} onClick={() => toggle(item.id)}>
                <span className="ntg-toggle__knob" aria-hidden="true" />
                <span aria-hidden="true">{on ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          );
        })}
      </div>
      <p className="ntg-panel__notice" role="status" aria-live="polite">{notice}</p>
    </section>
  );
}

// M7: four 1–5 ratings using native range inputs (arrow keys, touch and mouse all work).
export function RatingPanel({ mission, value, onChange }) {
  const { t } = useLanguage();
  return (
    <section className="ntg-panel" aria-labelledby="ntg-rating-title">
      <h3 id="ntg-rating-title" className="ntg-panel__title">{t('Rating Seberapa Suka Kamu dengan Kegiatan Ini')}</h3>
      <div className="ntg-ratings">
        {mission.items.map((item) => (
          <div key={item.id} className="ntg-rating">
            <img src={asset(item.icon)} alt="" />
            <label htmlFor={`ntg-rate-${item.id}`}>{t(item.label)}</label>
            <div className="ntg-rating__scale">
              <span className="ntg-rating__ends" aria-hidden="true"><span>1</span><span>5</span></span>
              <input
                id={`ntg-rate-${item.id}`}
                className="ntg-range"
                type="range"
                min="1"
                max="5"
                step="1"
                value={value[item.id]}
                style={{ '--fill': `${(value[item.id] - 1) / 4 * 100}%` }}
                aria-valuetext={t('{value} dari 5', { value: value[item.id] })}
                onChange={(event) => onChange({ ...value, [item.id]: Number(event.target.value) })}
              />
              <span className="ntg-rating__value" aria-hidden="true">{t('{value} dari 5', { value: value[item.id] })}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
