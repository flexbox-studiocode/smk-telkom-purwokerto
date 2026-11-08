// NextTel career game: pure game logic with no React. Used by the UI and by scripts/uji-nexttel-game.mjs.
// All player-facing strings are Indonesian source text; the UI translates them with t().

export const MAJORS = ['RPL', 'PG', 'TKJ', 'TJAT'];
export const STORAGE_KEY = 'smk-telkom-nexttel-game';
export const STATE_VERSION = 1;

const zero = () => ({ RPL: 0, PG: 0, TKJ: 0, TJAT: 0 });

/* ---------------------------------------------------------------- scoring table
 * M1–M3  choice card        a: RPL+3 PG+1 | b: RPL+1 PG+3 | c: TKJ+3 TJAT+1 | d: TKJ+1 TJAT+3 (same weights as the quiz)
 * M4     optic puzzle (TJAT lab)  solved: TJAT+2 TKJ+2, +1 each when solved without the hint
 * M5     two system switches      each switch that is ON: +3 to its major
 * M6     block code (RPL lab)     solved: RPL+2 PG+2, +1 each when solved without the hint
 * M7     four 1–5 ratings         rating − 1 (0–4) to the rated major
 * M8     potential → field links  +2 to the linked field's major per link (4 links)
 * Every major can reach 27 points. Ties: total, then M7 rating, then M8 links, then the order RPL, PG, TKJ, TJAT.
 */
export const CHOICE_POINTS = { a: { RPL: 3, PG: 1 }, b: { RPL: 1, PG: 3 }, c: { TKJ: 3, TJAT: 1 }, d: { TKJ: 1, TJAT: 3 } };
export const PUZZLE_POINTS = 2;
export const NO_HINT_BONUS = 1;
export const SWITCH_POINTS = 3;
export const LINK_POINTS = 2;
export const MAX_PER_MAJOR = 3 * 3 + (PUZZLE_POINTS + NO_HINT_BONUS) * 1 + SWITCH_POINTS + 4 + LINK_POINTS * 4;

