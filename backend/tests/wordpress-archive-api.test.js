import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { app } from '../src/app.js';
import { prisma, closeDatabase } from '../src/db.js';

const PREFIX = 'wptest-';
const PASSWORD = 'Test-Password-12345';
const ADMIN_EMAIL = `${PREFIX}admin@example.test`;
const APPLICANT_EMAIL = `${PREFIX}applicant@example.test`;

let server;
let baseUrl;
let adminUserId;
let jobId;
let adminClient;
let applicantClient;
const createdJobIds = [];

function makeClient() {
  const jar = new Map();
  return {
    cookie: (name) => jar.get(name),
    async request(path, options = {}) {
      const headers = { ...(options.headers || {}) };
      if (options.body && !(options.body instanceof FormData) && !headers['content-type']) headers['content-type'] = 'application/json';
      const csrf = jar.get('csrf_token');
      if (options.method && !['GET', 'HEAD'].includes(options.method) && csrf) headers['x-csrf-token'] = csrf;
      const cookie = [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
      if (cookie) headers.cookie = cookie;
      const res = await fetch(baseUrl + path, { ...options, headers });
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(';');
        const [key, value] = pair.split('=');
        if (value === '' || /Max-Age=0/i.test(raw)) jar.delete(key);
        else jar.set(key, value);
      }
      const text = await res.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = text; }
      return { status: res.status, body, headers: res.headers };
    },
  };
}

async function login(client, email) {
  await client.request('/api/auth/csrf');
  return client.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: PASSWORD }) });
}

async function createUser(email, { role = 'applicant', withAdmin = false } = {}) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await argon2.hash(PASSWORD, { type: argon2.argon2id }),
      emailVerified: new Date(),
      role,
      ...(withAdmin ? { admin: { create: { nama: 'Test Admin WP' } } } : {}),
    },
  });
}

const COLUMNS = '(`ID`,`post_author`,`post_date`,`post_date_gmt`,`post_content`,`post_title`,`post_excerpt`,`post_status`,`comment_status`,`ping_status`,`post_password`,`post_name`,`to_ping`,`pinged`,`post_modified`,`post_modified_gmt`,`post_content_filtered`,`post_parent`,`guid`,`menu_order`,`post_type`,`post_mime_type`,`comment_count`)';

function sqlRow({ id, title, content, status = 'publish', type = 'post', slug, excerpt = '', guid = '', date = '2025-04-05 06:07:08' }) {
  const values = [id, 1, date, date, content, title, excerpt, status, 'open', 'closed', '', slug, '', '', date, date, '', 0, guid, 0, type, '', 0];
  return `(${values.map((value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(',')})`;
}

function buildSql(rows) {
  return [
    '-- dump uji integrasi',
    'DROP TABLE IF EXISTS `ic_posts`;',
    'CREATE TABLE `ic_posts` (',
    '  `ID` bigint(20) NOT NULL, `post_author` bigint(20) NOT NULL, `post_date` datetime NOT NULL,',
    '  `post_date_gmt` datetime NOT NULL, `post_content` longtext NOT NULL, `post_title` text NOT NULL,',
    '  `post_excerpt` text NOT NULL, `post_status` varchar(20) NOT NULL, `comment_status` varchar(20) NOT NULL,',
    '  `ping_status` varchar(20) NOT NULL, `post_password` varchar(255) NOT NULL, `post_name` varchar(200) NOT NULL,',
    '  `to_ping` text NOT NULL, `pinged` text NOT NULL, `post_modified` datetime NOT NULL,',
    '  `post_modified_gmt` datetime NOT NULL, `post_content_filtered` longtext NOT NULL, `post_parent` bigint(20) NOT NULL,',
    '  `guid` varchar(255) NOT NULL, `menu_order` int(11) NOT NULL, `post_type` varchar(20) NOT NULL,',
    '  `post_mime_type` varchar(100) NOT NULL, `comment_count` bigint(20) NOT NULL',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',
    `INSERT INTO \`ic_posts\` ${COLUMNS} VALUES`,
    `${rows.join(',\n')};`,
  ].join('\n');
}

