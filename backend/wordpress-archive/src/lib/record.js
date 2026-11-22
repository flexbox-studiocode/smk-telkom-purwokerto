// Transformasi baris ic_posts -> record target project (berita/pengumuman/
// prestasi/events). Menghasilkan ID deterministik, slug aman, dan konten yang
// sudah disanitasi sehingga migrasi bersifat idempoten.

import {
  deterministicUuid, WORDPRESS_NAMESPACE, slugify, toDateOnly, toDateTime,
  decodeBasicEntities, htmlToPlainText, truncateWords,
} from './base.js';
import { classifyPost } from './classify.js';
import {
  extractContentImageUrls, isImageGuid, resolveBaseSlug, resolveTitle,
  transformContent, postDate,
} from './transform.js';
import { indexManifest } from './media.js';

const DEFAULT_AUTHOR = 'SMK Telkom Purwokerto';
const WORD_CATEGORIES = ['Juara', 'Olimpiade', 'Sertifikasi', 'Kompetisi', 'Akademik', 'Non-Akademik'];
const TINGKAT = [
  [/\b(internasional|asia|eropa|asean|dunia)\b/i, 'Internasional'],
  [/\b(nasional|nasional)\b/i, 'Nasional'],
  [/\b(provinsi|provinsi|jateng|jawa tengah)\b/i, 'Provinsi'],
  [/\b(kabupaten|banyumas|kota|kab\.|purwokerto)\b/i, 'Kabupaten/Kota'],
  [/\b(sekolah|internal)\b/i, 'Sekolah'],
];

function pickImage(post, manifestIndex) {
  const guids = isImageGuid(post.guid) ? [post.guid.trim()] : [];
  const inline = extractContentImageUrls(post.post_content);
  for (const url of [...guids, ...inline]) {
    const found = manifestIndex.get(decodeBasicEntities(url).trim());
    if (found?.publicUrl) return found.publicUrl;
  }
  return null;
}

export function deriveTingkat(title) {
  for (const [re, label] of TINGKAT) if (re.test(title)) return label;
  return null;
}

// Ringkasan events tidak boleh kosong & dibatasi 500 char oleh schema.
function eventSummary(post, sanitizedHtml) {
  const raw = decodeBasicEntities(String(post.post_excerpt ?? '')).trim();
  const summary = raw ? htmlToPlainText(raw) : htmlToPlainText(sanitizedHtml);
  return truncateWords(summary, 480) || truncateWords(resolveTitle(post), 480);
}

export function assignSlug(base, used) {
  let candidate = base || 'item';
  if (candidate.length > 240) candidate = candidate.slice(0, 240).replace(/-+$/, '');
  if (!used.has(candidate)) { used.add(candidate); return { slug: candidate, collision: null }; }
  let n = 2;
  let proposal = `${candidate}-${n}`;
  while (used.has(proposal)) { n += 1; proposal = `${candidate}-${n}`; }
  used.add(proposal);
  return { slug: proposal, collision: candidate };
}