export const MISSIONS = [
  { id: 'm1', type: 'choice', scene: 'campus', dialog: 'Misi pertama! Kalau lagi punya waktu luang, aktivitas apa yang paling bikin kamu asyik sendiri?', options: [
    { id: 'a', icon: 'm1-rocket.png', label: 'Eksplor hal-hal baru' },
    { id: 'b', icon: 'm1-bulb.png', label: 'Bikin karya yang unik' },
    { id: 'c', icon: 'm1-puzzle.png', label: 'Mecahin teka-teki atau masalah' },
    { id: 'd', icon: 'm1-chat.png', label: 'Ngatur acara bareng teman' },
  ] },
  { id: 'm2', type: 'choice', scene: 'hallway', dialog: 'Di lorong gedung ini ada 4 layar informasi. Topik mana yang paling bikin kamu penasaran?', options: [
    { id: 'a', icon: 'icon-chip.png', label: 'Update teknologi terbaru' },
    { id: 'b', icon: 'icon-palette.png', label: 'Karya seni dan kreativitas' },
    { id: 'c', icon: 'icon-gears.png', label: 'Cara kerja suatu alat' },
    { id: 'd', icon: 'm1-bulb.png', label: 'Ide dan peluang baru' },
  ] },
  { id: 'm3', type: 'choice', scene: 'hallway-error', mood: 'sad', dialog: 'Waduh gawat! Pintu laboratoriumnya terkunci karena glitch. Apa yang akan kamu lakukan?', options: [
    { id: 'a', icon: 'icon-routes.png', label: 'Coba jalan atau cara lain' },
    { id: 'b', icon: 'icon-debug.png', label: 'Cari trik kreatif baru' },
    { id: 'c', icon: 'icon-gears.png', label: 'Cek sumber penyebab error-nya' },
    { id: 'd', icon: 'm1-chat.png', label: 'Tanya pendapat teman' },
  ] },
  { id: 'm4', type: 'optic', scene: 'lab-tjat', majors: ['TJAT', 'TKJ'], dialog: 'Misi 4 di Lab TJAT! Putar dan sambungkan optik (A, B, C, D) agar laser merahnya sampai ke receiver.' },
  { id: 'm5', type: 'switch', scene: 'lab-tjkt', dialog: 'Sebelum keluar dari Lab TJKT, nyalakan dua sakelar yang cocok dengan gaya kamu.', switches: [
    { id: 'software', major: 'RPL', label: 'Suka ngulik pengaturan software/aplikasi' },
    { id: 'visual', major: 'PG', label: 'Suka membuat visual tampilan yang keren' },
    { id: 'hardware', major: 'TKJ', label: 'Suka otak-atik komputer dan penasaran cara kerjanya' },
    { id: 'experiment', major: 'TJAT', label: 'Suka bereksperimen dengan teknologi dan hal-hal baru' },
  ] },
  { id: 'm6', type: 'code', scene: 'lab-pplg', majors: ['RPL', 'PG'], dialog: 'Misi 6 di Lab RPL! Susun blok kode (A, B, C, D) ke papan program biar aku bisa ambil kunci!' },
  { id: 'm7', type: 'rating', scene: 'lab-pplg', dialog: 'Yuk, kenali minatmu! Geser setiap bar sesuai seberapa kamu menyukai aktivitas berikut. Pilih yang paling sesuai dengan dirimu, ya!', items: [
    { id: 'game', major: 'PG', icon: 'icon-game.png', label: 'Kreatif dan Game' },
    { id: 'logic', major: 'RPL', icon: 'icon-logic.png', label: 'Suka Berpikir Logika' },
    { id: 'cable', major: 'TJAT', icon: 'icon-cable.png', label: 'Suka Ngulik Kabel' },
    { id: 'computer', major: 'TKJ', icon: 'icon-server.png', label: 'Suka Modif Komputer' },
  ] },
  { id: 'm8', type: 'match', scene: 'sunset', mood: 'happy', dialog: 'Yeay, kamu sampai di akhir petualangan! Yuk, hubungkan minatmu dengan bidang yang cocok. Ingat, nggak ada jawaban yang salah.', potentials: [
    { id: 'logic', icon: 'icon-brain.png', label: 'Berpikir Logis' },
    { id: 'imagination', icon: 'icon-imagination.png', label: 'Daya Imajinasi' },
    { id: 'precision', icon: 'icon-magnifier.png', label: 'Ketelitian Kerja' },
    { id: 'communication', icon: 'icon-bolt.png', label: 'Komunikasi Aktif' },
  ], fields: [
    { id: 'program', major: 'RPL', icon: 'icon-laptop.png', label: 'Membuat Program' },
    { id: 'art', major: 'PG', icon: 'icon-painting.png', label: 'Menggambar Karya' },
    { id: 'problem', major: 'TKJ', icon: 'icon-gear.png', label: 'Mengatasi Masalah' },
    { id: 'people', major: 'TJAT', icon: 'icon-globe.png', label: 'Menghubungkan Orang' },
  ] },
];
const byId = Object.fromEntries(MISSIONS.map((mission) => [mission.id, mission]));
export const mission = (id) => byId[id];

/* ---------------------------------------------------------------- M4 optic puzzle
 * 3×3 board: A (0,0) B (0,2) C (2,0) D (2,2), fixed pipes between them. The laser enters A from the west and the
 * receiver sits east of D. Ports are directions 0 N, 1 E, 2 S, 3 W; rotating a node turns its ports clockwise. */
export const OPTIC_NODES = {
  A: { shape: [3, 1, 2], row: 0, col: 0 },
  B: { shape: [3, 2], row: 0, col: 2 },
  C: { shape: [3, 2], row: 2, col: 0 },
  D: { shape: [3, 1, 2], row: 2, col: 2 },
};
export const OPTIC_LINKS = [['A', 1, 'B', 3], ['A', 2, 'C', 0], ['B', 2, 'D', 0], ['C', 1, 'D', 3]];
export const OPTIC_SOLUTION = { A: 0, B: 0, C: 2, D: 2 };
export const opticPorts = (node, rotation) => OPTIC_NODES[node].shape.map((port) => (port + rotation) % 4);
const hasPort = (orient, node, port) => opticPorts(node, orient[node]).includes(port);

// Segments: laser inlet, the four pipes and the receiver outlet. Light only travels through ports open on both ends.
export function evaluateOptics(orient) {
  const lit = new Set(hasPort(orient, 'A', 3) ? ['A'] : []);
  const pipes = OPTIC_LINKS.map(() => false);
  for (let changed = true; changed;) {
    changed = false;
    OPTIC_LINKS.forEach(([a, pa, b, pb], index) => {
      if (pipes[index] || !hasPort(orient, a, pa) || !hasPort(orient, b, pb) || !(lit.has(a) || lit.has(b))) return;
      pipes[index] = true; lit.add(a); lit.add(b); changed = true;
    });
  }
  const inlet = lit.has('A');
  const outlet = lit.has('D') && hasPort(orient, 'D', 1);
  const connected = [inlet, ...pipes, outlet].filter(Boolean).length;
  return { lit: [...lit].sort(), pipes, inlet, outlet, percent: Math.round(connected / 6 * 100), solved: connected === 6 };
}

