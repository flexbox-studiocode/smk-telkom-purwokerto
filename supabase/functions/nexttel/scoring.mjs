const QUESTION_IDS = ['activity', 'interest', 'project', 'learning', 'problem', 'tool', 'work', 'future'];
const MAJOR_ORDER = ['RPL', 'PG', 'TKJ', 'TJAT'];
const SCORE_BY_OPTION = {
  a: { RPL: 3, PG: 1, TKJ: 0, TJAT: 0 },
  b: { RPL: 1, PG: 3, TKJ: 0, TJAT: 0 },
  c: { RPL: 0, PG: 0, TKJ: 3, TJAT: 1 },
  d: { RPL: 0, PG: 0, TKJ: 1, TJAT: 3 },
  e: { RPL: 0, PG: 0, TKJ: 0, TJAT: 0 },
};
const MAX_FREE_TEXT = 240;

// Phrase-first matching avoids treating broad words such as "teknologi" or "sistem"
// as a major. These terms are intentionally shared by the browser and Edge Function.
const TEXT_SIGNALS = {
  RPL: [
    [/\b(software|perangkat lunak|aplikasi|web development|pengembangan web|programming|pemrograman|coding|kode|database|basis data|javascript|python|java|html|css|developer perangkat lunak)\b/g, 2],
  ],
  PG: [
    [/\b(game development|pengembangan game|game developer|membuat game|video game|video games|unity| unreal|godot|gamemaker|game engine|permainan digital|desain game)\b/g, 2],
  ],
  TKJ: [
    [/\b(networking|jaringan komputer|computer network|network engineer|networking engineer|router|switch|server|wifi|wi-fi|lan|wan|tcp\/ip|cybersecurity|keamanan jaringan|infrastruktur jaringan|konfigurasi jaringan)\b/g, 2],
  ],
  TJAT: [
    [/\b(telekomunikasi|telecommunications|telecommunication|fiber optik|fiber optic|serat optik|optical fiber|ftth|jaringan akses|access network|menara|base station|bts|kabel optik|sinyal komunikasi|transmisi data|perangkat akses)\b/g, 2],
  ],
};

export const normalisasiTeksNextTel = (value) => String(value ?? '')
  .normalize('NFKC').toLocaleLowerCase('id-ID').replace(/[’']/g, "'")
  .replace(/[-_/]+/g, ' ').replace(/[^\p{L}\p{N}\s.#+]/gu, ' ')
  .replace(/\s+/g, ' ').trim();

export const klasifikasiTeksNextTel = (text) => {
  const normalized = normalisasiTeksNextTel(text);
  const scores = Object.fromEntries(MAJOR_ORDER.map((major) => [major, 0]));
  if (!normalized) return { normalized, scores, matchedMajors: [] };
  for (const major of MAJOR_ORDER) {
    for (const [pattern, weight] of TEXT_SIGNALS[major]) {
      const matches = normalized.match(pattern);
      scores[major] += (matches?.length ?? 0) * weight;
    }
  }
  return { normalized, scores, matchedMajors: MAJOR_ORDER.filter((major) => scores[major] > 0) };
};

export function hitungHasilNextTel(answers) {
  if (!Array.isArray(answers) || answers.length !== QUESTION_IDS.length) return null;
  const byId = new Map();
  for (const answer of answers) {
    if (!answer || typeof answer.questionId !== 'string' || typeof answer.optionId !== 'string'
      || !QUESTION_IDS.includes(answer.questionId) || !Object.hasOwn(SCORE_BY_OPTION, answer.optionId)
      || byId.has(answer.questionId)) return null;
    if (answer.optionId === 'e' && (typeof answer.text !== 'string' || !answer.text.trim() || answer.text.trim().length > MAX_FREE_TEXT)) return null;
    byId.set(answer.questionId, answer);
  }
  if (byId.size !== QUESTION_IDS.length) return null;
  const normalizedAnswers = QUESTION_IDS.map((questionId) => {
    const answer = byId.get(questionId);
    const normalized = { questionId, optionId: answer.optionId };
    if (answer.optionId === 'e') normalized.text = normalisasiTeksNextTel(answer.text).slice(0, MAX_FREE_TEXT);
    return normalized;
  });
  const scores = Object.fromEntries(MAJOR_ORDER.map((major) => [major, 0]));
  let freeTextSignals = 0;
  for (const answer of normalizedAnswers) {
    const optionScore = SCORE_BY_OPTION[answer.optionId];
    for (const major of MAJOR_ORDER) scores[major] += optionScore[major];
    if (answer.optionId === 'e') {
      const classified = klasifikasiTeksNextTel(answer.text);
      freeTextSignals += classified.matchedMajors.length;
      for (const major of MAJOR_ORDER) scores[major] += classified.scores[major];
    }
  }
  /** @type {Array<[string, number]>} */
  const ranking = [...MAJOR_ORDER].sort((a, b) => scores[b] - scores[a] || MAJOR_ORDER.indexOf(a) - MAJOR_ORDER.indexOf(b)).map((major) => [major, scores[major]]);
  const highest = ranking[0][1];
  const tied = ranking.filter(([, score]) => score === highest).length > 1;
  const topRecommendation = highest > 0 && !tied ? ranking[0][0] : null;
  // Setiap jurusan menerima maksimal 3 poin dari masing-masing 8 pertanyaan.
  // Free-text memakai sinyal bonus dan tidak mengubah skala pilihan standar.
  const maxScoreByMajor = Object.fromEntries(MAJOR_ORDER.map((major) => [major, QUESTION_IDS.length * 3]));
  return { answers: normalizedAnswers, scores, ranking, topRecommendation, maxScore: QUESTION_IDS.length * 3, maxScoreByMajor, hasSignal: highest > 0, ambiguous: !topRecommendation, freeTextSignals };
}
