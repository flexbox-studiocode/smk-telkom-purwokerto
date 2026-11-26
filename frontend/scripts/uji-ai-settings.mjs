import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const server = await createServer({
  root,
  logLevel: 'error',
  server: { middlewareMode: true },
  plugins: [{
    name: 'qa-ai-settings-service',
    enforce: 'pre',
    resolveId(id) {
      if (/services\/aiSettingsService$/.test(id)) return '\0qa-ai-settings-service';
    },
    load(id) {
      if (id === '\0qa-ai-settings-service') {
        return `
          export const getAiSettings = async () => [];
          export const saveAiSettings = async () => ({});
          export const setAiServiceStatus = async () => ({});
          export const removeAiApiKey = async () => ({});
          export const testAiConnection = async () => ({});
        `;
      }
    },
  }],
});

try {
  const page = await server.ssrLoadModule('/src/pages/admin/ai/AiSettingsPage.jsx');
  const pageSource = read('src/pages/admin/ai/AiSettingsPage.jsx');
  const serviceSource = read('src/services/aiSettingsService.js');

  // Halaman render awal (efek tidak jalan di SSR) tetap menampilkan status memuat.
  const loadingHtml = renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(page.default)),
  );
  assert.ok(loadingHtml.includes('Pengaturan AI'), 'judul halaman tampil');
  assert.ok(loadingHtml.includes('Memuat pengaturan AI'), 'status memuat tampil');
  assert.ok(loadingHtml.includes('API key dienkripsi dan disimpan di server'), 'jaminan enkripsi tampil');

  const services = [
    { key: 'stela', name: 'NEXA AI', description: 'Asisten AI NEXA.', enabledHint: 'Mengatur endpoint chat NEXA.' },
    { key: 'nexttel', name: 'NextTel', description: 'Asisten rekomendasi jurusan.', enabledHint: 'Hanya mengatur penjelasan.' },
  ];
  const settings = [
    { service: 'stela', provider: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', model: 'gemini-2.5-flash', enabled: true, configured: true, updatedAt: '2026-11-20T08:00:00.000Z' },
    { service: 'nexttel', provider: null, endpoint: null, model: null, enabled: false, configured: false, updatedAt: null },
  ];

  const nexaHtml = renderToStaticMarkup(
    React.createElement(MemoryRouter, null,
      React.createElement(page.ServiceCard, { service: services[0], settings, onChanged: async () => {} }),
    ),
  );
  assert.ok(nexaHtml.includes('NEXA AI'), 'kartu NEXA tampil');
  assert.ok(nexaHtml.includes('Aktif'), 'status aktif NEXA tampil');
  assert.ok(nexaHtml.includes('Google Gemini'), 'nama provider ramah tampil');
  assert.ok(nexaHtml.includes('gemini-2.5-flash'), 'model tampil');
  assert.ok(nexaHtml.includes('Sudah dikonfigurasi'), 'status API key tanpa nilainya');
  assert.ok(nexaHtml.includes('Konfigurasi / Ganti API key'), 'tombol ganti key tersedia');

  const nexttelHtml = renderToStaticMarkup(
    React.createElement(MemoryRouter, null,
      React.createElement(page.ServiceCard, { service: services[1], settings, onChanged: async () => {} }),
    ),
  );
  assert.ok(nexttelHtml.includes('NextTel'), 'kartu NextTel tampil');
  assert.ok(nexttelHtml.includes('Scoring lokal selalu aktif'), 'peringatan scoring lokal NextTel tampil');
  assert.ok(nexttelHtml.includes('Belum dikonfigurasi'), 'status kosong NextTel jujur');
  assert.ok(nexttelHtml.includes('Nonaktif'), 'status nonaktif tampil');

  // Regresi: backend mengembalikan null untuk layanan yang belum dikonfigurasi.
  // Halaman harus tetap render, bukan crash di ServiceCard (`null.service`).
  const nullSettings = [null, null];
  const nullHtml = renderToStaticMarkup(
    React.createElement(MemoryRouter, null,
      React.createElement(page.ServiceCard, { service: services[0], settings: nullSettings, onChanged: async () => {} }),
    ),
  );
  assert.ok(nullHtml.includes('NEXA AI') && nullHtml.includes('Belum dikonfigurasi'), 'kartu layanan kosong tetap render');

  const combined = loadingHtml + nexaHtml + nexttelHtml;
  for (const secret of ['sk-', 'AIza', 'gsk_', 'Bearer ']) {
    assert.ok(!combined.includes(secret), `markup tidak boleh memuat pola kredensial: ${secret}`);
  }

  // Sumber halaman: tidak ada penyimpanan rahasia di browser, tidak ada VITE_ env,
  // input API key memakai password, dan tidak menyisipkan HTML mentah.
  for (const forbidden of ['localStorage', 'sessionStorage', 'import.meta.env', 'VITE_']) {
    assert.ok(!pageSource.includes(forbidden), `halaman tidak boleh memakai ${forbidden}`);
  }
  assert.ok(pageSource.includes("type={showKey ? 'text' : 'password'}"), 'input API key memakai tipe password');
  assert.ok(!pageSource.includes('dangerouslySetInnerHTML'), 'halaman tidak menyisipkan HTML mentah');

  // Service memakai endpoint admin yang benar.
  for (const endpoint of [
    "api.get('/api/admin/ai-settings')",
    "api.put(`/api/admin/ai-settings/${encodeURIComponent(service)}`, payload)",
    "api.patch(`/api/admin/ai-settings/${encodeURIComponent(service)}/status`, { enabled })",
    "api.delete(`/api/admin/ai-settings/${encodeURIComponent(service)}/key`)",
    "api.post(`/api/admin/ai-settings/${encodeURIComponent(service)}/test`, payload)",
  ]) {
    assert.ok(serviceSource.includes(endpoint), `service memanggil: ${endpoint}`);
  }

  // Menu sidebar, ikon, dan rute terpasang tanpa mengubah grup Muat Konten.
  const menuSource = read('src/data/dummyData.js');
  assert.ok(menuSource.includes("{ label: 'Pengaturan AI', to: '/dashboard/pengaturan-ai', icon: 'pengaturanAi' }"), 'menu sidebar terdaftar');
  assert.ok(menuSource.includes("label: 'Muat Konten'"), 'grup Muat Konten tetap ada');
  const sidebarSource = read('src/components/dashboard/DashboardSidebar.jsx');
  assert.ok(/pengaturanAi:\s*Bot/.test(sidebarSource), 'ikon menu dipetakan');
  const appSource = read('src/App.jsx');
  assert.ok(appSource.includes("const AiSettingsPage = lazy(() => import('./pages/admin/ai/AiSettingsPage'))"), 'rute lazy terdaftar');
  assert.ok(appSource.includes('<Route path="pengaturan-ai" element={<AiSettingsPage />} />'), 'rute dashboard terpasang');

  console.log('Pengaturan AI: render, status layanan, NextTel fallback lokal, tanpa kredensial/VITE_, menu & rute lulus.');
} finally {
  await server.close();
}