const narrative = (seed) => `<p>${`Kegiatan sekolah ${seed} berlangsung lancar dan diikuti seluruh siswa. `.repeat(12)}</p>`;
const unique = `${PREFIX}${Date.now()}`;
const SLUGS = {
  berita: `${unique}-kunjungan`,
  berita2: `${unique}-kedua`,
  berita3: `${unique}-ketiga`,
  pengumuman: `${unique}-pengumuman`,
  prestasi: `${unique}-prestasi`,
  review: `${unique}-review`,
  page: `${unique}-page`,
};

async function waitForJob(client, id, timeoutMs = 25000) {
  const started = Date.now();
  for (;;) {
    const res = await client.request(`/api/admin/wordpress/imports/${id}/progress`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    if (['completed', 'partially_completed', 'failed', 'cancelled'].includes(res.body.data.status)) return res.body.data;
    if (Date.now() - started > timeoutMs) throw new Error(`Job tidak selesai: ${JSON.stringify(res.body.data)}`);
    await delay(250);
  }
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await prisma.berita.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.pengumuman.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.prestasi.deleteMany({ where: { slug: { startsWith: PREFIX } } });

  const admin = await createUser(ADMIN_EMAIL, { role: 'admin', withAdmin: true });
  adminUserId = admin.id;
  await createUser(APPLICANT_EMAIL);
  adminClient = makeClient();
  applicantClient = makeClient();
  assert.equal((await login(adminClient, ADMIN_EMAIL)).status, 200);
  assert.equal((await login(applicantClient, APPLICANT_EMAIL)).status, 200);
});

after(async () => {
  await prisma.wordPressImportJob.deleteMany({ where: { createdBy: adminUserId } });
  await prisma.wordPressArchiveDeletion.deleteMany({ where: { deletedBy: adminUserId } });
  await prisma.berita.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.pengumuman.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.prestasi.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
});

test('upload SQL, proses background, statistik, dan pustaka arsip', async () => {
  const admin = adminClient;

  const sql = buildSql([
    sqlRow({ id: 101, title: `${unique} Kunjungan Industri`, content: narrative('kunjungan'), slug: SLUGS.berita, guid: 'https://example.test/wp-content/uploads/foto.jpg' }),
    sqlRow({ id: 102, title: `${unique} Kegiatan Sekolah Kedua`, content: narrative('kedua'), slug: SLUGS.berita2 }),
    sqlRow({ id: 103, title: `${unique} Pengumuman Pengambilan Ijazah`, content: '<p>Pengumuman pengambilan ijazah bagi alumni. Batas waktu pengambilan dokumen di kantor sekolah.</p>', slug: SLUGS.pengumuman }),
    sqlRow({ id: 104, title: `${unique} Siswa Juara 1 Olimpiade Sains Nasional`, content: '<p>Juara 1 olimpiade sains tingkat nasional, mengharumkan nama sekolah.</p>', slug: SLUGS.prestasi }),
    sqlRow({ id: 105, title: `${unique} Pendek`, content: '<p>Halo</p>', slug: SLUGS.review }),
    sqlRow({ id: 106, title: 'foto', content: '', type: 'attachment', status: 'inherit', slug: 'foto' }),
    sqlRow({ id: 107, title: `${unique} Profil Sekolah`, content: '<p>Halaman profil sekolah yang cukup panjang untuk konten halaman ini.</p>', type: 'page', slug: SLUGS.page }),
    sqlRow({ id: 108, title: `${unique} Berita Aman`, content: `${narrative('aman')}<script>alert(1)</script><img src="x" onerror="alert(1)">`, slug: `${unique}-aman` }),
  ]);

  const form = new FormData();
  form.append('file', new Blob([sql], { type: 'application/sql' }), 'dump-integrasi.sql');
  const upload = await admin.request('/api/admin/wordpress/imports', { method: 'POST', body: form });
  assert.equal(upload.status, 202, JSON.stringify(upload.body));
  jobId = upload.body.data.id;
  createdJobIds.push(jobId);

  const progress = await waitForJob(admin, jobId);
  assert.equal(progress.status, 'completed', JSON.stringify(progress));
  assert.equal(progress.totalSourceRecords, 8);
  assert.ok(progress.beritaCount >= 1);
  assert.equal(progress.pengumumanCount, 1);
  assert.equal(progress.prestasiCount, 1);
  assert.ok(progress.reviewCount >= 2);
  assert.ok(progress.skippedCount >= 1);

  const list = await admin.request(`/api/admin/wordpress/archive?jobId=${jobId}&limit=50`);
  assert.equal(list.status, 200);
  assert.ok(list.body.data.length >= 6);
  assert.ok(list.body.data.every((item) => item.wordpressId !== '106'));
  const filtered = await admin.request(`/api/admin/wordpress/archive?jobId=${jobId}&targetType=berita&limit=10`);
  assert.ok(filtered.body.data.every((item) => item.targetType === 'berita'));
  const searched = await admin.request(`/api/admin/wordpress/archive?jobId=${jobId}&search=${encodeURIComponent(`${unique} Pengumuman`)}`);
  assert.equal(searched.body.data.length, 1);

  const sanitized = list.body.data.find((item) => item.wordpressId === '108');
  assert.ok(sanitized);
  assert.ok(!/script|onerror/i.test(sanitized.content || ''));
});

