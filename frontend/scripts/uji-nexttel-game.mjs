import assert from 'node:assert/strict';
import fs from 'node:fs';
import english from '../src/data/translationsNextTelGame.js';
import {
  CODE_HINT, CODE_LIMIT, MAJORS, MAX_PER_MAJOR, MISSIONS, OPTIC_NODES, OPTIC_SOLUTION, STATE_VERSION, STORAGE_KEY,
  allComplete, codeEdit, codeRun, computeResult, createState, evaluateOptics, gameReducer, historyRedo, historyUndo,
  isComplete, loadState, opticReset, opticRotate, reachable, restoreState, runProgram, saveState, scoreMission, scrambleOptics,
} from '../src/features/nexttel-game/engine.mjs';

// Deterministic random source so the scrambled optics are reproducible.
const seeded = (seed = 7) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/* ---------- missions */
assert.equal(MISSIONS.length, 8);
assert.deepEqual(MISSIONS.map((m) => m.id), ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8']);
assert.match(MISSIONS[5].dialog, /^Misi 6 /, 'M6 dialog must call itself mission 6');
assert.match(MISSIONS[3].dialog, /^Misi 4 /);

/* ---------- M4 optics */
assert.equal(evaluateOptics(OPTIC_SOLUTION).solved, true);
assert.equal(evaluateOptics(OPTIC_SOLUTION).percent, 100);
// The solution is the only orientation set that reaches 100 %.
let solvedCount = 0;
for (let n = 0; n < 256; n += 1) {
  const orient = { A: n & 3, B: (n >> 2) & 3, C: (n >> 4) & 3, D: (n >> 6) & 3 };
  if (evaluateOptics(orient).solved) { solvedCount += 1; assert.deepEqual(orient, OPTIC_SOLUTION); }
}
assert.equal(solvedCount, 1);
assert.equal(evaluateOptics({ A: 3, B: 0, C: 2, D: 2 }).inlet, false, 'A turned away from the laser gets no light');
assert.equal(evaluateOptics({ A: 3, B: 0, C: 2, D: 2 }).percent, 0);
for (let seed = 1; seed < 50; seed += 1) {
  const start = scrambleOptics(seeded(seed));
  assert.equal(evaluateOptics(start).solved, false, 'a scrambled board never starts solved');
  assert.ok(Object.keys(OPTIC_NODES).filter((node) => start[node] !== OPTIC_SOLUTION[node]).length >= 3);
}
assert.ok(scrambleOptics(() => 0), 'a degenerate random source still returns a board');

// Solve by real rotations, then check undo / redo / reset.
const state0 = createState(seeded(3));
let optic = state0.answers.m4;
const startOrient = { ...optic.start };
for (const node of Object.keys(OPTIC_NODES)) while (optic.current[node] !== OPTIC_SOLUTION[node] && !optic.solved) optic = opticRotate(optic, node);
assert.equal(optic.solved, true);
assert.equal(isComplete('m4', optic), true);
assert.equal(opticRotate(optic, 'A'), optic, 'a solved board is locked');
let partial = opticRotate(state0.answers.m4, 'A');
assert.equal(partial.current.A, (startOrient.A + 1) % 4);
partial = historyUndo(partial);
assert.deepEqual(partial.current, startOrient);
partial = historyRedo(partial);
assert.equal(partial.current.A, (startOrient.A + 1) % 4);
partial = opticReset(partial);
assert.deepEqual(partial.current, startOrient);
assert.equal(historyUndo(partial).current.A, (startOrient.A + 1) % 4, 'reset itself can be undone');

/* ---------- M6 block code */
assert.equal(runProgram(CODE_HINT).ok, true, 'the hint program solves the level');
assert.deepEqual(runProgram(CODE_HINT).frames.at(-1), { row: 0, col: 3, facing: 0, hasKey: true, block: 4 });
assert.equal(runProgram([]).error, 'empty');
assert.equal(runProgram([{ type: 'forward', steps: 1 }]).error, 'wall', 'walking into the wall fails');
assert.equal(runProgram([{ type: 'jump' }, { type: 'forward', steps: 1 }]).error, 'jumpNeedsForward2');
assert.equal(runProgram([{ type: 'jump' }]).error, 'jumpNeedsForward2');
assert.equal(runProgram([{ type: 'turn', dir: 'left', times: 1 }, { type: 'forward', steps: 2 }]).error, 'edge');
assert.equal(runProgram([{ type: 'pickup' }]).error, 'noKey');
assert.equal(runProgram([{ type: 'jump' }, { type: 'forward', steps: 2 }]).error, 'keyNotTaken');
// A detour around the wall is also a valid program.
assert.equal(runProgram([{ type: 'turn', dir: 'right', times: 1 }, { type: 'forward', steps: 1 }, { type: 'turn', dir: 'left', times: 1 }, { type: 'forward', steps: 2 }, { type: 'turn', dir: 'left', times: 1 }, { type: 'forward', steps: 2 }, { type: 'pickup' }]).ok, true);
assert.equal(runProgram([{ type: 'turn', dir: 'right', times: 3 }, { type: 'turn', dir: 'right', times: 1 }, { type: 'jump' }, { type: 'forward', steps: 2 }, { type: 'turn', dir: 'left', times: 1 }, { type: 'forward', steps: 1 }, { type: 'pickup' }]).ok, true, 'rotate counts wrap around');
let code = state0.answers.m6;
code = codeEdit(code, [...code.current, { type: 'forward', steps: 9 }, { type: 'bogus' }]);
assert.deepEqual(code.current, [{ type: 'forward', steps: 3 }], 'blocks are clamped and unknown blocks dropped');
code = codeEdit(code, Array.from({ length: 20 }, () => ({ type: 'pickup' })));
assert.equal(code.current.length, CODE_LIMIT);
code = historyUndo(code);
assert.deepEqual(code.current, [{ type: 'forward', steps: 3 }]);
let ran = codeRun(code);
assert.equal(ran.run.ok, false);
assert.equal(ran.answer.solved, false);
ran = codeRun(codeEdit(code, CODE_HINT));
assert.equal(ran.run.ok, true);
assert.equal(isComplete('m6', ran.answer), true);

/* ---------- full play-through through the reducer */
let game = createState(seeded(11));
assert.equal(game.screen, 'intro');
game = gameReducer(game, { type: 'start' });
assert.equal(game.screen, 'mission');
assert.equal(gameReducer(game, { type: 'go', index: 3 }).index, 0, 'cannot skip ahead past an unfinished mission');
assert.equal(gameReducer(game, { type: 'finish' }).screen, 'mission', 'cannot finish early');
const answer = (id, value) => { game = gameReducer(game, { type: 'answer', id, value }); };
answer('m1', 'a'); answer('m2', 'a'); answer('m3', 'c');
assert.equal(reachable(game.answers), 3);
answer('m4', { ...game.answers.m4, current: { ...OPTIC_SOLUTION }, solved: true });
answer('m5', ['software', 'hardware']);
answer('m6', { ...game.answers.m6, current: CODE_HINT, solved: true, hintUsed: true });
answer('m7', { game: 2, logic: 5, cable: 1, computer: 4 });
answer('m8', { logic: 'program', imagination: 'art', precision: 'problem', communication: 'program' });
assert.equal(allComplete(game.answers), true);
game = gameReducer(game, { type: 'go', index: 7 });
assert.equal(game.index, 7);
game = gameReducer(game, { type: 'go', index: 2 });
assert.equal(game.answers.m1, 'a', 'going back keeps answers');
game = gameReducer(game, { type: 'finish' });
assert.equal(game.screen, 'result');

/* ---------- scoring */
const result = computeResult(game.answers);
// m1 a, m2 a, m3 c, m4 no hint, m5 software+hardware, m6 with hint, m7 ratings, m8 links
const expected = {
  RPL: 3 + 3 + 0 + 0 + 3 + 2 + 4 + 4,
  PG: 1 + 1 + 0 + 0 + 0 + 2 + 1 + 2,
  TKJ: 0 + 0 + 3 + 3 + 3 + 0 + 3 + 2,
  TJAT: 0 + 0 + 1 + 3 + 0 + 0 + 0 + 0,
};
assert.deepEqual(result.scores, expected);
assert.equal(result.topRecommendation, 'RPL');
assert.deepEqual(result.ranking.map(([major]) => major), ['RPL', 'TKJ', 'PG', 'TJAT']);
assert.equal(result.tieBreak, null);
assert.equal(result.breakdown.length, 8);
assert.equal(MAX_PER_MAJOR, 27);
for (const major of MAJORS) assert.ok(result.scores[major] <= MAX_PER_MAJOR);
assert.deepEqual(scoreMission('m1', null), { RPL: 0, PG: 0, TKJ: 0, TJAT: 0 }, 'unfinished missions score nothing');

// Maximum per major is reachable and equal for all majors.
for (const major of MAJORS) {
  const choice = { RPL: 'a', PG: 'b', TKJ: 'c', TJAT: 'd' }[major];
  const field = { RPL: 'program', PG: 'art', TKJ: 'problem', TJAT: 'people' }[major];
  const rated = { RPL: 'logic', PG: 'game', TKJ: 'computer', TJAT: 'cable' }[major];
  const sw = { RPL: 'software', PG: 'visual', TKJ: 'hardware', TJAT: 'experiment' }[major];
  const best = {
    m1: choice, m2: choice, m3: choice,
    m4: { ...game.answers.m4, current: { ...OPTIC_SOLUTION }, solved: true, hintUsed: false },
    m5: [sw, sw === 'software' ? 'visual' : 'software'],
    m6: { ...game.answers.m6, current: CODE_HINT, solved: true, hintUsed: false },
    m7: { game: 1, logic: 1, cable: 1, computer: 1, [rated]: 5 },
    m8: { logic: field, imagination: field, precision: field, communication: field },
  };
  const top = computeResult(best);
  assert.equal(top.scores[major], MAX_PER_MAJOR, `${major} can reach the maximum`);
  assert.equal(top.topRecommendation, major);
}

// Deterministic tie-breaks: rating first, then links, then fixed order.
const tieBase = { ...game.answers, m1: 'a', m2: 'b', m3: 'c', m5: ['software', 'visual'], m7: { game: 3, logic: 3, cable: 3, computer: 3 }, m8: { logic: 'program', imagination: 'art', precision: 'problem', communication: 'people' } };
const tieOrder = computeResult(tieBase);
assert.equal(tieOrder.scores.RPL, tieOrder.scores.PG);
assert.equal(tieOrder.topRecommendation, 'RPL');
assert.equal(tieOrder.tieBreak, 'order');
const ratingTie = computeResult({ ...tieBase, m3: 'b', m5: ['software', 'hardware'], m7: { game: 4, logic: 3, cable: 3, computer: 3 } });
assert.equal(ratingTie.scores.RPL, ratingTie.scores.PG, 'fixture really is tied');
assert.equal(ratingTie.topRecommendation, 'PG', 'a tie goes to the higher self-rating');
assert.equal(ratingTie.tieBreak, 'rating');
for (let run = 0; run < 5; run += 1) assert.deepEqual(computeResult(tieBase), tieOrder, 'scoring is deterministic');

/* ---------- persistence */
const memory = () => { const data = new Map(); return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k), data }; };
const storage = memory();
saveState(storage, game);
assert.ok(storage.data.has(STORAGE_KEY));
const restored = loadState(storage);
assert.deepEqual(restored, game, 'a saved game restores exactly');
assert.equal(loadState(memory()).screen, 'intro', 'no save starts a fresh game');
assert.equal(restoreState('{not json').screen, 'intro', 'corrupt JSON starts a fresh game');
assert.equal(restoreState(JSON.stringify({ ...game, version: STATE_VERSION + 1 })).answers.m1, null, 'unknown versions are discarded');
const tampered = restoreState(JSON.stringify({ ...game, index: 99, answers: { ...game.answers, m1: 'z', m4: { ...game.answers.m4, solved: true, current: { A: 1, B: 1, C: 1, D: 1 } }, m5: ['software', 'hardware', 'visual'], m7: { game: 9 } } }));
assert.equal(tampered.answers.m1, null);
assert.equal(tampered.answers.m4.solved, false, 'solved flag is recomputed, not trusted');
assert.deepEqual(tampered.answers.m5, []);
assert.equal(tampered.answers.m7.game, 3);
assert.equal(tampered.index, 0, 'index is clamped to the first unfinished mission');
assert.equal(tampered.screen, 'mission', 'a result screen needs every mission finished');
const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
assert.equal(loadState(throwing).screen, 'intro');
assert.doesNotThrow(() => saveState(throwing, game));
assert.equal(gameReducer(game, { type: 'reset', random: seeded(5) }).answers.m1, null, 'reset clears every answer');

/* ---------- every game string has an English translation */
const gameText = MISSIONS.flatMap((m) => [m.dialog, ...[m.options, m.switches, m.items, m.potentials, m.fields].flatMap((list) => (list ?? []).map((item) => item.label))]);
const sources = ['NextTelModeSelect.jsx', ...fs.readdirSync(new URL('../src/components/nexttel/game/', import.meta.url)).filter((file) => file.endsWith('.jsx')).map((file) => `game/${file}`)];
for (const file of sources) {
  const code = fs.readFileSync(new URL(`../src/components/nexttel/${file}`, import.meta.url), 'utf8');
  for (const match of code.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) gameText.push(match[1]);
  // Copy kept in lookup tables (error messages, rules, mission names): sentences that start with a capital.
  for (const match of code.matchAll(/(?:\b\w+: |^\s+)'([A-Z][^']*\s[^']*)'/gm)) gameText.push(match[1]);
}
const missing = [...new Set(gameText)].filter((text) => !Object.hasOwn(english, text));
assert.deepEqual(missing, [], 'untranslated game text');
for (const value of Object.values(english)) assert.ok(value.trim(), 'translations are not empty');

console.log('uji-nexttel-game: semua pengujian lulus');
