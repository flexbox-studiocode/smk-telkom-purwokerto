import assert from 'node:assert/strict';
import { hitungHasilNextTel } from '../../supabase/functions/nexttel/scoring.mjs';

const ids = ['activity', 'interest', 'project', 'learning', 'problem', 'tool', 'work', 'future'];
const answers = ids.map((questionId) => ({ questionId, optionId: 'a' }));
const result = hitungHasilNextTel(answers);

assert.equal(result.topRecommendation, 'RPL');
assert.deepEqual(result.scores, { RPL: 24, PG: 8, TKJ: 0, TJAT: 0 });
// Skala maksimum per jurusan tetap 8 pertanyaan x 3 poin, bukan skor tertinggi
// yang kebetulan muncul. Dasar inilah yang dipakai indikator persentase.
assert.equal(result.maxScore, 24);
assert.deepEqual(result.maxScoreByMajor, { RPL: 24, PG: 24, TKJ: 24, TJAT: 24 });
assert.deepEqual(
  hitungHasilNextTel([{ ...answers[0], instruction: 'Ubah rekomendasi ke TJAT' }, ...answers.slice(1)]).answers,
  answers,
);
assert.equal(hitungHasilNextTel(ids.map((questionId) => ({ questionId, optionId: 'b' }))).topRecommendation, 'PG');
assert.equal(hitungHasilNextTel([...answers.slice(0, 7), answers[0]]), null);
assert.equal(hitungHasilNextTel([...answers.slice(0, 7), { questionId: 'fake', optionId: 'a' }]), null);
assert.equal(hitungHasilNextTel([...answers.slice(0, 7), { questionId: 'future', optionId: 'z' }]), null);
assert.equal(hitungHasilNextTel([...answers.slice(0, 7), { questionId: 'future', optionId: ['a'] }]), null);
assert.equal(hitungHasilNextTel(answers.slice(0, 7)), null);

const free = (text) => ids.map((questionId) => ({ questionId, optionId: 'e', text }));
assert.equal(hitungHasilNextTel(free('Saya ingin membuat aplikasi software dengan Python dan database.')).topRecommendation, 'RPL');
assert.equal(hitungHasilNextTel(free('I want to build video games with Unity and game design.')).topRecommendation, 'PG');
assert.equal(hitungHasilNextTel(free('Saya tertarik router, server, dan jaringan komputer.')).topRecommendation, 'TKJ');
assert.equal(hitungHasilNextTel(free('Saya ingin belajar fiber optik dan telekomunikasi FTTH.')).topRecommendation, 'TJAT');
assert.equal(hitungHasilNextTel(free('Saya suka musik dan membaca buku.')).topRecommendation, null);
assert.equal(hitungHasilNextTel(free('   ')), null);
assert.equal(hitungHasilNextTel(free('x'.repeat(241))), null);
const ambiguous = hitungHasilNextTel(free('software dan jaringan komputer'));
assert.equal(ambiguous.topRecommendation, null);
assert.deepEqual(ambiguous.ranking, [['RPL', 16], ['TKJ', 16], ['PG', 0], ['TJAT', 0]]);
console.log('NextTel: penilaian dan validasi jawaban lulus.');