test('duplicate checksum tidak diproses ulang', async () => {
  const admin = adminClient;
  const job = await prisma.wordPressImportJob.findUnique({ where: { id: jobId } });
  assert.ok(job);
  const sql = buildSql([sqlRow({ id: 201, title: 'Duplikat', content: narrative('duplikat'), slug: `${unique}-dup` })]);
  const form = new FormData();
  form.append('file', new Blob([sql], { type: 'application/sql' }), 'dump-lain.sql');
  const first = await admin.request('/api/admin/wordpress/imports', { method: 'POST', body: form });
  assert.equal(first.status, 202);
  createdJobIds.push(first.body.data.id);
  await waitForJob(admin, first.body.data.id);

  const jobRow = await prisma.wordPressImportJob.findUnique({ where: { id: first.body.data.id } });
  const secondForm = new FormData();
  secondForm.append('file', new Blob([sql], { type: 'application/sql' }), 'dump-lain.sql');
  const second = await admin.request('/api/admin/wordpress/imports', { method: 'POST', body: secondForm });
  assert.equal(second.status, 200);
  assert.equal(second.body.duplicate, true);
  assert.equal(second.body.data.id, jobRow.id);
});

test('detail seluruh item dapat dibuka (serialisasi BigInt) dan status review mengikuti state machine', async () => {
  const admin = adminClient;
  const list = await admin.request(`/api/admin/wordpress/archive?jobId=${jobId}&limit=100`);
  assert.equal(list.status, 200);
  for (const item of list.body.data) {
    const detail = await admin.request(`/api/admin/wordpress/archive/${item.id}`);
    assert.equal(detail.status, 200, `detail ${item.wordpressId} gagal: ${JSON.stringify(detail.body)}`);
    assert.equal(typeof detail.body.data.wordpressId, 'string');
    assert.ok(Array.isArray(detail.body.data.revisions));
  }

  // ID tidak valid / tidak ada menghasilkan error yang jelas, bukan modal kosong.
  const invalid = await admin.request('/api/admin/wordpress/archive/00000000-0000-0000-0000-000000000000');
  assert.equal(invalid.status, 404);
  assert.ok(invalid.body.error);

  const target = list.body.data.find((item) => item.wordpressId === '107');
  assert.ok(target);
  const toAudit = await admin.request(`/api/admin/wordpress/archive/${target.id}/audit`, { method: 'POST', body: JSON.stringify({ targetType: 'berita' }) });
  assert.equal(toAudit.status, 200, JSON.stringify(toAudit.body));
  assert.equal(toAudit.body.data.reviewStatus, 'in_audit');
  // Idempoten: klik kedua tidak mengubah apa pun.
  const again = await admin.request(`/api/admin/wordpress/archive/${target.id}/audit`, { method: 'POST', body: JSON.stringify({ targetType: 'berita' }) });
  assert.equal(again.status, 200);
  assert.equal(again.body.data.reviewStatus, 'in_audit');

  const imported = await admin.request(`/api/admin/wordpress/archive/${target.id}`, { method: 'PATCH', body: JSON.stringify({ reviewStatus: 'imported' }) });
  assert.equal(imported.status, 400, 'status imported tidak boleh diset manual');

  const ready = await admin.request(`/api/admin/wordpress/archive/${target.id}/review`, { method: 'POST', body: JSON.stringify({ reviewStatus: 'ready' }) });
  assert.equal(ready.status, 200);
  assert.equal(ready.body.data.reviewStatus, 'ready');

  const detail = await admin.request(`/api/admin/wordpress/archive/${target.id}`);
  const actions = detail.body.data.revisions.map((revision) => revision.action);
  assert.ok(actions.includes('audit_started'));
  assert.ok(actions.includes('item_reviewed'));
});

