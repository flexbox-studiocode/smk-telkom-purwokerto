import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { translateSpmbContent } = await server.ssrLoadModule('/src/utils/spmbTranslation.js');
  const { translate } = await server.ssrLoadModule('/src/utils/language.js');
  const t = value => translate(value, 'en');
  assert.equal(translateSpmbContent('<p>Registrasi akun</p>', t), '<p>Create an account</p>');
  assert.equal(translateSpmbContent('<p>A &amp; B &lt; 3</p>', t), '<p>A &amp; B &lt; 3</p>');
  assert.equal(translateSpmbContent('<p>&#169; &quot;SMK&quot;</p>', t), '<p>© "SMK"</p>');
  assert.equal(translateSpmbContent('<p>A&#160;B</p>', t), '<p>A\u00a0B</p>');
  assert.equal(translateSpmbContent('<p><strong>A</strong>&#160;<strong>B</strong></p>', t), '<p><strong>A</strong>\u00a0<strong>B</strong></p>');
  assert.equal(translateSpmbContent('<p><strong>Pengisian Data</strong> <a href="/spmb">Lihat Alur</a></p>', t), '<p><strong>Personal Information</strong> <a href="/spmb" rel="noopener noreferrer">View Steps</a></p>');
  assert(!translateSpmbContent('<p>Registrasi akun</p><script>alert(1)</script>', t).includes('<script'));
  assert.equal(translateSpmbContent('<p>Registrasi akun</p>', () => '<img src=x onerror=alert(1)>'), '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  assert.equal(translateSpmbContent('Informasi khusus admin yang belum diterjemahkan', t), 'Informasi khusus admin yang belum diterjemahkan');
  const migration = await readFile(new URL('../../supabase/migrations/012_spmb_information.sql', import.meta.url), 'utf8');
  const rows = JSON.parse(migration.match(/jsonb_to_recordset\('([\s\S]+)'::jsonb\)/)[1].replace(/''/g, "'"));
  const brands = ['EASY', 'DIGITEST', 'DIGITEST 1', 'One Day Service'];
  for (const row of rows) for (const field of ['judul', 'deskripsi']) {
    if (row[field] && !brands.includes(row[field])) assert.notEqual(t(row[field]), row[field], `Missing original content translation: ${row[field]}`);
  }
  console.log('PASS: original seed content ID/EN, rich text formatting, safe links, HTML escaping and unknown-source fallback.');
} finally { await server.close(); }