// Mengubah satu baris ic_posts menjadi { category, target, record, media, reasons }.
export function mapPost(post, context) {
  const { usedSlugs, manifestIndex } = context;
  const { category, reasons } = classifyPost(post);
  const date = postDate(post);
  const title = resolveTitle(post);
  const sanitized = transformContent(post);
  const image = pickImage(post, manifestIndex);
  const summary = htmlToPlainText(post.post_excerpt) || htmlToPlainText(sanitized);
  const base = resolveBaseSlug(post, title);

  const source = {
    wordpressId: post.ID,
    postType: post.post_type,
    postStatus: post.post_status,
    slug: post.post_name || null,
    date: toDateTime(date),
    modified: toDateTime(post.post_modified),
    guid: post.guid || null,
    url: post.guid && /^https?:\/\//.test(post.guid) ? post.guid : null,
  };

  if (category === 'skip') {
    return { category, source, reasons, record: null, target: null, media: null, conflict: null };
  }
  if (category === 'needs_review') {
    return { category, source, reasons, record: null, target: null, media: image, conflict: null };
  }

  if (category === 'berita') {
    const { slug, collision } = assignSlug(base, usedSlugs.berita);
    return {
      category, source, reasons, target: 'berita', media: image, conflict: collision ? { type: 'slug_collision', resolvedAs: slug } : null,
      record: {
        id: deterministicUuid(WORDPRESS_NAMESPACE, `berita:${post.ID}`),
        judul: title, slug, ringkasan: truncateWords(summary, 500) || null,
        konten: sanitized || title, gambarUrl: image, penulis: DEFAULT_AUTHOR,
        status: post.post_status === 'publish' ? 'published' : 'draft',
        createdAt: toDateTime(date), updatedAt: toDateTime(post.post_modified) || toDateTime(date),
      },
    };
  }

  if (category === 'pengumuman') {
    const { slug, collision } = assignSlug(base, usedSlugs.pengumuman);
    return {
      category, source, reasons, target: 'pengumuman', media: image, conflict: collision ? { type: 'slug_collision', resolvedAs: slug } : null,
      record: {
        id: deterministicUuid(WORDPRESS_NAMESPACE, `pengumuman:${post.ID}`),
        judul: title, slug, ringkasan: truncateWords(summary, 500) || null,
        konten: sanitized || title, gambarUrl: image,
        status: post.post_status === 'publish' ? 'published' : 'draft',
        tanggal: toDateTime(date),
        createdAt: toDateTime(date), updatedAt: toDateTime(post.post_modified) || toDateTime(date),
      },
    };
  }

  if (category === 'prestasi') {
    const { slug, collision } = assignSlug(base, usedSlugs.prestasi);
    const kategori = WORD_CATEGORIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(`${title} ${summary}`)) || null;
    return {
      category, source, reasons, target: 'prestasi', media: image, conflict: collision ? { type: 'slug_collision', resolvedAs: slug } : null,
      record: {
        id: deterministicUuid(WORDPRESS_NAMESPACE, `prestasi:${post.ID}`),
        judul: title, slug, kategori, deskripsi: sanitized || truncateWords(title, 400),
        gambarUrl: image, instagramUrl: null, tingkat: deriveTingkat(`${title} ${summary}`),
        tanggal: toDateTime(date),
        createdAt: toDateTime(date), updatedAt: toDateTime(post.post_modified) || toDateTime(date),
      },
    };
  }

  if (category === 'event') {
    const { slug, collision } = assignSlug(base, usedSlugs.event);
    const dateOnly = toDateOnly(date);
    const deskripsi = sanitized || eventSummary(post, sanitized);
    return {
      category, source, reasons, target: 'events', media: image, conflict: collision ? { type: 'slug_collision', resolvedAs: slug } : null,
      record: {
        id: deterministicUuid(WORDPRESS_NAMESPACE, `event:${post.ID}`),
        judul: truncateWords(title, 180), ringkasan: eventSummary(post, sanitized),
        deskripsi, kategori: 'kegiatan', tanggalMulai: dateOnly || null,
        waktuMulai: null, tanggalSelesai: null, waktuSelesai: null,
        lokasi: '', penyelenggara: 'SMK Telkom Purwokerto', gambarUrl: image, linkInformasi: null,
        status: post.post_status === 'publish' ? 'published' : 'draft',
        createdAt: toDateTime(date), updatedAt: toDateTime(post.post_modified) || toDateTime(date),
      },
    };
  }

  return { category: 'needs_review', source, reasons: ['kategori tidak dikenal'], record: null, target: null, media: null, conflict: null };
}

export function emptySlugRegistry() {
  return { berita: new Set(), pengumuman: new Set(), prestasi: new Set(), event: new Set() };
}

export { indexManifest };
