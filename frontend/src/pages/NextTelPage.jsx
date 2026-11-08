import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import MainLayout from '../layouts/MainLayout';
import NextTelIntro from '../components/nexttel/NextTelIntro';
import NextTelQuestionnaire from '../components/nexttel/NextTelQuestionnaire';
import NextTelResult from '../components/nexttel/NextTelResult';
import NextTelModeSelect from '../components/nexttel/NextTelModeSelect';
import NextTelGame from '../components/nexttel/game/NextTelGame';
import { hasProgress, loadState, reachable } from '../features/nexttel-game/engine.mjs';
import { hasilFallbackNextTel, jelaskanRekomendasiNextTel, PESAN_NEXTTEL_GAGAL } from '../services/nexttel';
import { hitungHasilNextTel } from '../../../backend/src/modules/nexttel/scoring.mjs';

import { NEXTTEL_QUESTIONS as QUESTIONS } from '../data/nexttelQuestions';
import '../styles/nexttel.css';
import '../styles/nexttel-game.css';

const savedGame = () => { try { return loadState(window.localStorage); } catch { return null; } };

const NextTelPage = () => {
  const { language } = useLanguage();
  // A game that was in progress reopens straight away after a refresh.
  const [mode, setMode] = useState(() => { const game = savedGame(); return game && game.screen !== 'intro' ? 'game' : 'intro'; });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const mulai = () => { setMode('questionnaire'); setCurrentIndex(0); setAnswers({}); setError(null); };
  const jawab = (questionId, optionId, text = '') => setAnswers((previous) => ({ ...previous, [questionId]: { optionId, text } }));
  const selesai = async () => {
    const selectedAnswers = QUESTIONS.map(({ id: questionId }) => {
      const answer = answers[questionId];
      return { questionId, optionId: answer?.optionId, ...(answer?.optionId === 'e' ? { text: answer.text.trim() } : {}) };
    });
    const computed = hitungHasilNextTel(selectedAnswers);
    if (!computed) {
      setError(language === 'en' ? 'Please complete each answer with valid text.' : 'Lengkapi setiap jawaban dengan teks yang valid.');
      return;
    }
    setResult(computed);
    setMode('result');
    setLoading(true);
    setError(null);
    setExplanation(null);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const response = await jelaskanRekomendasiNextTel({
        answers: selectedAnswers,
        language,
      }, { signal: controller.signal });
      if (controllerRef.current === controller && !controller.signal.aborted) setExplanation({ ...response, language });
    } catch (requestError) {
      if (requestError?.name !== 'AbortError' && controllerRef.current === controller && !controller.signal.aborted) {
        setExplanation({ ...hasilFallbackNextTel(computed, language), language });
        setError(PESAN_NEXTTEL_GAGAL);
      }
    } finally {
      if (controllerRef.current === controller) { controllerRef.current = null; setLoading(false); }
    }
  };
  const lanjut = () => {
    const answer = answers[QUESTIONS[currentIndex].id];
    if (!answer?.optionId || (answer.optionId === 'e' && !answer.text.trim())) return;
    if (currentIndex === QUESTIONS.length - 1) selesai();
    else setCurrentIndex((value) => value + 1);
  };
  const resumeStep = () => { const game = savedGame(); return game && hasProgress(game) ? (game.screen === 'result' ? 8 : Math.min(game.index, reachable(game.answers)) + 1) : null; };
  const restart = () => { controllerRef.current?.abort(); controllerRef.current = null; setMode('intro'); setResult(null); setExplanation(null); setError(null); setLoading(false); };

  return (
    <MainLayout showSupportSections={false} showMarquees={false}>
      <section className={`nexttel-page nexttel-page--${mode}`}>
        <div className="nexttel-page__container">
          {mode === 'intro' && <NextTelIntro onStart={() => setMode('select')} />}
          {mode === 'select' && <NextTelModeSelect onQuiz={mulai} onGame={() => setMode('game')} resumeStep={resumeStep()} />}
          {mode === 'game' && <NextTelGame onExit={() => setMode('select')} onQuiz={mulai} />}
          {mode === 'questionnaire' && error && <p role="alert" className="mb-4 text-sm text-primary">{error}</p>}
          {mode === 'questionnaire' && <NextTelQuestionnaire questions={QUESTIONS} currentIndex={currentIndex} answers={answers} onAnswer={jawab} onNext={lanjut} onBack={() => setCurrentIndex((value) => Math.max(0, value - 1))} />}
          {mode === 'result' && result && <NextTelResult result={result} explanation={explanation} loading={loading} error={error} onRetry={selesai} onRestart={restart} />}
        </div>
      </section>
    </MainLayout>
  );
};

export default NextTelPage;