export function scrambleOptics(random = Math.random) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const orient = Object.fromEntries(Object.keys(OPTIC_NODES).map((node) => [node, Math.floor(random() * 4) % 4]));
    const wrong = Object.keys(orient).filter((node) => orient[node] !== OPTIC_SOLUTION[node]).length;
    if (wrong >= 3) return orient;
  }
  return { A: 1, B: 2, C: 0, D: 3 };
}

const withHistory = (answer, next) => ({ ...answer, past: [...answer.past, answer.current].slice(-50), future: [], ...next });
export const opticRotate = (answer, node) => {
  if (answer.solved) return answer;
  const current = { ...answer.current, [node]: (answer.current[node] + 1) % 4 };
  return withHistory(answer, { current, solved: evaluateOptics(current).solved });
};
export const opticReset = (answer) => (answer.solved ? answer : withHistory(answer, { current: { ...answer.start } }));
export const historyUndo = (answer) => (answer.solved || !answer.past.length ? answer : { ...answer, past: answer.past.slice(0, -1), future: [answer.current, ...answer.future], current: answer.past.at(-1) });
export const historyRedo = (answer) => (answer.solved || !answer.future.length ? answer : { ...answer, past: [...answer.past, answer.current], future: answer.future.slice(1), current: answer.future[0] });

/* ---------------------------------------------------------------- M6 block code
 * 4×3 grid. The drone starts at row 1, col 1 facing east; walls at (0,2) and (1,2); the key is at (0,3).
 * Blocks: A forward n (1–3), B rotate left/right n times, C pick up key, D jump. A jump must be followed by
 * "forward 2": the drone hops over the next cell (a wall is allowed there) and lands two cells ahead. */
export const CODE_GRID = { rows: 3, cols: 4, start: { row: 1, col: 1, facing: 1 }, key: { row: 0, col: 3 }, walls: [[0, 2], [1, 2]] };
export const CODE_LIMIT = 10;
export const CODE_HINT = [{ type: 'jump' }, { type: 'forward', steps: 2 }, { type: 'turn', dir: 'left', times: 1 }, { type: 'forward', steps: 1 }, { type: 'pickup' }];
const STEP = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const isWall = (row, col) => CODE_GRID.walls.some(([r, c]) => r === row && c === col);
const inside = (row, col) => row >= 0 && row < CODE_GRID.rows && col >= 0 && col < CODE_GRID.cols;

export const BLOCK_TYPES = ['forward', 'turn', 'pickup', 'jump'];
export function newBlock(type) {
  if (type === 'forward') return { type, steps: 1 };
  if (type === 'turn') return { type, dir: 'left', times: 1 };
  return { type };
}
const clampInt = (value, min, max) => Math.min(max, Math.max(min, Math.round(Number(value)) || min));
export function cleanBlock(block) {
  if (!block || !BLOCK_TYPES.includes(block.type)) return null;
  if (block.type === 'forward') return { type: 'forward', steps: clampInt(block.steps, 1, 3) };
  if (block.type === 'turn') return { type: 'turn', dir: block.dir === 'right' ? 'right' : 'left', times: clampInt(block.times, 1, 3) };
  return { type: block.type };
}

// Runs a program and returns every intermediate position so the UI can animate it.
export function runProgram(program) {
  let { row, col, facing } = CODE_GRID.start;
  let hasKey = false;
  const frames = [{ row, col, facing, hasKey, block: -1 }];
  const fail = (error, block) => ({ ok: false, error, block, frames });
  if (!program.length) return fail('empty', -1);
  for (let index = 0; index < program.length; index += 1) {
    const block = program[index];
    if (block.type === 'jump') {
      const next = program[index + 1];
      if (next?.type !== 'forward' || next.steps !== 2) return fail('jumpNeedsForward2', index);
      const [dr, dc] = STEP[facing];
      const landRow = row + dr * 2; const landCol = col + dc * 2;
      if (!inside(landRow, landCol)) return fail('edge', index);
      if (isWall(landRow, landCol)) return fail('wall', index);
      row = landRow; col = landCol; index += 1;
      frames.push({ row, col, facing, hasKey, block: index, jump: true });
    } else if (block.type === 'forward') {
      for (let step = 0; step < block.steps; step += 1) {
        const [dr, dc] = STEP[facing];
        if (!inside(row + dr, col + dc)) return fail('edge', index);
        if (isWall(row + dr, col + dc)) return fail('wall', index);
        row += dr; col += dc;
        frames.push({ row, col, facing, hasKey, block: index });
      }
    } else if (block.type === 'turn') {
      facing = (facing + (block.dir === 'right' ? 1 : 3) * block.times) % 4;
      frames.push({ row, col, facing, hasKey, block: index });
    } else if (block.type === 'pickup') {
      if (row !== CODE_GRID.key.row || col !== CODE_GRID.key.col || hasKey) return fail('noKey', index);
      hasKey = true;
      frames.push({ row, col, facing, hasKey, block: index });
    }
  }
  return hasKey ? { ok: true, frames } : fail('keyNotTaken', program.length - 1);
}

