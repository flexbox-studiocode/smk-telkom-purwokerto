import { noteRuntimeResult, resolveAiConfig } from '../../services/aiRuntimeConfig.js';
import { AiProviderError } from '../../services/aiErrors.js';
import { callAiProvider } from '../../services/aiProvider.js';

const LABELS = { RPL: 'Rekayasa Perangkat Lunak (RPL)', PG: 'Pengembangan Game (PG)', TKJ: 'Teknik Komputer dan Jaringan (TKJ)', TJAT: 'Teknik Jaringan Akses Telekomunikasi (TJAT)' };

/** Penjelasan deterministik: tidak bergantung pada provider AI mana pun. */
export function hasilPenjelasan(result, language = 'id') {
  const en = language === 'en';
  const label = LABELS[result?.topRecommendation];
  return label
    ? {
      explanation: en
        ? `Based on your answers, the highest score is ${label}. This is a learning guide, not an admission decision.`
        : `Berdasarkan jawabanmu, skor tertinggi adalah ${label}. Hasil ini adalah panduan belajar, bukan keputusan penerimaan.`,
      strengths: [en ? `Your strongest interest is ${label}.` : `Minatmu paling kuat pada ${label}.`],
      learningSuggestions: [en ? `Try a beginner project related to ${label}.` : `Coba proyek pemula yang berkaitan dengan ${label}.`],
    }
    : {
      explanation: en ? 'Your interests do not point to one program yet.' : 'Minatmu belum menunjukkan satu jurusan yang paling jelas.',
      strengths: [en ? 'Your answers are still balanced.' : 'Jawabanmu masih seimbang.'],
      learningSuggestions: [en ? 'Try software, game, networking, or telecommunications activities.' : 'Coba kegiatan di bidang software, game, jaringan, atau telekomunikasi.'],
    };
}

function buildMessages(result, language) {
  const en = language === 'en';
  const ranking = (result?.ranking ?? []).map(([major, score]) => `${major}: ${score}`).join(', ');
  return [
    { role: 'system', content: en ? 'You write short, factual learning guidance for vocational school students. Never invent facts and never change the recommended program.' : 'Anda menulis panduan belajar singkat dan faktual untuk siswa SMK. Jangan mengarang fakta dan jangan mengubah jurusan yang direkomendasikan.' },
    { role: 'user', content: `${en ? 'Answer language: English' : 'Bahasa jawaban: Indonesia'}\n${JSON.stringify({ topRecommendation: result?.topRecommendation ?? null, ranking })}` },
  ];
}

/**
 * Skor selalu dihitung lokal oleh hitungHasilNextTel. Provider eksternal hanya
 * menyusun narasi penjelasan. Kegagalan provider tidak boleh menggagalkan
 * rekomendasi: fallback deterministik tetap dikembalikan.
 */
export async function jelaskanHasil(result, language = 'id') {
  const fallback = hasilPenjelasan(result, language);
  const config = await resolveAiConfig('nexttel');
  if (!config?.apiKey || config.disabled) return { ...fallback, explanationSource: 'fallback' };
  try {
    const text = await callAiProvider(config, buildMessages(result, language), { timeoutMs: 15000 });
    noteRuntimeResult('nexttel', config, 'OK');
    return { ...fallback, explanation: text, explanationSource: 'provider' };
  } catch (error) {
    // Scoring lokal tetap dikembalikan; status hanya dicatat untuk dashboard.
    if (error instanceof AiProviderError) noteRuntimeResult('nexttel', config, error.code);
    return { ...fallback, explanationSource: 'fallback' };
  }
}

export { LABELS as NEXTTEL_LABELS };
