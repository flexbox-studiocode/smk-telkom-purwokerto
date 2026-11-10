import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { LanguageContext } = await server.ssrLoadModule('/src/context/LanguageContext.js');
  const { translate } = await server.ssrLoadModule('/src/utils/language.js');
  const { PpdbProvider } = await server.ssrLoadModule('/src/context/PpdbContext.jsx');
  const { default: RegisterPage } = await server.ssrLoadModule('/src/pages/ppdb/RegisterPage.jsx');
  const { default: FormInput } = await server.ssrLoadModule('/src/components/dashboard/FormInput.jsx');
  const { default: NextTelQuestionnaire } = await server.ssrLoadModule('/src/components/nexttel/NextTelQuestionnaire.jsx');
  const { default: NextTelResult } = await server.ssrLoadModule('/src/components/nexttel/NextTelResult.jsx');
  const { default: StelaChat } = await server.ssrLoadModule('/src/components/stela/StelaChat.jsx');
  const { ppdbJurusanPilihan } = await server.ssrLoadModule('/src/data/ppdbFormOptions.js');
  const value = { language: 'en', locale: 'en-US', t: (text, variables) => translate(text, 'en', variables), setLanguage: () => {} };
  const render = (element, path = '/') => renderToStaticMarkup(
    createElement(LanguageContext.Provider, { value }, createElement(MemoryRouter, { initialEntries: [path] }, element)),
  );

  // Translated option labels must keep the backend's original values.
  const registration = render(createElement(PpdbProvider, null, createElement(RegisterPage)), '/spmb/daftar');
  assert.ok(registration.includes('Create a New Account'));
  assert.ok(registration.includes('Create an account with an active email and password.'));
  assert.ok(registration.includes('Show password: Password'));
  assert.ok(registration.includes('Back to Home'));
  assert.ok(!registration.includes('name="nisn"'), 'Account signup defers personal information to the application form.');
  const programOptions = render(createElement(FormInput, { label: value.t('Peminatan Jurusan'), as: 'select', options: ppdbJurusanPilihan.map((program) => ({ value: program, label: value.t(program) })) }));
  for (const program of ppdbJurusanPilihan) {
    assert.ok(programOptions.includes(`value="${program}"`), `Nilai jurusan ${program} tidak berubah.`);
    assert.ok(programOptions.includes(`>${value.t(program)}</option>`), `Label jurusan ${program} diterjemahkan.`);
  }

  const questions = [{ id: 'activity', prompt: 'Aktivitas apa yang paling kamu sukai?', options: [{ id: 'a', label: 'Mencoba hal baru' }] }];
  const questionnaire = render(createElement(NextTelQuestionnaire, { questions, currentIndex: 0, answers: { activity: 'a' }, onAnswer: () => {}, onNext: () => {}, onBack: () => {} }));
  assert.ok(questionnaire.includes('Choose one answer'));
  assert.ok(questionnaire.includes('Question 1 of 1'));
  assert.ok(questionnaire.includes('aria-checked="true"'));
  assert.ok(questionnaire.includes('Complete'));
  assert.ok(questionnaire.includes('Which activity do you enjoy the most?') && questionnaire.includes('Trying new things'), 'Questionnaire questions and answers are shown in English.');

  // Catalogued assistant copy follows the selected language.
  const result = render(createElement(NextTelResult, {
    result: { topRecommendation: 'RPL', ranking: [['RPL', 8]], maxScore: 8 },
    explanation: { explanation: 'Rekomendasi utama', strengths: ['Ringkasan skor'], learningSuggestions: ['Mulai ulang'] },
    loading: false, error: '', onRetry: () => {}, onRestart: () => {},
  }));
  assert.ok(result.includes('Software Engineering (RPL)'));
  assert.ok(result.includes('Score Summary'));
  assert.ok(result.includes('>Top Recommendation</p>'));
  assert.ok(result.includes('>Score Summary</li>'));
  assert.ok(result.includes(`>${value.t('Mulai ulang')}</li>`));
  const ambiguousResult = render(createElement(NextTelResult, {
    result: { topRecommendation: null, ranking: [['RPL', 0], ['PG', 0], ['TKJ', 0], ['TJAT', 0]], maxScore: 1 },
    explanation: null, loading: false, error: '', onRetry: () => {}, onRestart: () => {},
  }));
  assert.ok(ambiguousResult.includes('Your interests are not clear yet'));
  assert.ok(ambiguousResult.includes('Your answers do not provide enough information to identify one study program.'));

  // Chat is gated by the pre-chat session check; before it resolves nothing but a status is shown.
  assert.ok(render(createElement(StelaChat)).includes('Checking your session...'));
  const { default: NexaPrechatForm } = await server.ssrLoadModule('/src/components/stela/NexaPrechatForm.jsx');
  const prechat = render(createElement(NexaPrechatForm, { onSelesai: () => {} }));
  for (const text of ['Before we begin, please provide the following information', 'Full Name', 'Phone Number', 'Age', 'Start Chat', 'type="tel"', 'type="number"']) {
    assert.ok(prechat.includes(text), 'Pre-chat form shows "' + text + '" in English.');
  }
  assert.ok(!prechat.includes('Mulai Chat') && !prechat.includes('Nama Lengkap'), 'No Indonesian label leaks into the English form.');
  for (const text of ['Nama lengkap wajib diisi.', 'Nomor HP wajib diisi.', 'Usia wajib diisi.', 'Pilih salah satu kategori.', 'Nomor HP tidak valid. Contoh: 081234567890 atau +6281234567890.', 'Usia harus berupa bilangan bulat antara 5 dan 100.', 'Nama minimal 2 karakter.', 'Nama tidak valid.', 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.', 'Gagal memulai chat. Silakan coba lagi.', 'Instansi', 'Nama Sekolah', 'Nama Instansi']) {
    assert.notEqual(value.t(text), text, 'Missing English translation: ' + text);
  }

  const form = await readFile(new URL('../src/pages/ppdb/RegistrationFormPage.jsx', import.meta.url), 'utf8');
  assert.ok(form.includes('value={pilihan}'), 'Nilai jenis kelamin tetap sumber, bukan hasil terjemahan.');
  assert.ok(form.includes('nilai[`${mapel.nama}|${s}`]'), 'Key nilai rapor tetap sama saat bahasa berubah.');
  assert.ok(!form.includes('key={t('), 'Pergantian bahasa tidak mengganti key input formulir.');
  console.log('Bahasa portal: English labels and assistant copy; submitted option values and report keys remain unchanged.');
} finally {
  await server.close();
}