test('edit, review, skip, dan ID tidak valid', async () => {
  const admin = adminClient;
  const list = await admin.request(`/api/admin/wordpress/archive?jobId=${jobId}&limit=50`);
  const target = list.body.data.find((item) => item.wordpressId === '101');
  assert.ok(target);

  const patched = await admin.request(`/api/admin/wordpress/archive/${target.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: `${target.title} (edit)`, targetType: 'berita', reviewStatus: 'ready' }),
  });
  assert.equal(patched.status, 200);
  assert.ok(patched.body.data.title.endsWith('(edit)'));

  const detail = await admin.request(`/api/admin/wordpress/archive/${target.id}`);
  assert.ok(detail.body.data.revisions.length >= 1);
  assert.equal(detail.body.data.content, target.content, 'konten tidak boleh berubah tanpa dikirim');

  const review = await admin.request(`/api/admin/wordpress/archive/${target.id}/review`, {
    method: 'POST',
    body: JSON.stringify({ reviewStatus: 'ready', reviewNotes: 'Sudah diperiksa' }),
  });
  assert.equal(review.status, 200);
  assert.equal(review.body.data.reviewStatus, 'ready');

  const markedSkip = await admin.request(`/api/admin/wordpress/archive/${target.id}/skip`, { method: 'POST', body: JSON.stringify({ reviewNotes: 'Duplikat' }) });
  assert.equal(markedSkip.status, 200);
  assert.equal(markedSkip.body.data.reviewStatus, 'skipped');

  const invalid = await admin.request('/api/admin/wordpress/archive/not-a-uuid', { method: 'PATCH', body: JSON.stringify({ title: 'x' }) });
  assert.equal(invalid.status, 400);
});

test('import ke konten publik selalu draft dan idempoten', async () => {
  const admin = adminClient;
  const guest = makeClient();
  await guest.request('/api/auth/csrf');

  const list = await admin.request(`/api/admin/wordpress/archive?jobId=${jobId}&targetType=berita&limit=50`);
  const target = list.body.data.find((item) => item.wordpressId === '101');
  assert.ok(target);

  const imported = await admin.request(`/api/admin/wordpress/archive/${target.id}/import`, { method: 'POST' });
  assert.equal(imported.status, 201, JSON.stringify(imported.body));
  const created = imported.body.data;
  assert.equal(created.status, 'draft');
  assert.equal(created.slug, target.slug);

  const again = await admin.request(`/api/admin/wordpress/archive/${target.id}/import`, { method: 'POST' });
  assert.equal(again.status, 409);
  assert.equal(again.body.code, 'already_imported');

  const adminList = await admin.request('/api/berita?limit=100');
  assert.ok(adminList.body.data.some((row) => row.id === created.id), 'admin harus melihat draft');
  const publicList = await guest.request('/api/berita?limit=100');
  assert.ok(!publicList.body.data.some((row) => row.id === created.id), 'draft tidak boleh tampil publik');
  const publicDetail = await guest.request(`/api/berita/${created.slug}`);
  assert.equal(publicDetail.status, 404);

  const item = await admin.request(`/api/admin/wordpress/archive/${target.id}`);
  assert.equal(item.body.data.reviewStatus, 'imported');
  assert.equal(item.body.data.importedToId, created.id);
});

test('import publik menerima draft/published dan mencerminkan status CMS di audit', async () => {
  const admin = adminClient;
  const sourceList = await admin.request(`/api/admin/wordpress/archive?jobId=${jobId}&targetType=pengumuman&limit=50`);
  const source = sourceList.body.data.find((item) => item.wordpressId === '103');
  assert.ok(source);

  const published = await admin.request(`/api/admin/wordpress/archive/${source.id}/import`, {
    method: 'POST', body: JSON.stringify({ status: 'published' }),
  });
  assert.equal(published.status, 201, JSON.stringify(published.body));
  assert.equal(published.body.data.status, 'published');
  const auditDetail = await admin.request(`/api/admin/wordpress/audit/${source.id}`);
  assert.equal(auditDetail.status, 200);
  assert.equal(auditDetail.body.data.auditState, 'published');
  assert.equal(auditDetail.body.data.cmsStatus, 'published');

  const invalid = await admin.request(`/api/admin/wordpress/archive/${source.id}/import`, {
    method: 'POST', body: JSON.stringify({ status: 'garbage' }),
  });
  assert.equal(invalid.status, 400, 'status publikasi invalid ditolak backend');
});

test('slug bentrok menggagalkan import tanpa menandai item imported', async () => {
  const admin = adminClient;
  const list = await admin.request(`/api/admin/wordpress/archive?jobId=${jobId}&targetType=berita&limit=50`);
  const source = list.body.data.find((item) => item.wordpressId === '102');
  assert.ok(source);

  const first = await admin.request(`/api/admin/wordpress/archive/${source.id}/import`, { method: 'POST' });
  assert.equal(first.status, 201);
  assert.equal(first.body.data.status, 'draft');

  const second = await admin.request(`/api/admin/wordpress/archive/${source.id}/import`, { method: 'POST' });
  assert.equal(second.status, 409);
});

test('double request hanya membuat satu konten', async (t) => {
  const admin = adminClient;
  // Isolasi: buat job baru khusus agar tidak memakai item yang sudah diimport.
  const upload = await admin.request('/api/admin/wordpress/imports', {
    method: 'POST',
    body: newFormData(t, { id: 701, title: 'Double Request', content: narrative('double'), slug: `${unique}-double`, type: 'post' }),
  });
  assert.equal(upload.status, 202);
  const progress = await waitForJob(admin, upload.body.data.id);
  assert.equal(progress.status, 'completed');
  const list = await admin.request(`/api/admin/wordpress/archive?jobId=${upload.body.data.id}&targetType=berita&limit=50`);
  assert.equal(list.status, 200);
  assert.ok(list.body.data.length >= 1);
  const source = list.body.data[0];

  const results = await Promise.all([
    admin.request(`/api/admin/wordpress/archive/${source.id}/import`, { method: 'POST' }),
    admin.request(`/api/admin/wordpress/archive/${source.id}/import`, { method: 'POST' }),
  ]);
  const statuses = results.map((result) => result.status).sort();
  assert.deepEqual(statuses, [201, 409]);
  const rows = await prisma.berita.findMany({ where: { slug: source.slug } });
  assert.equal(rows.length, 1);
});

function newFormData(t, { id, title, content, slug, type = 'post' }) {
  const sql = buildSql([sqlRow({ id, title, content, type, slug })]);
  const form = new FormData();
  form.append('file', new Blob([sql], { type: 'application/sql' }), `double-${t.name}.sql`);
  return form;
}

test('prestasi dari arsip draft tidak tampil di API publik', async () => {
  const admin = adminClient;
  const guest = makeClient();
  await guest.request('/api/auth/csrf');

  const list = await admin.request(`/api/admin/wordpress/archive?jobId=${jobId}&targetType=prestasi&limit=50`);
  const source = list.body.data.find((item) => item.wordpressId === '104');
  assert.ok(source);
  const imported = await admin.request(`/api/admin/wordpress/archive/${source.id}/import`, { method: 'POST' });
  assert.equal(imported.status, 201, JSON.stringify(imported.body));
  assert.equal(imported.body.data.status, 'draft');

  const publicList = await guest.request('/api/prestasi?limit=100');
  assert.ok(!publicList.body.data.some((row) => row.id === imported.body.data.id));
  const publicDetail = await guest.request(`/api/prestasi/${imported.body.data.slug}`);
  assert.equal(publicDetail.status, 404);

  const adminList = await admin.request('/api/prestasi?limit=100');
  assert.ok(adminList.body.data.some((row) => row.id === imported.body.data.id));

  const published = await admin.request(`/api/prestasi/${imported.body.data.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'published', tanggal: imported.body.data.tanggal ? new Date(imported.body.data.tanggal).toISOString().slice(0, 10) : undefined }) });
  assert.equal(published.status, 200);
  assert.equal(published.body.data.status, 'published', JSON.stringify(published.body));
  const visible = await guest.request(`/api/prestasi/${imported.body.data.slug}`);
  assert.equal(visible.status, 200, JSON.stringify(visible.body));
  assert.equal(visible.body.data.status, 'published');
});

