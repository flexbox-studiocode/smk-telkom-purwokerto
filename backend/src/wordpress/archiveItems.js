// Adaptasi satu baris ic_posts menjadi WordPressArchiveItem.
//
// Aturan penting:
//   - status publikasi aplikasi TIDAK diambil dari post_status WordPress;
//     hasil adaptasi hanya disimpan di tabel arsip dengan reviewStatus.
//   - klasifikasi yang tidak yakin menjadi targetType `needs_review`.
//   - tanggal post_date adalah tanggal publikasi sumber, BUKAN tanggal event.
//   - tidak mengarang kategori/tingkat/penulis yang tidak ada di sumber.
import { classifyPost } from '../../wordpress-archive/src/lib/classify.js';
import { sanitizeHtml } from '../../wordpress-archive/src/lib/sanitize.js';
import {
  decodeBasicEntities, htmlToPlainText, truncateWords, slugify, parseMysqlDate,
} from '../../wordpress-archive/src/lib/base.js';
import {
  extractContentImageUrls, isImageGuid, resolveBaseSlug, resolveTitle, postDate,
} from '../../wordpress-archive/src/lib/transform.js';

export const TARGET_TYPES = ['berita', 'pengumuman', 'prestasi', 'needs_review'];
export const REVIEW_STATUSES = ['pending_review', 'ready', 'imported', 'skipped', 'failed'];
const SOURCE_STATUSES_WITH_REVIEW = new Set(['draft', 'pending', 'private', 'future', 'auto-draft', 'trash']);

export function wordpressIdOf(post) {
  const id = Number.parseInt(String(post?.ID ?? ''), 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Validasi URL gambar tanpa melakukan request jaringan. Pemeriksaan penuh
// (DNS + redirect + isi berkas) dilakukan saat admin memilih "Ambil gambar".
export function validateImageUrl(raw) {
  const value = decodeBasicEntities(String(raw ?? '')).trim();
  if (!value) return { url: null, warning: null };
  let parsed;
  try { parsed = new URL(value); } catch { return { url: null, warning: 'URL gambar tidak valid.' }; }
  if (!/^https?:$/.test(parsed.protocol)) return { url: null, warning: 'URL gambar bukan HTTP/HTTPS.' };
  if (parsed.username || parsed.password) return { url: null, warning: 'URL gambar memuat kredensial.' };
  const host = parsed.hostname.toLowerCase();
  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    return { url: null, warning: 'URL gambar menunjuk alamat internal.' };
  }
  return { url: parsed.toString(), warning: null };
}

function pickImageCandidate(post) {
  const guids = isImageGuid(post.guid) ? [post.guid.trim()] : [];
  const inline = extractContentImageUrls(post.post_content);
  for (const candidate of [...guids, ...inline]) {
    const checked = validateImageUrl(candidate);
    if (checked.url) return checked;
    if (checked.warning) return checked;
  }
  return { url: null, warning: null };
}

function hasHtmlRisk(rawHtml, sanitized) {
  const raw = String(rawHtml ?? '');
  if (!raw) return false;
  if (/<\s*(?:script|iframe|object|embed|form)\b/i.test(raw)) return true;
  if (/\son[a-z]+\s*=/i.test(raw)) return true;
  if (/\[\/?[a-z][a-z0-9_-]*[^\]]*\]/i.test(raw)) return true;
  return raw.length > 40 && sanitized.length < raw.length * 0.5;
}

function assignSlug(base, used) {
  const trimmed = String(base || 'item').slice(0, 240).replace(/-+$/, '') || 'item';
  if (!used.has(trimmed)) { used.add(trimmed); return { slug: trimmed, collision: null }; }
  let n = 2;
  let proposal = `${trimmed}-${n}`;
  while (used.has(proposal)) { n += 1; proposal = `${trimmed}-${n}`; }
  used.add(proposal);
  return { slug: proposal, collision: trimmed };
}

const TARGET_LABEL = { berita: 'Berita', pengumuman: 'Pengumuman', prestasi: 'Prestasi', event: 'Event' };

