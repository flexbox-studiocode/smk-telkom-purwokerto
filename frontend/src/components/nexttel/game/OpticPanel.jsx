import { useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { OPTIC_NODES, OPTIC_SOLUTION, evaluateOptics, historyRedo, historyUndo, opticReset, opticRotate } from '../../../features/nexttel-game/engine.mjs';
import { asset } from './assets';

const DIRECTION = ['utara', 'timur', 'selatan', 'barat'];
// Board cells, row by row: nodes at the corners, pipes between them (index = OPTIC_LINKS position).
const CELLS = [
  { node: 'A' }, { pipe: 0, dir: 'h' }, { node: 'B' },
  { pipe: 1, dir: 'v' }, {}, { pipe: 2, dir: 'v' },
  { node: 'C' }, { pipe: 3, dir: 'h' }, { node: 'D' },
];

// Cumulative turn angle per node: 3 -> 0 keeps going clockwise (+90deg) instead of spinning back 270deg; undo turns back 90deg.
function useTurn(rotation) {
  const [turn, setTurn] = useState({ rot: rotation, deg: rotation * 90, n: 0 });
  if (turn.rot === rotation) return turn;
  const delta = (((rotation - turn.rot) % 4) + 4) % 4;
  const next = { rot: rotation, deg: turn.deg + (delta === 3 ? -1 : delta) * 90, n: turn.n + 1 };
  setTurn(next); // adjusting state while rendering: React re-renders immediately, before paint
  return next;
}

function Ports({ node, deg, className }) {
  return (
    <span className={className} style={{ transform: `rotate(${deg}deg)` }} aria-hidden="true">
      {OPTIC_NODES[node].shape.map((dir) => <span key={dir} className="ntg-optic__port" data-dir={dir} />)}
    </span>
  );
}

function OpticNode({ node, rotation, lit, solved, hint, label, onRotate }) {
  const turn = useTurn(rotation);
  return (
    <button type="button" className="ntg-optic__node" data-lit={lit} disabled={solved} aria-label={label} onClick={onRotate}>
      <Ports node={node} deg={turn.deg} className="ntg-optic__ports" />
      {hint && <Ports node={node} deg={OPTIC_SOLUTION[node] * 90} className="ntg-optic__ghost" />}
      <img src={asset(`optic-${node.toLowerCase()}.png`)} alt="" draggable="false" />
      {turn.n > 0 && <span key={turn.n} className="ntg-optic__pulse" aria-hidden="true" />}
    </button>
  );
}

// M4: rotate the four optic nodes until the laser reaches the receiver through every pipe.
export default function OpticPanel({ value, onChange }) {
  const { t } = useLanguage();
  const state = evaluateOptics(value.current);
  const describe = (node) => t('Optik {node}, terbuka ke {dirs}', { node, dirs: OPTIC_NODES[node].shape.map((dir) => t(DIRECTION[(dir + value.current[node]) % 4])).join(', ') });
  return (
    <section className="ntg-panel ntg-optic" data-solved={state.solved} aria-label={t('Panel optik laser')}>
      <div className="ntg-optic__head">
        <div className="ntg-optic__laser-in">Laser In</div>
        <div className="ntg-optic__status">
          <div className="ntg-optic__meter" role="status" aria-live="polite">
            <b key={state.percent} className="ntg-optic__pct">{t('Koneksi {percent}%', { percent: state.percent })}</b>
            <span aria-hidden="true"><i style={{ width: `${state.percent}%` }} /></span>
          </div>
          <div className="ntg-optic__tools">
            <button type="button" className="ntg-small-btn ntg-small-btn--red" onClick={() => onChange(opticReset(value))} disabled={value.solved}>Reset</button>
            <button type="button" className="ntg-small-btn" onClick={() => onChange(historyUndo(value))} disabled={value.solved || !value.past.length}>↶ Undo</button>
            <button type="button" className="ntg-small-btn" onClick={() => onChange(historyRedo(value))} disabled={value.solved || !value.future.length}>Redo ↷</button>
            <button type="button" className="ntg-small-btn ntg-small-btn--red ntg-hint-btn" aria-pressed={value.hintUsed} onClick={() => onChange({ ...value, hintUsed: true })} disabled={value.solved || value.hintUsed}>
              <img src={asset('m1-bulb.png')} width="393" height="437" alt="" />hint
            </button>
          </div>
        </div>
      </div>
      <div className="ntg-optic__stage">
        <span className="ntg-optic__emitter" data-on={state.inlet} aria-hidden="true" />
        <div className="ntg-optic__board">
          {CELLS.map((cell, index) => (
            <div key={index} className="ntg-optic__cell">
              {cell.pipe !== undefined && <>
                <img className={`ntg-optic__pipe ntg-optic__pipe--${cell.dir}`} src={asset('pipe.png')} width="81" height="36" alt="" />
                <span className={`ntg-optic__beam ntg-optic__beam--${cell.dir}`} data-on={state.pipes[cell.pipe]} aria-hidden="true" />
              </>}
              {cell.node === 'A' && <span className="ntg-optic__beam ntg-optic__beam--in" data-on={state.inlet} aria-hidden="true" />}
              {cell.node === 'D' && <span className="ntg-optic__beam ntg-optic__beam--out" data-on={state.outlet} aria-hidden="true" />}
              {cell.node && (
                <OpticNode
                  node={cell.node}
                  rotation={value.current[cell.node]}
                  lit={state.lit.includes(cell.node)}
                  solved={value.solved}
                  hint={value.hintUsed && !value.solved}
                  label={`${t('Putar')} ${describe(cell.node)}`}
                  onRotate={() => onChange(opticRotate(value, cell.node))}
                />
              )}
            </div>
          ))}
        </div>
        <div className="ntg-optic__out">
          <span className="ntg-optic__out-label">RCVR OUT</span>
          <span className="ntg-optic__plug" data-on={state.outlet} aria-hidden="true"><img src={asset('icon-bolt.png')} width="89" height="66" alt="" /></span>
        </div>
      </div>
      <p className="sr-only">{t('Pipa: A–B, A–C, B–D, C–D. Laser masuk dari kiri optik A, receiver ada di kanan optik D.')}</p>
    </section>
  );
}