test('otorisasi: tamu 401, non-admin 403', async () => {
  const guest = makeClient();
  await guest.request('/api/auth/csrf');
  const unauth = await guest.request(`/api/admin/wordpress/archive/${jobId}/import`, { method: 'POST' });
  assert.equal(unauth.status, 401);

  const applicant = makeClient();
  assert.equal((await login(applicant, APPLICANT_EMAIL)).status, 200);
  const forbidden = await applicant.request(`/api/admin/wordpress/archive/${jobId}/import`, { method: 'POST' });
  assert.equal(forbidden.status, 403);

  const forbiddenList = await applicant.request('/api/admin/wordpress/imports');
  assert.equal(forbiddenList.status, 403);
});

test('media resolution menolak sumber internal tanpa request jaringan', async () => {
  const admin = adminClient;
  const list = await admin.request(`/api/admin/wordpress/archive?jobId=${jobId}&limit=50`);
  const item = list.body.data.find((entry) => entry.metadata?.imageCandidateUrl === null && entry.imageUrl === null);
  assert.ok(item);
  const res = await admin.request(`/api/admin/wordpress/archive/${item.id}/media`, { method: 'POST' });
  assert.equal(res.status, 400);
});

test('delete job menolak job yang masih diproses', async () => {
  const admin = adminClient;
  const active = await prisma.wordPressImportJob.create({
    data: {
      originalFileName: `${PREFIX}aktif.sql`,
      sourceChecksum: crypto.randomUUID().replace(/-/g, '').padEnd(64, 'a').slice(0, 64),
      fileSize: BigInt(1024),
      status: 'processing',
      createdBy: adminUserId,
    },
  });
  const res = await admin.request(`/api/admin/wordpress/imports/${active.id}`, { method: 'DELETE' });
  assert.equal(res.status, 409, JSON.stringify(res.body));
  assert.equal(res.body.code, 'job_active');
  await prisma.wordPressImportJob.delete({ where: { id: active.id } });
});

