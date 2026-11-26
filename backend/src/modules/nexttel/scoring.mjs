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
const TEXT_SIGNALS = {
  RPL: [[/\b(software|perangkat lunak|aplikasi|web development|pengembangan web|programming|pemrograman|coding|kode|database|basis data|javascript|python|java|html|css|developer perangkat lunak)\b/g, 2]],
  PG: [[/\b(game development|pengembangan game|game developer|membuat game|video game|video games|unity| unreal|godot|gamemaker|game engine|permainan digital|desain game)\b/g, 2]],
  TKJ: [[/\b(networking|jaringan komputer|computer network|network engineer|networking engineer|router|switch|server|wifi|wi-fi|lan|wan|tcp\/ip|cybersecurity|keamanan jaringan|infrastruktur jaringan|konfigurasi jaringan)\b/g, 2]],
  TJAT: [[/\b(telekomunikasi|telecommunications|telecommunication|fiber optik|fiber optic|serat optik|optical fiber|ftth|jaringan akses|access network|menara|base station|bts|kabel optik|sinyal komunikasi|transmisi data|perangkat akses)\b/g, 2]],
};

export const normalisasiTeksNextTel = (value) => String(value ?? '').normalize('NFKC').toLocaleLowerCase('id-ID').replace(/[’']/g, "'").replace(/[-_/]+/g, ' ').replace(/[^\p{L}\p{N}\s.#+]/gu, ' ').replace(/\s+/g, ' ').trim();
export const klasifikasiTeksNextTel = (text) => { const normalized = normalisasiTeksNextTel(text); const scores = Object.fromEntries(MAJOR_ORDER.map((m) => [m, 0])); if (!normalized) return { normalized, scores, matchedMajors: [] }; for (const m of MAJOR_ORDER) { for (const [p, w] of TEXT_SIGNALS[m]) { scores[m] += (normalized.match(p)?.length ?? 0) * w; } } return { normalized, scores, matchedMajors: MAJOR_ORDER.filter((m) => scores[m] > 0) }; };

export function hitungHasilNextTel(answers) {
  if (!Array.isArray(answers) || answers.length !== QUESTION_IDS.length) return null;
  const byId = new Map();
  for (const a of answers) { if (!a || typeof a.questionId !== 'string' || typeof a.optionId !== 'string' || !QUESTION_IDS.includes(a.questionId) || !Object.hasOwn(SCORE_BY_OPTION, a.optionId) || byId.has(a.questionId)) return null; if (a.optionId === 'e' && (typeof a.text !== 'string' || !a.text.trim() || a.text.trim().length > MAX_FREE_TEXT)) return null; byId.set(a.questionId, a); }
  if (byId.size !== QUESTION_IDS.length) return null;
  const normalizedAnswers = QUESTION_IDS.map((qid) => { const a = byId.get(qid); const n = { questionId: qid, optionId: a.optionId }; if (a.optionId === 'e') n.text = normalisasiTeksNextTel(a.text).slice(0, MAX_FREE_TEXT); return n; });
  const scores = Object.fromEntries(MAJOR_ORDER.map((m) => [m, 0]));
  let freeTextSignals = 0;
  for (const a of normalizedAnswers) { const s = SCORE_BY_OPTION[a.optionId]; for (const m of MAJOR_ORDER) scores[m] += s[m]; if (a.optionId === 'e') { const c = klasifikasiTeksNextTel(a.text); freeTextSignals += c.matchedMajors.length; for (const m of MAJOR_ORDER) scores[m] += c.scores[m]; } }
  const ranking = [...MAJOR_ORDER].sort((a, b) => scores[b] - scores[a] || MAJOR_ORDER.indexOf(a) - MAJOR_ORDER.indexOf(b)).map((m) => [m, scores[m]]);
  const highest = ranking[0][1];
  const tied = ranking.filter(([, s]) => s === highest).length > 1;
  const topRecommendation = highest > 0 && !tied ? ranking[0][0] : null;
  // Setiap jurusan menerima maksimal 3 poin dari masing-masing 8 pertanyaan.
  // Free-text memakai sinyal bonus dan tidak mengubah skala pilihan standar.
  const maxScoreByMajor = Object.fromEntries(MAJOR_ORDER.map((major) => [major, QUESTION_IDS.length * 3]));
  return { answers: normalizedAnswers, scores, ranking, topRecommendation, maxScore: QUESTION_IDS.length * 3, maxScoreByMajor, hasSignal: highest > 0, ambiguous: !topRecommendation, freeTextSignals };
}
