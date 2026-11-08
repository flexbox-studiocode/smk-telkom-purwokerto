import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { OFFICIAL_ADMISSIONS_URL, isHiddenAdmissionsPath } from '../src/utils/admissions.js';

const internalPaths = ['/spmb/masuk', '/SPMB/formulir', '/spmb/status', '/ppdb', '/ppdb/daftar', '/lupa-sandi', '/auth/confirm'];

// Kondisi A (default): SPMB_INTERNAL_ENABLED=false -> alur internal dialihkan.
for (const path of internalPaths) {
  assert(isHiddenAdmissionsPath(path), `${path}: should redirect to the official portal when disabled`);
  assert.equal(isHiddenAdmissionsPath(path, { spmbInternalEnabled: false }), true, `${path}: explicit disabled`);
}
assert.equal(isHiddenAdmissionsPath('/spmb'), false, '/spmb informasi publik tetap dapat dibuka');
assert.equal(isHiddenAdmissionsPath('/berita/spmb'), false, 'halaman publik lain tidak terpengaruh');

// Kondisi B: SPMB_INTERNAL_ENABLED=true -> route internal dirender normal.
for (const path of [...internalPaths, '/spmb', '/spmb/daftar', '/spmb/berkas', '/dashboard/spmb']) {
  assert.equal(isHiddenAdmissionsPath(path, { spmbInternalEnabled: true }), false, `${path}: internal portal must render when enabled`);
}

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
  plugins: [{
    name: 'app-config-test-backend',
    enforce: 'pre',
    resolveId(source) { if (source === './apiClient') return '\0app-config-api'; },
    load(id) {
      if (id === '\0app-config-api') return `export const api = { get: async () => { if (globalThis.__appConfigError) throw new Error('offline'); return globalThis.__appConfigResponse; } };`;
    },
  }],
});

try {
  const { getAppConfig } = await server.ssrLoadModule('/src/services/appConfigService.js');

  globalThis.__appConfigResponse = { spmbInternalEnabled: true, officialAdmissionsUrl: 'https://contoh.invalid/welcome' };
  const enabled = await getAppConfig();
  assert.equal(enabled.spmbInternalEnabled, true);
  assert.equal(enabled.officialAdmissionsUrl, 'https://contoh.invalid/welcome');

  globalThis.__appConfigResponse = { spmbInternalEnabled: false };
  const disabled = await getAppConfig();
  assert.equal(disabled.spmbInternalEnabled, false);
  assert.equal(disabled.officialAdmissionsUrl, OFFICIAL_ADMISSIONS_URL);

  globalThis.__appConfigError = true;
  const fallback = await getAppConfig();
  assert.equal(fallback.spmbInternalEnabled, false, 'fetch failure must fail safe to disabled');
  assert.equal(fallback.officialAdmissionsUrl, OFFICIAL_ADMISSIONS_URL);
  globalThis.__appConfigError = false;

  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.match(read('../src/App.jsx'), /isHiddenAdmissionsPath\(pathname, \{ spmbInternalEnabled \}\)/, 'App must use the runtime flag');
  assert.match(read('../src/App.jsx'), /SpmbInternalGate/, 'admin SPMB routes must be gated');
  assert.match(read('../src/components/dashboard/DashboardSidebar.jsx'), /SPMB_INTERNAL_MENU/, 'sidebar must hide internal SPMB menus');
  assert.match(read('../src/pages/SpmbPage.jsx'), /registrationHref/, 'public CTA must follow the flag');
  assert.match(read('../src/pages/dashboard/SpmbInternalGate.jsx'), /officialAdmissionsUrl/, 'disabled notice must link to the official portal');

  console.log('SPMB feature flag: disabled/enabled routing, safe config fallback, admin menu gating, and official CTA pass.');
} finally {
  await server.close();
}