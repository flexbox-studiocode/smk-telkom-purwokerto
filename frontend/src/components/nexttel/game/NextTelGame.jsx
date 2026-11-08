import { useEffect, useReducer, useRef } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { MISSIONS, gameReducer, hasProgress, isComplete, loadState, reachable, saveState } from '../../../features/nexttel-game/engine.mjs';
import GameStage from './GameStage';
import { ChoiceCards, RatingPanel, SwitchPanel } from './SimpleMissions';
import OpticPanel from './OpticPanel';
import CodePanel from './CodePanel';
import MatchPanel from './MatchPanel';
import GameResult from './GameResult';

const gameStorage = () => { try { return window.localStorage; } catch { return null; } };

const LAYOUT = { choice: 'cards', optic: 'panel', switch: 'panel', code: 'code', rating: 'panel', match: 'panel' };
const REQUIREMENT = {
  optic: 'Putar optik sampai Koneksi 100% untuk lanjut.',
  switch: 'Nyalakan tepat 2 sakelar untuk lanjut.',
  code: 'Jalankan program sampai kunci terambil untuk lanjut.',
  match: 'Hubungkan keempat potensi ke bidangnya untuk lanjut.',
};

// Game mode: intro → missions 1–8 → result. State lives in the engine reducer and is saved to localStorage,
// so refreshing, going back or switching language never loses progress.
export default function NextTelGame({ onExit, onQuiz }) {
  const { t } = useLanguage();
  const [state, dispatch] = useReducer(gameReducer, null, () => loadState(gameStorage()));
  const topRef = useRef(null);
  const firstRender = useRef(true);
  useEffect(() => { saveState(gameStorage(), state); }, [state]);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    topRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [state.screen, state.index]);

  const restart = () => { if (window.confirm(t('Mulai ulang game? Semua progres misi akan dihapus.'))) dispatch({ type: 'reset' }); };
  let screen;

  if (state.screen === 'result') {
    screen = <GameResult answers={state.answers} onBack={() => dispatch({ type: 'go', index: MISSIONS.length - 1 })} onRestart={restart} onQuiz={onQuiz} />;
  } else if (state.screen === 'intro') {
    const resume = hasProgress(state);
    screen = (
      <GameStage scene="campus" layout="intro" mood="happy" onBack={onExit}
        dialog="Beep-boop! Aku Nextel. Yuk selesaikan 8 misi singkat buat nemuin jurusan impianmu di Stematel!"
        footer={<>
          <button type="button" className="ntg-btn-red" onClick={() => dispatch({ type: 'start' })}>{resume ? t('Lanjutkan Misi {n}', { n: Math.min(state.index, reachable(state.answers)) + 1 }) : t('Mulai Misi')}</button>
          {resume && <button type="button" className="ntg-btn-dark" onClick={restart}>{t('Ulang dari awal')}</button>}
        </>}
      />
    );
  } else {
    const mission = MISSIONS[state.index];
    const answer = state.answers[mission.id];
    const set = (value) => dispatch({ type: 'answer', id: mission.id, value });
    const complete = isComplete(mission.id, answer);
    const last = state.index === MISSIONS.length - 1;
    const next = () => dispatch(last ? { type: 'finish' } : { type: 'go', index: state.index + 1 });
    const back = () => dispatch({ type: 'go', index: state.index - 1 });
    const common = { scene: mission.scene, layout: LAYOUT[mission.type], step: state.index + 1, mood: mission.mood, dialog: mission.dialog, onBack: back };

    if (mission.type === 'choice') {
      screen = (
        <GameStage {...common} actions={complete && <button type="button" className="ntg-btn-dark" onClick={next}>{t('Lanjut')} →</button>}>
          <ChoiceCards mission={mission} value={answer} onPick={(id) => { set(id); dispatch({ type: 'go', index: state.index + 1 }); }} />
        </GameStage>
      );
    } else {
      const Panel = { optic: OpticPanel, switch: SwitchPanel, code: CodePanel, rating: RatingPanel, match: MatchPanel }[mission.type];
      screen = (
        <GameStage {...common}
          footer={<button type="button" className="ntg-btn-red" disabled={!complete} aria-describedby={complete ? undefined : 'ntg-requirement'} onClick={next}>{t(last ? 'Lihat Hasil' : 'Next Stage')}</button>}
          live={complete ? '' : <span id="ntg-requirement">{t(REQUIREMENT[mission.type])}</span>}>
          <Panel key={mission.id} mission={mission} value={answer} onChange={set} />
        </GameStage>
      );
    }
  }

  return <div ref={topRef} className="ntg-root scroll-mt-24">{screen}</div>;
}
