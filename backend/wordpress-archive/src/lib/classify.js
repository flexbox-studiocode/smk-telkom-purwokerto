// Klasifikasi konten WordPress -> model project (skor berbobot).
//
// Prinsip: hanya klasifikasi yang cukup yakin yang otomatis masuk tabel publik.
// Konten ambigu, bertipe struktural (page, revision, nav_menu_item, attachment,
// template builder), atau tanpa sinyal jelas tidak dipaksa menjadi berita/
// prestasi/pengumuman; statusnya `needs_review` atau `skip`.

import { htmlToPlainText } from './base.js';

// Kata kunci berbobot. Bobot tinggi = sinyal kuat untuk kategorinya.
const KEYWORDS = [
  // Prestasi
  [/(?:^|\b)juara(?:\s|\b)/i, 'prestasi', 4],
  [/\b(?:kejuaraan|pemenang|juara umum|meraih (?:juara|medali|prestasi)|raih (?:juara|medali)|medali (?:emas|perak|perunggu))\b/i, 'prestasi', 4],
  [/\b(?:olimpiade|osn|lks|fls2n|kompetisi|turnamen|finalis|runner[ -]?up)\b/i, 'prestasi', 2],
  [/\b(?:peringkat (?:ke|\d)|mengharumkan|berprestasi|membanggakan|apresiasi siswa)\b/i, 'prestasi', 2],
  // Pengumuman
  [/\bpengumuman\b/i, 'pengumuman', 4],
  [/\b(?:diumumkan|pemberitahuan|himbauan|imbauan)\b/i, 'pengumuman', 3],
  [/\b(?:pendaftaran|registrasi|daftar ulang|batas waktu|seleksi|hasil seleksi|pengambilan (?:ijazah|rapor|dokumen)|persyaratan|syarat dan ketentuan)\b/i, 'pengumuman', 2],
  [/\b(?:jadwal|pengisian|alur pendaftaran|informasi pendaftaran)\b/i, 'pengumuman', 1],
  // Event (hanya gelaran/kegiatan terjadwal yang jelas)
  [/\b(?:mpls|masa pengenalan|class ?meeting|study tour|open house|wisuda|workshop|seminar|webinar|pelatihan|sosialisasi|perayaan|peringatan (?:hari|hut|maulid|idul|kemerdekaan)|upacara|apel (?:pagi|bendera)|study banding|donor darah|baksos|bakti sosial|lomba antar|festival|pentas|perkemahan|diklat|lomba\b)\b/i, 'event', 2],
  [/\b(?:agenda|acara|kegiatan)\b/i, 'event', 1],
  // Berita umum
  [/\b(?:mou|penandatanganan|kerja ?sama|kerjasama|kolaborasi|kemitraan|peresmian|launching|meluncurkan|resmikan|menjalin)\b/i, 'berita', 2],
  [/\b(?:profil alumni|testimoni|unggulan|terbaru|dalam rangka|menyelenggarakan|mengadakan|melaksanakan)\b/i, 'berita', 1],
];

const NON_CONTENT_TYPES = new Set([
  'attachment', 'revision', 'nav_menu_item', 'custom_css', 'customize_changeset',
  'oembed_cache', 'user_request', 'wp_block', 'wp_global_styles', 'wp_navigation',
  'wp_template', 'wp_template_part', 'elementor_library', 'elementor_font',
  'elementor_icons', 'fusion_element', 'fusion_template', 'fusion_tb_layout',
  'fusion_tb_section', 'acf-field', 'acf-field-group', 'wpcf7_contact_form',
  'itsec-dashboard', 'itsec-dash-card', 'envato_tk_import', 'elementskit_template',
  'shop_order', 'shop_coupon',
]);

const DEMO_SIGNAL = /(theme-fusion\.com|avada theme|university admission|join over \d|lorem ipsum|dummy content)/i;

// Judul yang secara eksplisit menandakan aset grafis, bukan artikel.
const ASSET_TITLE = /^\s*(logo|ikon|icon|banner|header|background|badge|avatar|sampul|cover)\b/i;

function isBuilderDominated(html) {
  const text = String(html ?? '');
  if (!text) return false;
  const total = text.length;
  const matches = text.match(/\[[a-z][a-z0-9_-]*[^\]]*\]/gi) || [];
  const shortcodeChars = matches.join('').length;
  if (total > 400 && shortcodeChars / total > 0.35) return true;
  return matches.length >= 25 && total > 400;
}

