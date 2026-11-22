// Sanitasi HTML untuk konten arsip WordPress.
//
// Konten WordPress sangat mungkin memuat shortcode, markup builder, dan bahkan
// skrip. Sanitizer ini memakai pendekatan REST (Repair, Escape, Strip, Tag
// allowlist) ala OWASP:
//   1. Buang blok berbahaya beserta isinya (script, style, iframe, form, dll).
//   2. Buang atribut berbahaya (on*, style, srcdoc) dan URL berskema tidak aman.
//   3. Bersihkan shortcode WordPress sebelum sanitasi agar tidak tampil mentah.
//   4. Pertahankan tag aman beserta atribut yang diizinkan.
//   5. Escape kembali karakter < dan > yang tersisa agar tidak terbaca sebagai tag.

import { decodeBasicEntities } from './base.js';

const DANGEROUS_BLOCKS = ['script', 'style', 'iframe', 'form', 'object', 'embed', 'applet', 'template', 'svg', 'math', 'noscript'];
const SAFE_TAGS = new Set([
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's',
  'blockquote', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'span', 'div', 'dl', 'dt', 'dd', 'sup', 'sub', 'small', 'mark',
]);
const SAFE_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan', 'scope',
  'align', 'datetime', 'cite', 'start', 'type', 'class', 'id', 'target', 'rel',
]);
// Skema URL yang diizinkan pada atribut href/src.
const SAFE_URL_SCHEME = /^(?:https?:|mailto:|tel:|#|\/|\.{1,2}\/)/i;

// Mengubah shortcode WordPress menjadi placeholder yang tidak menyesatkan.
//   [gallery ...]                -> dibuang
//   [caption ...]...[/caption]   -> isinya dipertahankan
//   [embed]URL[/embed]           -> dibuang (media tak terverifikasi)
//   shortcode berpasangan lain   -> tag-nya dibuang, isinya dipertahankan
export function stripShortcodes(html) {
  let out = String(html ?? '');
  out = out.replace(/\[\/?(?:gallery|embed|audio|video|playlist|contact-form-7|fusion_[a-z0-9_]+|et_pb_[a-z0-9_]+|vc_[a-z0-9_]+)[^\]]*\]/gi, '');
  out = out.replace(/\[\/?(?:caption|wp_caption|fusion_text|fusion_title|fusion_button|fusion_code)[^\]]*\]/gi, '');
  // Shortcode mandiri sisanya: [name attr="x" /]
  out = out.replace(/\[[a-z][a-z0-9_-]*(?:\s[^\[\]]*)?\/?\]/gi, '');
  // Shortcode berpasangan sisanya: [name]...[/name]
  for (let pass = 0; pass < 3; pass += 1) {
    const before = out;
    out = out.replace(/\[([a-z][a-z0-9_-]*)[^\]]*\]([\s\S]*?)\[\/\1\]/gi, '$2');
    if (before === out) break;
  }
  return out;
}

function safeAttribute(name, value) {
  const lower = name.toLowerCase();
  if (lower.startsWith('on')) return null; // event handler
  if (['style', 'srcdoc', 'formaction', 'xlink:href', 'background'].includes(lower)) return null;
  if (!SAFE_ATTRS.has(lower)) return null;
  if (['href', 'src'].includes(lower)) {
    const decoded = decodeBasicEntities(value).trim();
    if (!SAFE_URL_SCHEME.test(decoded)) return null;
  }
  // Nilai tidak boleh menyisipkan tag baru.
  return value.replace(/[<>]/g, '');
}

// Membersihkan satu atribut-set dari sebuah tag.
function cleanAttrs(attrText) {
  let result = '';
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = attrRe.exec(attrText)) !== null) {
    const [, rawName, dq, sq, bare] = m;
    const value = dq ?? sq ?? bare ?? '';
    const safe = safeAttribute(rawName, value);
    if (safe === null) continue;
    const lower = rawName.toLowerCase();
    if (lower === 'class') result += ` class="${safe}"`;
    else if (lower === 'id') result += ` id="${safe}"`;
    else result += ` ${lower}="${safe.replace(/"/g, '&quot;')}"`;
  }
  return result;
}

export function sanitizeHtml(input) {
  if (input === null || input === undefined) return '';
  let html = stripShortcodes(String(input));

  // 1. Buang blok berbahaya beserta isinya.
  for (const tag of DANGEROUS_BLOCKS) {
    html = html.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
    html = html.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '');
  }
  // Komentar HTML/conditional.
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Buang (unwrap) seluruh tag yang tidak termasuk allowlist, baik pembuka
  //    maupun penutup: isi teks tetap dipertahankan.
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s[^<>]*?)?)\/?>/g, (full, tagRaw) => (SAFE_TAGS.has(tagRaw.toLowerCase()) ? full : ''));

  // 3. Bersihkan atribut pada tag yang diizinkan.
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s[^<>]*?)?)\/?>/g, (full, tagRaw, attrs) => {
    const tag = tagRaw.toLowerCase();
    if (!SAFE_TAGS.has(tag)) return ''; // tidak mungkin, jaga-jaga
    const isClose = full.startsWith('</');
    if (isClose) return `</${tag}>`;
    const selfClosing = ['br', 'hr', 'img', 'col'].includes(tag);
    const cleaned = cleanAttrs(attrs || '');
    if (selfClosing) return tag === 'img' ? `<img${cleaned}>` : `<${tag}${cleaned}>`;
    return `<${tag}${cleaned}>`;
  });

  // 4. Escape sisa < / > yang tak membentuk tag aman.
  html = html.replace(/<(?!\/?[a-z][a-z0-9]*[\s/>])/gi, '&lt;');

  return html.trim();
}