export const codeEdit = (answer, program) => (answer.solved ? answer : withHistory(answer, { current: program.slice(0, CODE_LIMIT).map(cleanBlock).filter(Boolean) }));
export const codeRun = (answer) => { const run = runProgram(answer.current); return { run, answer: run.ok ? { ...answer, solved: true } : answer }; };

/* ---------------------------------------------------------------- state */
export const SWITCHES_REQUIRED = 2;
export const RATING_DEFAULT = 3;

export function createAnswers(random = Math.random) {
  const start = scrambleOptics(random);
  return {
    m1: null, m2: null, m3: null,
    m4: { start, current: { ...start }, past: [], future: [], hintUsed: false, solved: false },
    m5: [],
    m6: { current: [], past: [], future: [], hintUsed: false, solved: false },
    m7: Object.fromEntries(byId.m7.items.map((item) => [item.id, RATING_DEFAULT])),
    m8: {},
  };
}
export const createState = (random) => ({ version: STATE_VERSION, screen: 'intro', index: 0, answers: createAnswers(random) });

export function isComplete(id, answer) {
  const definition = byId[id];
  if (definition.type === 'choice') return Object.hasOwn(CHOICE_POINTS, answer ?? '');
  if (definition.type === 'optic') return answer.solved === true && evaluateOptics(answer.current).solved;
  if (definition.type === 'switch') return answer.length === SWITCHES_REQUIRED;
  if (definition.type === 'code') return answer.solved === true && runProgram(answer.current).ok;
  if (definition.type === 'rating') return definition.items.every((item) => Number.isInteger(answer[item.id]) && answer[item.id] >= 1 && answer[item.id] <= 5);
  return definition.potentials.every((item) => definition.fields.some((field) => field.id === answer[item.id]));
}
// The furthest mission a player may open: the first one that is not complete yet.
export const reachable = (answers) => { const open = MISSIONS.findIndex((m) => !isComplete(m.id, answers[m.id])); return open === -1 ? MISSIONS.length - 1 : open; };
export const allComplete = (answers) => MISSIONS.every((m) => isComplete(m.id, answers[m.id]));

export function gameReducer(state, action) {
  switch (action.type) {
    case 'start': return { ...state, screen: 'mission', index: Math.min(state.index, reachable(state.answers)) };
    case 'intro': return { ...state, screen: 'intro' };
    case 'go': {
      if (action.index < 0) return { ...state, screen: 'intro' };
      if (action.index > reachable(state.answers)) return state;
      return { ...state, screen: 'mission', index: action.index };
    }
    case 'answer': {
      if (!byId[action.id]) return state;
      return { ...state, answers: { ...state.answers, [action.id]: action.value } };
    }
    case 'finish': return allComplete(state.answers) ? { ...state, screen: 'result' } : state;
    case 'reset': return createState(action.random);
    default: return state;
  }
}

/* ---------------------------------------------------------------- scoring */
export function scoreMission(id, answer) {
  const points = zero();
  const definition = byId[id];
  if (!isComplete(id, answer)) return points;
  if (definition.type === 'choice') Object.assign(points, CHOICE_POINTS[answer]);
  if (definition.type === 'optic' || definition.type === 'code') {
    for (const major of definition.majors) points[major] = PUZZLE_POINTS + (answer.hintUsed ? 0 : NO_HINT_BONUS);
  }
  if (definition.type === 'switch') for (const switchId of answer) points[definition.switches.find((item) => item.id === switchId).major] += SWITCH_POINTS;
  if (definition.type === 'rating') for (const item of definition.items) points[item.major] += answer[item.id] - 1;
  if (definition.type === 'match') for (const fieldId of Object.values(answer)) points[definition.fields.find((field) => field.id === fieldId).major] += LINK_POINTS;
  return points;
}