// Skor sinyal tipe untuk sebuah haystack.
export function scorePost(haystack) {
  const scores = { prestasi: 0, pengumuman: 0, event: 0, berita: 0 };
  for (const [re, category, weight] of KEYWORDS) {
    if (re.test(haystack)) scores[category] += weight;
  }
  return scores;
}

export function classifyPost(post) {
  const type = String(post.post_type || 'post');
  const status = String(post.post_status || 'publish');
  const mime = String(post.post_mime_type || '');
  const title = String(post.post_title ?? '');
  const plain = htmlToPlainText(post.post_content ?? '');
  const haystack = `${title} ${plain}`;

  if (NON_CONTENT_TYPES.has(type)) {
    return { category: 'skip', reasons: [`post_type=${type} bukan konten publik`] };
  }
  if (status === 'inherit' || mime) {
    return { category: 'skip', reasons: [`status=${status}${mime ? `, mime=${mime}` : ''} (attachment/varian)`] };
  }
  if (type === 'page') {
    return { category: 'needs_review', reasons: ['page tidak otomatis dimigrasikan'] };
  }

  const builderDominated = isBuilderDominated(post.post_content);
  const demo = DEMO_SIGNAL.test(plain) || DEMO_SIGNAL.test(title);
  const hasText = plain.length >= 20;

  if (!hasText || builderDominated || demo) {
    const reasons = [];
    if (!hasText) reasons.push('konten teks kosong/terlalu pendek');
    if (builderDominated) reasons.push('konten didominasi markup builder/shortcode');
    if (demo) reasons.push('konten menyerupai template/demo');
    if (type !== 'post') reasons.push(`post_type=${type}`);
    return { category: 'needs_review', reasons };
  }

  const scores = scorePost(haystack);
  const titleScores = scorePost(title);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topCategory, topScore] = ranked[0];
  const [secondCategory, secondScore] = ranked[1];

  // Judul aset grafis tidak pernah menjadi konten editorial.
  if (ASSET_TITLE.test(title)) {
    return { category: 'needs_review', reasons: ['judul menandakan aset grafis (logo/banner), bukan artikel'] };
  }

  if (topScore === 0 || (topScore === 1 && topCategory !== 'berita')) {
    // Post publish dengan narasi substansial dianggap berita umum; konten pendek
    // tanpa sinyal tidak dipaksa menjadi berita.
    if (type === 'post' && status === 'publish' && plain.length >= 500 && !ASSET_TITLE.test(title)) {
      return { category: 'berita', reasons: [`post publish naratif (${plain.length} karakter) tanpa sinyal tipe kuat`] };
    }
    return { category: 'needs_review', reasons: ['tidak ada sinyal tipe yang kuat / konten terlalu pendek'] };
  }

  const hasTitleSignal = (cat) => titleScores[cat] >= 2;
  const hasStrongTitleSignal = (cat) => titleScores[cat] >= 4;
  const clear = topScore >= 4 && topScore >= secondScore + 2;

  // Kategori non-berita memerlukan sinyal pada judul agar artikel acara yang
  // sekadar menyebut istilah prestasi/pengumuman tidak salah klasifikasi.
  if (['prestasi', 'pengumuman', 'event'].includes(topCategory)) {
    if (topScore >= 2 && hasTitleSignal(topCategory) && topScore >= secondScore) {
      return { category: topCategory, reasons: [`judul ${topCategory}=${titleScores[topCategory]}, skor ${topCategory}=${topScore}`] };
    }
    // Judul tanpa sinyal atau skor terlalu rendah: jangan menebak.
    if (type === 'post' && status === 'publish' && plain.length >= 500 && topScore < 4 && !hasTitleSignal('berita')) {
      return { category: 'berita', reasons: [`naratif (${plain.length} karakter), sinyal ${topCategory} lemah`] };
    }
    return { category: 'needs_review', reasons: [`kategori ${topCategory} tanpa sinyal judul yang cukup (skor ${topScore})`] };
  }

  if (clear || (topScore >= 2 && hasStrongTitleSignal(topCategory))) {
    return { category: topCategory, reasons: [`skor ${topCategory}=${topScore}, ${secondCategory}=${secondScore}`] };
  }

  return {
    category: 'needs_review',
    reasons: [`sinyal tidak konklusif (${ranked.map(([k, v]) => `${k}=${v}`).join(', ')})`],
  };
}

export const CATEGORY_PRIORITY = ['prestasi', 'pengumuman', 'event', 'berita'];