// Mengembalikan { skip } atau { item, warnings, reasons }.
export function buildArchiveItem(post, { usedSlugs }) {
  const wordpressId = wordpressIdOf(post);
  if (!wordpressId) return { skip: true, reason: 'ID WordPress tidak valid', failed: true };

  const { category, reasons } = classifyPost(post);
  if (category === 'skip') return { skip: true, reason: reasons.join('; ') };

  const warnings = [];
  const rawTitle = decodeBasicEntities(String(post.post_title ?? '')).trim();
  const title = resolveTitle(post);
  if (!rawTitle) warnings.push('Judul sumber kosong.');
  const content = sanitizeHtml(post.post_content ?? '');
  const plain = htmlToPlainText(content);
  if (plain.length < 20) warnings.push('Konten teks kosong atau terlalu pendek.');
  if (hasHtmlRisk(post.post_content, content)) warnings.push('HTML sumber disanitasi (shortcode/skrip/atribut berbahaya dibuang).');
  const sourceStatus = String(post.post_status ?? '').trim().toLowerCase();
  if (SOURCE_STATUSES_WITH_REVIEW.has(sourceStatus)) warnings.push(`Status sumber "${sourceStatus}" memerlukan peninjauan.`);

  const date = postDate(post);
  const modified = parseMysqlDate(post.post_modified);
  if (!date) warnings.push('Tanggal sumber tidak valid atau kosong.');
  if (post.post_date && !parseMysqlDate(post.post_date)) warnings.push('post_date tidak valid.');

  const imageCandidate = pickImageCandidate(post);
  if (imageCandidate.warning) warnings.push(imageCandidate.warning);

  const sourceUrl = (() => {
    const guid = String(post.guid ?? '').trim();
    if (!guid) return null;
    const checked = validateImageUrl(guid);
    if (!checked.url) return null;
    return checked.url;
  })();

  const beritaTarget = category === 'berita';
  const pengumumanTarget = category === 'pengumuman';
  const prestasiTarget = category === 'prestasi';
  const confident = beritaTarget || pengumumanTarget || prestasiTarget;
  const targetType = confident ? category : 'needs_review';

  if (category === 'event') warnings.push('Terdeteksi sebagai event; target Berita/Pengumuman/Prestasi perlu dipilih manual.');
  if (!confident && category !== 'event') warnings.push(...(reasons.length ? reasons : ['Klasifikasi belum yakin.']));

  const base = resolveBaseSlug(post, title);
  const registryKey = confident ? category : 'needs_review';
  const { slug, collision } = assignSlug(base, usedSlugs[registryKey]);
  if (collision) warnings.push(`Slug bentrok dengan item lain di job ini; dipakai "${slug}".`);

  const summarySource = decodeBasicEntities(String(post.post_excerpt ?? '')).trim();
  const summary = summarySource ? truncateWords(htmlToPlainText(summarySource), 500) : truncateWords(plain, 300);

  const needsReview = !confident || warnings.length > 0;
  const reviewStatus = needsReview ? 'pending_review' : 'ready';

  return {
    item: {
      wordpressId,
      sourcePostType: String(post.post_type ?? 'post').slice(0, 64) || 'post',
      sourcePostStatus: String(post.post_status ?? '').slice(0, 32),
      sourceSlug: String(post.post_name ?? '').trim() || null,
      sourceUrl,
      sourceDate: date ?? null,
      sourceModified: modified ?? null,
      targetType,
      title,
      slug,
      summary: summary || null,
      content: content || null,
      imageUrl: null,
      reviewStatus,
      metadata: {
        classifierReasons: reasons,
        warnings,
        imageCandidateUrl: imageCandidate.url,
        sourceGuid: String(post.guid ?? '') || null,
        sourcePostName: String(post.post_name ?? '') || null,
        sourceTargetLabel: TARGET_LABEL[category] ?? category,
        sourcePlainLength: plain.length,
        wordpressStatusPreserved: sourceStatus || null,
      },
    },
    reasons,
    warnings,
  };
}

export { slugify };