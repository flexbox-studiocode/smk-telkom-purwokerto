import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decodeSqlBuffer, splitSqlStatements, parseInsertStatement,
} from '../wordpress-archive/src/lib/sql-parser.js';
import {
  validateDumpStructure, looksLikeSqlDump, DumpValidationError, CONTENT_TABLE,
} from '../src/wordpress/dumpValidator.js';
import { buildArchiveItem } from '../src/wordpress/archiveItems.js';
import { isBlockedIp } from '../wordpress-archive/src/lib/safe-fetch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REAL_DUMP = path.join(__dirname, '..', 'wordpress-archive', 'wordpres_posts.sql');

const COLUMNS = '(`ID`,`post_author`,`post_date`,`post_date_gmt`,`post_content`,`post_title`,`post_excerpt`,`post_status`,`comment_status`,`ping_status`,`post_password`,`post_name`,`to_ping`,`pinged`,`post_modified`,`post_modified_gmt`,`post_content_filtered`,`post_parent`,`guid`,`menu_order`,`post_type`,`post_mime_type`,`comment_count`)';

function row({ id = 1, title = 'Judul', content = '<p>Konten uji</p>', status = 'publish', type = 'post', slug = 'judul', excerpt = '', date = '2025-01-02 03:04:05', guid = 'https://example.test/?p=1' } = {}) {
  const values = [id, 1, date, date, content, title, excerpt, status, 'open', 'closed', '', slug, '', '', date, date, '', 0, guid, 0, type, '', 0];
  const serialized = values.map((value) => (value === null ? 'NULL' : `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)).join(',');
  return `(${serialized})`;
}

function dump(rows) {
  return `-- dump uji\nDROP TABLE IF EXISTS \`ic_posts\`;\nCREATE TABLE \`ic_posts\` (\n  \`ID\` bigint(20) NOT NULL,\n  \`post_author\` bigint(20) NOT NULL,\n  \`post_date\` datetime NOT NULL,\n  \`post_date_gmt\` datetime NOT NULL,\n  \`post_content\` longtext NOT NULL,\n  \`post_title\` text NOT NULL,\n  \`post_excerpt\` text NOT NULL,\n  \`post_status\` varchar(20) NOT NULL,\n  \`comment_status\` varchar(20) NOT NULL,\n  \`ping_status\` varchar(20) NOT NULL,\n  \`post_password\` varchar(255) NOT NULL,\n  \`post_name\` varchar(200) NOT NULL,\n  \`to_ping\` text NOT NULL,\n  \`pinged\` text NOT NULL,\n  \`post_modified\` datetime NOT NULL,\n  \`post_modified_gmt\` datetime NOT NULL,\n  \`post_content_filtered\` longtext NOT NULL,\n  \`post_parent\` bigint(20) NOT NULL,\n  \`guid\` varchar(255) NOT NULL,\n  \`menu_order\` int(11) NOT NULL,\n  \`post_type\` varchar(20) NOT NULL,\n  \`post_mime_type\` varchar(100) NOT NULL,\n  \`comment_count\` bigint(20) NOT NULL\n) ENGINE=InnoDB;\nINSERT INTO \`ic_posts\` ${COLUMNS} VALUES\n${rows.join(',\n')};\n`;
}

test('decodeSqlBuffer: UTF-8 Indonesia tidak menjadi mojibake', () => {
  const text = "INSERT INTO `ic_posts` VALUES ('Assalamu’alaikum — “kutip”');";
  const { text: decoded, encoding } = decodeSqlBuffer(Buffer.from(text, 'utf8'));
  assert.equal(encoding, 'utf8');
  assert.ok(decoded.includes('Assalamu’alaikum — “kutip”'));
  assert.ok(!decoded.includes('â€'));
});

test('decodeSqlBuffer: byte bukan UTF-8 jatuh ke latin1 tanpa kehilangan byte', () => {
  const buffer = Buffer.from([0x41, 0xe9, 0x42]);
  const { text, encoding } = decodeSqlBuffer(buffer);
  assert.equal(encoding, 'latin1');
  assert.equal(text, 'AéB');
});

test('splitSqlStatements: titik koma dalam string dan komentar tidak memecah statement', () => {
  const sql = "-- komentar; dengan titik koma\nINSERT INTO `ic_posts` VALUES ('a;b');\n/* blok; */\nSET NAMES utf8mb4;";
  const statements = [...splitSqlStatements(sql)].map((entry) => entry.sql.trim()).filter(Boolean);
  assert.equal(statements.length, 2);
  assert.ok(statements[0].includes("'a;b'"));
  assert.ok(statements[1].includes('SET NAMES utf8mb4'));
});

test('parseInsertStatement: NULL, escape, dan arity salah', () => {
  const parsed = parseInsertStatement("INSERT INTO `ic_posts` (`a`,`b`,`c`) VALUES (1,'It\\'s',NULL),(2,'x');");
  assert.deepEqual(parsed.rows[0], { a: '1', b: "It's", c: null });
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.skippedTuples, 1);
});

test('validateDumpStructure: dump valid lolos dan baris terbaca', () => {
  const text = dump([row(), row({ id: 2, title: 'Kedua', slug: 'kedua' })]);
  const summary = validateDumpStructure(text);
  assert.equal(summary.contentTableFound, true);
  assert.equal(summary.inserts, 1);
  assert.ok(summary.columns.has('post_content'));
  assert.ok(looksLikeSqlDump(text.slice(0, 200)));
});

test('validateDumpStructure: tabel ic_posts wajib ada', () => {
  assert.throws(
    () => validateDumpStructure("INSERT INTO `other_posts` (`ID`) VALUES (1);"),
    (error) => error instanceof DumpValidationError && /ic_posts/.test(error.message),
  );
});

test('validateDumpStructure: kolom wajib tidak lengkap ditolak', () => {
  const text = "INSERT INTO `ic_posts` (`ID`,`post_title`) VALUES (1,'x');";
  assert.throws(
    () => validateDumpStructure(text),
    (error) => error instanceof DumpValidationError && Array.isArray(error.details?.missingColumns),
  );
});

test('validateDumpStructure: statement berbahaya ditolak tanpa dieksekusi', () => {
  const base = dump([row()]);
  for (const dangerous of ['DELETE FROM `ic_posts`;', 'UPDATE `ic_posts` SET `post_title`=1;', 'TRUNCATE TABLE `ic_posts`;', 'GRANT ALL ON *.* TO x;']) {
    assert.throws(() => validateDumpStructure(`${base}\n${dangerous}`), DumpValidationError, dangerous);
  }
});

test('validateDumpStructure: DROP TABLE dan ALTER hanya diabaikan', () => {
  const text = `${dump([row()])}\nALTER TABLE \`ic_posts\` ADD PRIMARY KEY (\`ID\`);`;
  assert.doesNotThrow(() => validateDumpStructure(text));
});

test('validateDumpStructure: INSERT malformed ditolak', () => {
  const text = dump([row()]).replace(/VALUES[\s\S]*;/, 'VALUES (1,2;\n');
  assert.throws(() => validateDumpStructure(text), DumpValidationError);
});

test('buildArchiveItem: klasifikasi, validasi HTML, gambar internal, tanggal invalid', () => {
  const usedSlugs = { berita: new Set(), pengumuman: new Set(), prestasi: new Set(), needs_review: new Set() };
  const berita = buildArchiveItem({
    ID: '10', post_title: 'Kunjungan Industri Siswa', post_type: 'post', post_status: 'publish',
    post_content: `<p>${'Kegiatan kunjungan industri berlangsung dengan lancar. '.repeat(15)}</p><script>alert(1)</script><img src="x" onerror="alert(1)">`,
    post_excerpt: 'Ringkasan', post_name: 'kunjungan-industri', post_date: '0000-00-00 00:00:00',
    post_modified: '0000-00-00 00:00:00', guid: 'http://127.0.0.1/foto.jpg',
  }, { usedSlugs });
  assert.equal(berita.item.targetType, 'berita');
  assert.equal(berita.item.reviewStatus, 'pending_review');
  assert.ok(!/script|onerror/i.test(berita.item.content));
  assert.equal(berita.item.sourceDate, null);
  assert.ok(berita.warnings.some((warning) => /Tanggal sumber/.test(warning)));
  assert.ok(berita.warnings.some((warning) => /internal/.test(warning)));
  assert.equal(berita.item.imageUrl, null);
});

test('buildArchiveItem: private/draft perlu review, attachment dilewati', () => {
  const usedSlugs = { berita: new Set(), pengumuman: new Set(), prestasi: new Set(), needs_review: new Set() };
  const privatePost = buildArchiveItem({
    ID: '11', post_title: 'Pengumuman Internal', post_type: 'post', post_status: 'private',
    post_content: '<p>Pengumuman pengambilan ijazah bagi alumni sekolah ini.</p>', post_name: 'internal',
    post_date: '2025-01-01 00:00:00', post_modified: '2025-01-01 00:00:00', guid: '',
  }, { usedSlugs });
  assert.equal(privatePost.item.reviewStatus, 'pending_review');
  assert.ok(privatePost.warnings.some((warning) => /private/.test(warning)));

  const attachment = buildArchiveItem({
    ID: '12', post_type: 'attachment', post_status: 'inherit', post_mime_type: 'image/png', post_title: 'foto',
    post_content: '', post_name: 'foto', post_date: '2025-01-01 00:00:00', guid: 'https://example.test/a.png',
  }, { usedSlugs });
  assert.equal(attachment.skip, true);
});

test('buildArchiveItem: page menjadi needs_review, ID invalid dianggap gagal', () => {
  const usedSlugs = { berita: new Set(), pengumuman: new Set(), prestasi: new Set(), needs_review: new Set() };
  const page = buildArchiveItem({
    ID: '13', post_title: 'Profil Sekolah', post_type: 'page', post_status: 'publish',
    post_content: '<p>Halaman profil sekolah yang cukup panjang untuk konten.</p>', post_name: 'profil',
    post_date: '2025-01-01 00:00:00', post_modified: '2025-01-01 00:00:00', guid: '',
  }, { usedSlugs });
  assert.equal(page.item.targetType, 'needs_review');
  const invalid = buildArchiveItem({ post_title: 'x' }, { usedSlugs });
  assert.equal(invalid.skip, true);
  assert.equal(invalid.failed, true);
});

test('isBlockedIp: alamat internal dan publik', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.1.1', '169.254.169.254', '172.16.0.1', '::1', 'fe80::1', 'fd00::1']) {
    assert.equal(isBlockedIp(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '103.10.20.30', '2001:4860:4860::8888']) {
    assert.equal(isBlockedIp(ip), false, ip);
  }
});

test('dump asli: encoding UTF-8 valid dan parser menghasilkan judul wajar', { skip: !fs.existsSync(REAL_DUMP) }, () => {
  const buffer = fs.readFileSync(REAL_DUMP);
  const { text, encoding } = decodeSqlBuffer(buffer);
  assert.equal(encoding, 'utf8');
  const summary = validateDumpStructure(text);
  assert.equal(summary.contentTableFound, true);
  assert.ok(summary.inserts > 100);
  assert.equal(CONTENT_TABLE, 'ic_posts');
});