export function computeResult(answers) {
  const breakdown = MISSIONS.map((m) => ({ id: m.id, points: scoreMission(m.id, answers[m.id]) }));
  const scores = zero();
  for (const { points } of breakdown) for (const major of MAJORS) scores[major] += points[major];
  const rating = breakdown.find((item) => item.id === 'm7').points;
  const links = breakdown.find((item) => item.id === 'm8').points;
  const ranked = [...MAJORS].sort((a, b) => scores[b] - scores[a] || rating[b] - rating[a] || links[b] - links[a] || MAJORS.indexOf(a) - MAJORS.indexOf(b));
  const [top, second] = ranked;
  let tieBreak = null;
  if (scores[top] === scores[second]) tieBreak = rating[top] !== rating[second] ? 'rating' : links[top] !== links[second] ? 'links' : 'order';
  return { scores, breakdown, ranking: ranked.map((major) => [major, scores[major]]), topRecommendation: top, tieBreak, max: MAX_PER_MAJOR };
}

/* ---------------------------------------------------------------- persistence */
const isOrient = (value) => value && Object.keys(OPTIC_NODES).every((node) => Number.isInteger(value[node]) && value[node] >= 0 && value[node] < 4);
const isProgram = (value) => Array.isArray(value) && value.length <= CODE_LIMIT && value.every((block) => cleanBlock(block) !== null);

// Restores a saved game. Anything malformed falls back to a fresh default for that part instead of crashing.
export function restoreState(raw, random) {
  const fresh = createState(random);
  let saved;
  try { saved = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return fresh; }
  if (!saved || saved.version !== STATE_VERSION || typeof saved.answers !== 'object' || !saved.answers) return fresh;
  const a = saved.answers; const f = fresh.answers;
  const answers = {
    m1: Object.hasOwn(CHOICE_POINTS, a.m1 ?? '') ? a.m1 : null,
    m2: Object.hasOwn(CHOICE_POINTS, a.m2 ?? '') ? a.m2 : null,
    m3: Object.hasOwn(CHOICE_POINTS, a.m3 ?? '') ? a.m3 : null,
    m4: a.m4 && isOrient(a.m4.start) && isOrient(a.m4.current) && Array.isArray(a.m4.past) && a.m4.past.every(isOrient) && Array.isArray(a.m4.future) && a.m4.future.every(isOrient)
      ? { start: a.m4.start, current: a.m4.current, past: a.m4.past, future: a.m4.future, hintUsed: a.m4.hintUsed === true, solved: evaluateOptics(a.m4.current).solved }
      : f.m4,
    m5: Array.isArray(a.m5) && a.m5.length <= SWITCHES_REQUIRED && a.m5.every((id) => byId.m5.switches.some((item) => item.id === id)) ? [...new Set(a.m5)] : f.m5,
    m6: a.m6 && isProgram(a.m6.current) && Array.isArray(a.m6.past) && a.m6.past.every(isProgram) && Array.isArray(a.m6.future) && a.m6.future.every(isProgram)
      ? { current: a.m6.current.map(cleanBlock), past: a.m6.past.map((p) => p.map(cleanBlock)), future: a.m6.future.map((p) => p.map(cleanBlock)), hintUsed: a.m6.hintUsed === true, solved: a.m6.solved === true && runProgram(a.m6.current.map(cleanBlock)).ok }
      : f.m6,
    m7: a.m7 && byId.m7.items.every((item) => Number.isInteger(a.m7[item.id]) && a.m7[item.id] >= 1 && a.m7[item.id] <= 5) ? Object.fromEntries(byId.m7.items.map((item) => [item.id, a.m7[item.id]])) : f.m7,
    m8: a.m8 && typeof a.m8 === 'object' ? Object.fromEntries(byId.m8.potentials.filter((item) => byId.m8.fields.some((field) => field.id === a.m8[item.id])).map((item) => [item.id, a.m8[item.id]])) : f.m8,
  };
  const index = Number.isInteger(saved.index) ? Math.min(Math.max(saved.index, 0), reachable(answers)) : 0;
  const screen = saved.screen === 'result' ? (allComplete(answers) ? 'result' : 'mission') : saved.screen === 'mission' ? 'mission' : 'intro';
  return { version: STATE_VERSION, screen, index, answers };
}

export function loadState(storage, random) {
  try { return restoreState(storage?.getItem(STORAGE_KEY) ?? null, random); } catch { return createState(random); }
}
export function saveState(storage, state) {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full or blocked: the game still works in memory */ }
}
export function clearState(storage) {
  try { storage?.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
export const hasProgress = (state) => state.screen !== 'intro' || state.index > 0 || ['m1', 'm2', 'm3'].some((id) => state.answers[id]);
