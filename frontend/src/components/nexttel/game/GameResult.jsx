import { useEffect, useRef } from 'react';
import { ChartNoAxesCombined, ListOrdered, Sparkles } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { MAJORS, computeResult } from '../../../features/nexttel-game/engine.mjs';
import { hasilFallbackNextTel } from '../../../services/nexttel';
import NextTelRadar from '../NextTelRadar';
import { asset, MAJOR_LABELS as LABELS } from './assets';
import { BackButton, Drone, FrameEdge } from './GameStage';

const MISSION_NAMES = { m1: 'Misi 1 · Waktu luang', m2: 'Misi 2 · Layar informasi', m3: 'Misi 3 · Pintu glitch', m4: 'Misi 4 · Optik laser (Lab TJAT)', m5: 'Misi 5 · Sakelar sistem (Lab TJKT)', m6: 'Misi 6 · Blok kode (Lab RPL)', m7: 'Misi 7 · Rating kegiatan', m8: 'Misi 8 · Hubungan potensi' };
const RULES = [
  'Misi 1–3: kartu A memberi RPL +3 dan PG +1, B memberi PG +3 dan RPL +1, C memberi TKJ +3 dan TJAT +1, D memberi TJAT +3 dan TKJ +1 (sama dengan mode Quiz).',
  'Misi 4 (optik): selesai memberi TJAT +2 dan TKJ +2, ditambah +1 masing-masing bila tanpa hint.',
  'Misi 5 (sakelar): setiap sakelar yang menyala memberi +3 ke jurusannya.',
  'Misi 6 (blok kode): selesai memberi RPL +2 dan PG +2, ditambah +1 masing-masing bila tanpa hint.',
  'Misi 7 (rating): nilai 1–5 dikurangi 1, jadi 0–4 poin ke jurusan kegiatan itu.',
  'Misi 8 (hubungan): setiap garis memberi +2 ke jurusan bidang yang kamu pilih.',
  'Skor maksimum setiap jurusan sama, yaitu {max}. Jika seri, pemenangnya dipilih dari rating Misi 7, lalu jumlah hubungan Misi 8, lalu urutan tetap RPL, PG, TKJ, TJAT.',
];
const TIE_NOTE = {
  rating: 'Skor teratas seri, jadi dipilih jurusan dengan rating Misi 7 yang lebih tinggi.',
  links: 'Skor teratas seri, jadi dipilih jurusan dengan hubungan Misi 8 yang lebih banyak.',
  order: 'Skor teratas seri sepenuhnya, jadi dipakai urutan tetap RPL, PG, TKJ, TJAT. Pertimbangkan juga jurusan alternatifmu.',
};

