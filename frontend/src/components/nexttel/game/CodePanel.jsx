import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { BLOCK_TYPES, CODE_GRID, CODE_HINT, CODE_LIMIT, codeEdit, codeRun, historyRedo, historyUndo, newBlock } from '../../../features/nexttel-game/engine.mjs';
import { asset } from './assets';

const LETTER = { forward: 'A', turn: 'B', pickup: 'C', jump: 'D' };
const ICON = { forward: 'icon-forward.png', turn: 'icon-back.png', pickup: 'key.png', jump: 'icon-jump.png' };
const ERRORS = {
  empty: 'Papan program masih kosong. Tambahkan blok dulu.',
  wall: 'Ups, aku menabrak tembok di blok {n}. Coba Lompat lalu Maju 2 petak.',
  edge: 'Aku keluar dari papan di blok {n}.',
  jumpNeedsForward2: 'Blok Lompat di urutan {n} harus langsung diikuti Maju 2 petak.',
  noKey: 'Tidak ada kunci di petak ini (blok {n}).',
  keyNotTaken: 'Program selesai, tapi kuncinya belum diambil.',
};
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function blockText(block, t) {
  if (block.type === 'forward') return t('Maju {n} Petak', { n: block.steps });
  if (block.type === 'turn') return t('Rotate {dir} {n}x', { dir: t(block.dir === 'left' ? 'kiri' : 'kanan'), n: block.times });
  return t(block.type === 'pickup' ? 'Ambil Kunci' : 'Lompat');
}

function BlockFields({ block, disabled, onEdit, t, index }) {
  if (block.type === 'forward') {
    return <>{t('Maju')}<input type="number" min="1" max="3" value={block.steps} disabled={disabled} aria-label={t('Jumlah petak blok {n}', { n: index + 1 })} onChange={(event) => { if (!Number.isNaN(event.target.valueAsNumber)) onEdit({ ...block, steps: event.target.valueAsNumber }); }} />{t('Petak')}</>;
  }
  if (block.type === 'turn') {
    return <>Rotate
      <select value={block.dir} disabled={disabled} aria-label={t('Arah putar blok {n}', { n: index + 1 })} onChange={(event) => onEdit({ ...block, dir: event.target.value })}>
        <option value="left">{t('kiri')}</option><option value="right">{t('kanan')}</option>
      </select>
      <input type="number" min="1" max="3" value={block.times} disabled={disabled} aria-label={t('Jumlah putaran blok {n}', { n: index + 1 })} onChange={(event) => { if (!Number.isNaN(event.target.valueAsNumber)) onEdit({ ...block, times: event.target.valueAsNumber }); }} />x</>;
  }
  return blockText(block, t);
}

