import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { asset } from './assets';

const COLORS = ['#ffd54a', '#ff7ab6', '#7dd3fc', '#86efac'];
const LEFT_EDGE = `${100 / 2.7}%`;
const RIGHT_EDGE = `${170 / 2.7}%`;
const rowCenter = (index) => `${(index + 0.5) * 25}%`;

// M8: link each potential (left) to the field it fits (right). Several potentials may share a field.
// Tap/click a potential, then a field; dragging with a mouse from a potential onto a field works too.
export default function MatchPanel({ mission, value, onChange }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(null);
  const dragging = useRef(null);
  useEffect(() => {
    const clear = () => setTimeout(() => { dragging.current = null; }, 0);
    window.addEventListener('pointerup', clear);
    return () => window.removeEventListener('pointerup', clear);
  }, []);

  const link = (potential, field) => {
    const next = { ...value };
    if (next[potential] === field) delete next[potential]; else next[potential] = field;
    onChange(next);
    setSelected(null);
  };
  const fieldIndex = (id) => mission.fields.findIndex((field) => field.id === id);
  const label = (list, id) => t(list.find((item) => item.id === id).label);

  return (
    <section className="ntg-panel" aria-labelledby="ntg-match-title">
      <h3 id="ntg-match-title" className="ntg-panel__title">{t('Hubungan Potensimu')}</h3>
      <div className="ntg-match">
        <svg className="ntg-match__lines" aria-hidden="true" focusable="false">
          {mission.potentials.map((item, index) => value[item.id] && (
            <line key={item.id} x1={LEFT_EDGE} y1={rowCenter(index)} x2={RIGHT_EDGE} y2={rowCenter(fieldIndex(value[item.id]))} stroke={COLORS[index]} strokeWidth="5" strokeLinecap="square" />
          ))}
        </svg>
        {mission.potentials.map((item, index) => (
          <button key={item.id} type="button" className="ntg-match__item ntg-match__item--left" style={{ gridRow: index + 1, '--link-color': COLORS[index] }}
            aria-pressed={selected === item.id} data-linked={Boolean(value[item.id])}
            aria-label={value[item.id] ? t('{name}, terhubung ke {field}. Pilih untuk mengganti.', { name: t(item.label), field: label(mission.fields, value[item.id]) }) : t('{name}, belum terhubung. Pilih lalu pilih bidangnya.', { name: t(item.label) })}
            onPointerDown={(event) => { if (event.pointerType === 'mouse') dragging.current = item.id; }}
            onDragStart={(event) => event.preventDefault()}
            onClick={() => setSelected(selected === item.id ? null : item.id)}>
            <img src={asset(item.icon)} alt="" draggable="false" />{t(item.label)}
          </button>
        ))}
        {mission.fields.map((field, index) => (
          <button key={field.id} type="button" className="ntg-match__item ntg-match__item--right" style={{ gridRow: index + 1, '--link-color': COLORS[mission.potentials.findIndex((item) => value[item.id] === field.id)] ?? 'var(--ntg-blue)' }}
            data-linked={Object.values(value).includes(field.id)} aria-disabled={!selected}
            aria-label={selected ? t('Hubungkan {name} ke {field}', { name: label(mission.potentials, selected), field: t(field.label) }) : t('{field}. Pilih potensi di kiri dulu.', { field: t(field.label) })}
            onPointerUp={() => { if (dragging.current) { link(dragging.current, field.id); dragging.current = null; } }}
            onClick={() => { if (selected) link(selected, field.id); }}>
            <img src={asset(field.icon)} alt="" draggable="false" />{t(field.label)}
          </button>
        ))}
      </div>
      <ul className="ntg-match__summary" aria-live="polite">
        {mission.potentials.map((item) => <li key={item.id}>{t(item.label)} → {value[item.id] ? label(mission.fields, value[item.id]) : t('belum dipilih')}</li>)}
      </ul>
    </section>
  );
}