export default function GameResult({ answers, onBack, onRestart, onQuiz }) {
  const { t, language } = useLanguage();
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  const result = computeResult(answers);
  const top = result.topRecommendation;
  const why = hasilFallbackNextTel({ topRecommendation: top }, language);

  return (
    <div className="ntg ntg-result">
      <FrameEdge side="top" color="#c72028" />
      <div className="ntg-result__banner">
        <p className="ntg-result__eyebrow">{t('Rekomendasi utama')}</p>
        <h1 ref={headingRef} tabIndex={-1}>{t(LABELS[top])}</h1>
        <p className="ntg-result__note">{t('Rekomendasi ini merupakan panduan berdasarkan minat dan jawabanmu, bukan keputusan resmi penerimaan siswa.')}</p>
        <BackButton onClick={onBack} />
      </div>
      <div className="ntg-result__scene">
        <div className="ntg-backdrop" aria-hidden="true">
          <img className="ntg-backdrop__sky" src={asset('stage-sky.png')} alt="" />
          <img className="ntg-backdrop__cover" style={{ objectPosition: 'center 85%' }} src={asset('gate.png')} width="578" height="432" alt="" />
        </div>
        <img className="ntg-result__laurel ntg-result__laurel--left" src={asset('laurel.png')} width="360" height="360" alt="" aria-hidden="true" />
        <img className="ntg-result__laurel ntg-result__laurel--right" src={asset('laurel.png')} width="360" height="360" alt="" aria-hidden="true" />
        <div className="ntg-result__content">
          <section className="ntg-result__card" aria-labelledby="ntg-chart-title">
            <h2 id="ntg-chart-title"><ChartNoAxesCombined className="h-5 w-5" aria-hidden="true" />{t('Statistik Minat Jurusan')}</h2>
            <div className="ntg-result__inner"><NextTelRadar ranking={result.ranking} labels={LABELS} /></div>
          </section>
          <section className="ntg-result__card" aria-labelledby="ntg-rank-title">
            <h2 id="ntg-rank-title"><ListOrdered className="h-5 w-5" aria-hidden="true" />{t('Peringkat jurusan')}</h2>
            <div className="ntg-result__inner">
              <div className="ntg-result__legend" aria-hidden="true"><span style={{ '--c': '#c72028' }}>{t('Nilai Kamu')}</span><span style={{ '--c': '#d0d0d0' }}>{t('Skala Maksimum')}</span></div>
              <ol>
                {result.ranking.map(([code, score], index) => (
                  <li key={code} className="ntg-score" data-top={index === 0}>
                    <abbr title={t(LABELS[code])} className="no-underline">{index + 1}. {code}</abbr>
                    <span className="ntg-score__bar" aria-hidden="true"><i style={{ width: `${score / result.max * 100}%` }} /></span>
                    <span>{t('{score} dari {max}', { score, max: result.max })}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
          <section className="ntg-result__card ntg-result__why-card" aria-labelledby="ntg-why-title">
            <h2 id="ntg-why-title"><Sparkles className="h-5 w-5" aria-hidden="true" />{t('Kenapa jurusan ini cocok?')}</h2>
            <div className="ntg-result__inner ntg-result__why">
              <p>{why.explanation}</p>
              {result.tieBreak && <p><strong>{t(TIE_NOTE[result.tieBreak])}</strong></p>}
              <ul>{why.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
              <p className="mt-3">{t('Alternatif yang juga bisa kamu pertimbangkan: {first} dan {second}.', { first: t(LABELS[result.ranking[1][0]]), second: t(LABELS[result.ranking[2][0]]) })}</p>
              <details className="ntg-result__details mt-4">
                <summary>{t('Cara skor dihitung')}</summary>
                <ul>{RULES.map((rule) => <li key={rule}>{t(rule, { max: result.max })}</li>)}</ul>
                <div className="ntg-breakdown-wrap mt-3">
                  <table className="ntg-breakdown">
                    <caption className="sr-only">{t('Rincian poin per misi')}</caption>
                    <thead><tr><th scope="col">{t('Misi')}</th>{MAJORS.map((code) => <th key={code} scope="col">{code}</th>)}</tr></thead>
                    <tbody>{result.breakdown.map(({ id, points }) => <tr key={id}><th scope="row">{t(MISSION_NAMES[id])}</th>{MAJORS.map((code) => <td key={code}>{points[code]}</td>)}</tr>)}</tbody>
                    <tfoot><tr><td>{t('Total')}</td>{MAJORS.map((code) => <td key={code}>{result.scores[code]}</td>)}</tr></tfoot>
                  </table>
                </div>
              </details>
            </div>
          </section>
          <div className="ntg-result__actions ntg-result__why-card">
            <button type="button" className="ntg-btn-red" onClick={onRestart}>{t('Main lagi dari awal')}</button>
            <button type="button" className="ntg-btn-dark" onClick={onQuiz}>{t('Coba Mode Quiz')}</button>
          </div>
        </div>
        <Drone mood="happy" className="ntg-drone ntg-result__drone" />
      </div>
      <FrameEdge side="bottom" />
    </div>
  );
}