// M6: build a program from blocks A–D so the drone reaches the key.
export default function CodePanel({ value, onChange }) {
  const { t } = useLanguage();
  const [frames, setFrames] = useState(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [outcome, setOutcome] = useState(null);
  const [hintOpen, setHintOpen] = useState(value.hintUsed);
  const [over, setOver] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);

  const running = frames !== null && frameIndex < frames.length - 1;
  const locked = value.solved || running;
  const program = value.current;
  const edit = (next) => { setOutcome(null); setFrames(null); onChange(codeEdit(value, next)); };
  const add = (type, at = program.length) => { if (program.length < CODE_LIMIT) edit([...program.slice(0, at), newBlock(type), ...program.slice(at)]); };
  const move = (from, to) => { if (to < 0 || to >= program.length || from === to) return; const next = [...program]; const [item] = next.splice(from, 1); next.splice(to, 0, item); edit(next); };

  const run = () => {
    clearInterval(timer.current);
    const { run: result, answer } = codeRun(value);
    const finish = () => { setOutcome(result); if (result.ok) onChange(answer); };
    setOutcome(null);
    setFrames(result.frames);
    if (reduceMotion() || result.frames.length < 2) { setFrameIndex(result.frames.length - 1); finish(); return; }
    setFrameIndex(0);
    let index = 0;
    timer.current = setInterval(() => {
      index += 1;
      setFrameIndex(index);
      if (index >= result.frames.length - 1) { clearInterval(timer.current); finish(); }
    }, 380);
  };

  const frame = frames?.[frameIndex] ?? (value.solved ? { ...CODE_GRID.key, facing: 0, hasKey: true } : { ...CODE_GRID.start, hasKey: false });
  const activeBlock = running ? frames[frameIndex]?.block : -1;
  const message = outcome && (outcome.ok ? t('Berhasil! Kuncinya sudah kuambil.') : t(ERRORS[outcome.error], { n: outcome.block + 1 }));
  const onDrop = (event, at) => {
    event.preventDefault(); event.stopPropagation(); setOver(false);
    if (locked) return;
    const data = event.dataTransfer.getData('text/plain');
    if (data.startsWith('new:') && BLOCK_TYPES.includes(data.slice(4))) add(data.slice(4), at);
    if (data.startsWith('move:')) { const from = Number(data.slice(5)); move(from, Math.min(at ?? program.length - 1, program.length - 1)); }
  };

  return (
    <section className="ntg-panel ntg-code" aria-label={t('Panel kode drone')}>
      <div className="ntg-code__top">
        <div className="ntg-code__grid" role="img" aria-label={t('Papan 4 × 3. Drone di baris 2 kolom 2 menghadap kanan, tembok di kolom 3 baris 1–2, kunci di baris 1 kolom 4.')}>
          {Array.from({ length: CODE_GRID.rows * CODE_GRID.cols }, (_, cell) => {
            const row = Math.floor(cell / CODE_GRID.cols); const col = cell % CODE_GRID.cols;
            const wall = CODE_GRID.walls.findIndex(([r, c]) => r === row && c === col);
            const here = frame.row === row && frame.col === col;
            return (
              <div key={cell} className="ntg-code__cell">
                {wall !== -1 && <img src={asset(wall === 0 ? 'wall-a.png' : 'wall-b.png')} width="55" height="55" alt="" />}
                {row === CODE_GRID.key.row && col === CODE_GRID.key.col && !frame.hasKey && <img src={asset('key.png')} width="160" height="150" alt="" />}
                {here && <span className="ntg-code__drone" data-jump={Boolean(frame.jump)} style={{ transform: `rotate(${frame.facing * 90}deg)` }}><img src={asset('drone-top.png')} width="200" height="150" alt="" /></span>}
              </div>
            );
          })}
        </div>
        <div className="ntg-code__side">
          <button type="button" className="ntg-small-btn ntg-small-btn--red ntg-hint-btn" aria-expanded={hintOpen} aria-controls="ntg-code-hint" disabled={value.solved} onClick={() => { setHintOpen(true); if (!value.hintUsed) onChange({ ...value, hintUsed: true }); }}>
            <img src={asset('m1-bulb.png')} width="393" height="437" alt="" />hint
          </button>
          <button type="button" className="ntg-small-btn" disabled={locked || !value.past.length} onClick={() => { setOutcome(null); setFrames(null); onChange(historyUndo(value)); }}>↶ Undo</button>
          <button type="button" className="ntg-small-btn" disabled={locked || !value.future.length} onClick={() => { setOutcome(null); setFrames(null); onChange(historyRedo(value)); }}>Redo ↷</button>
        </div>
      </div>
      {hintOpen && (
        <div id="ntg-code-hint" className="ntg-code__hint">
          {t('Petunjuk: Lompat hanya bisa melewati tembok jika langsung diikuti Maju 2 petak.')}
          <ol>{CODE_HINT.map((block, index) => <li key={index}>{LETTER[block.type]} · {blockText(block, t)}</li>)}</ol>
        </div>
      )}
      <div className="ntg-code__board">
        <span className="ntg-code__label" id="ntg-palette-label">{t('Blok kode — ketuk untuk menambah, atau seret ke papan program')}</span>
        <div className="ntg-code__palette" role="group" aria-labelledby="ntg-palette-label">
          {BLOCK_TYPES.map((type) => (
            <button key={type} type="button" draggable={!locked} className={`ntg-block ntg-block--${type}`} disabled={locked || program.length >= CODE_LIMIT}
              onDragStart={(event) => event.dataTransfer.setData('text/plain', `new:${type}`)} onClick={() => add(type)}
              aria-label={t('Tambah blok {letter}: {name}', { letter: LETTER[type], name: blockText(newBlock(type), t) })}>
              <span className="ntg-block__key">{LETTER[type]}</span><img src={asset(ICON[type])} alt="" />{type === 'forward' ? t('Maju _ Petak') : type === 'turn' ? t('Rotate kiri/kanan') : blockText(newBlock(type), t)}
            </button>
          ))}
        </div>
        <span className="ntg-code__label" id="ntg-program-label">{t('Papan program ({count}/{max} blok)', { count: program.length, max: CODE_LIMIT })}</span>
        <ol className="ntg-code__program" aria-labelledby="ntg-program-label" data-over={over}
          onDragOver={(event) => { if (!locked) { event.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)} onDrop={(event) => onDrop(event, program.length)}>
          {!program.length && <li className="ntg-code__empty">{t('Belum ada blok. Ketuk blok A–D di atas.')}</li>}
          {program.map((block, index) => (
            <li key={index} className={`ntg-block ntg-block--${block.type}`} draggable={!locked} data-active={activeBlock === index} data-error={outcome && !outcome.ok && outcome.block === index}
              onDragStart={(event) => event.dataTransfer.setData('text/plain', `move:${index}`)} onDragOver={(event) => { if (!locked) event.preventDefault(); }} onDrop={(event) => onDrop(event, index)}>
              <span className="ntg-block__key" aria-hidden="true">{LETTER[block.type]}</span>
              <img src={asset(ICON[block.type])} alt="" />
              <BlockFields block={block} index={index} disabled={locked} t={t} onEdit={(next) => edit(program.map((item, i) => (i === index ? next : item)))} />
              <span className="ntg-block__tools">
              <button type="button" className="ntg-block__remove" disabled={locked || index === 0} aria-label={t('Naikkan blok {n}', { n: index + 1 })} onClick={() => move(index, index - 1)}>↑</button>
              <button type="button" className="ntg-block__remove" disabled={locked || index === program.length - 1} aria-label={t('Turunkan blok {n}', { n: index + 1 })} onClick={() => move(index, index + 1)}>↓</button>
              <button type="button" className="ntg-block__remove" disabled={locked} aria-label={t('Hapus blok {n}', { n: index + 1 })} onClick={() => edit(program.filter((_, i) => i !== index))}>×</button>
              </span>
            </li>
          ))}
        </ol>
        <div className="ntg-code__run">
          <p className="ntg-code__msg" role="status" aria-live="polite" data-tone={outcome ? (outcome.ok ? 'ok' : 'error') : undefined}>{value.solved && !outcome ? t('Berhasil! Kuncinya sudah kuambil.') : message}</p>
          <button type="button" className="ntg-small-btn ntg-small-btn--green" disabled={locked} onClick={run}>{t('Jalankan')}</button>
        </div>
      </div>
    </section>
  );
}