test('delete job menghapus arsip tetapi mempertahankan konten CMS', async (t) => {
  const admin = adminClient;

  const slug = `${unique}-hapus`;
  const upload = await admin.request('/api/admin/wordpress/imports', {
    method: 'POST',
    body: newFormData(t, { id: 901, title: `${unique} Konten Untuk Dihapus`, content: narrative('hapus'), slug }),
  });
  assert.equal(upload.status, 202, JSON.stringify(upload.body));
  const batchId = upload.body.data.id;
  await waitForJob(admin, batchId);

  const list = await admin.request(`/api/admin/wordpress/archive?jobId=${batchId}&targetType=berita&limit=50`);
  const source = list.body.data[0];
  assert.ok(source);
  const imported = await admin.request(`/api/admin/wordpress/archive/${source.id}/import`, { method: 'POST' });
  assert.equal(imported.status, 201);
  const cmsId = imported.body.data.id;

  const removed = await admin.request(`/api/admin/wordpress/imports/${batchId}`, { method: 'DELETE' });
  assert.equal(removed.status, 200, JSON.stringify(removed.body));
  assert.ok(removed.body.data.deletedItemCount >= 1);
  assert.equal(removed.body.data.preservedImportedCount, 1);

  const gone = await admin.request(`/api/admin/wordpress/imports/${batchId}`);
  assert.equal(gone.status, 404);
  const remaining = await prisma.wordPressArchiveItem.count({ where: { jobId: batchId } });
  assert.equal(remaining, 0);
  const cmsRow = await prisma.berita.findUnique({ where: { id: cmsId } });
  assert.ok(cmsRow, 'konten CMS tidak boleh ikut terhapus');
  const log = await prisma.wordPressArchiveDeletion.findFirst({ where: { jobId: batchId } });
  assert.ok(log, 'penghapusan batch harus tercatat');
  assert.equal(log.importedItemCount, 1);
});

test('delete job ditolak untuk non-admin', async () => {
  const applicant = applicantClient;
  const res = await applicant.request(`/api/admin/wordpress/imports/${jobId}`, { method: 'DELETE' });
  assert.equal(res.status, 403);
});