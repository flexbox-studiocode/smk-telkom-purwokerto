export const PAGE_META = {
  '/': ['SMK Telkom Purwokerto', 'SMK Telkom Purwokerto, sekolah vokasi teknologi di Purwokerto.'],
  '/fasilitas': ['Fasilitas Sekolah | SMK Telkom Purwokerto', 'Jelajahi ruang kelas, laboratorium, dan perpustakaan SMK Telkom Purwokerto.'],
  '/profil-sekolah': ['Profil Sekolah | SMK Telkom Purwokerto', 'Kenali profil, visi misi, dan fasilitas SMK Telkom Purwokerto.'],
  '/profil-sekolah/guru': ['Profil Guru | SMK Telkom Purwokerto', 'Kenali kepala sekolah, guru, dan tenaga pendidik SMK Telkom Purwokerto.'],
  '/jurusan': ['Jurusan SMK Telkom Purwokerto', 'Pilih program keahlian teknologi sesuai minat dan bakatmu.'],
  '/prestasi': ['Prestasi SMK Telkom Purwokerto', 'Lihat prestasi dan pencapaian siswa SMK Telkom Purwokerto.'],
  '/bkk': ['BKK SMK Telkom Purwokerto', 'Informasi lowongan kerja dan career center SMK Telkom Purwokerto.'],
  '/berita': ['Berita SMK Telkom Purwokerto', 'Berita terbaru dari SMK Telkom Purwokerto.'],
  '/pengumuman': ['Pengumuman SMK Telkom Purwokerto', 'Pengumuman resmi SMK Telkom Purwokerto.'],
  '/kalender': ['Kalender Kegiatan | SMK Telkom Purwokerto', 'Jelajahi kalender kegiatan, lomba, dan acara SMK Telkom Purwokerto.'],
  '/spmb': ['Informasi SPMB | SMK Telkom Purwokerto', 'Informasi alur, jalur penerimaan, berkas, dan pendaftaran SPMB SMK Telkom Purwokerto.'],
  '/nexa': ['NEXA AI | SMK Telkom Purwokerto', 'Asisten informasi umum SMK Telkom Purwokerto.'],
  '/stela': ['STELA — Akses NEXA AI | SMK Telkom Purwokerto', 'Akses asisten NEXA melalui halaman STELA untuk informasi umum SMK Telkom Purwokerto.'],
  '/nexttel': ['NextTel | SMK Telkom Purwokerto', 'Cari jurusan yang sesuai dengan minatmu.'],
  '/ekstrakurikuler': ['Ekstrakurikuler | SMK Telkom Purwokerto', 'Kegiatan pengembangan minat, bakat, dan karakter siswa.'],
  '/login': ['Login Admin | SMK Telkom Purwokerto', 'Halaman login administrator website sekolah.'],
  '/dashboard': ['Dashboard Admin | SMK Telkom Purwokerto', 'Kelola konten dan data website sekolah.'],
  '/kebijakan-privasi': ['Kebijakan Privasi | SMK Telkom Purwokerto', 'Kebijakan privasi dan perlindungan data website SMK Telkom Purwokerto.'],
  '/galeri': ['Galeri Kegiatan | SMK Telkom Purwokerto', 'Dokumentasi kegiatan sekolah SMK Telkom Purwokerto.'],
  '/bkk/panduan': ['Panduan Karier | SMK Telkom Purwokerto', 'Panduan persiapan karier untuk siswa SMK Telkom Purwokerto.'],
  '/jurusan/faq': ['FAQ Jurusan | SMK Telkom Purwokerto', 'Pertanyaan dan jawaban tentang program keahlian SMK Telkom Purwokerto.'],
  '/jurusan/perbandingan': ['Perbandingan Jurusan | SMK Telkom Purwokerto', 'Bandingkan program keahlian SMK Telkom Purwokerto.'],
  '/pengumuman/populer': ['Pengumuman Terbaru | SMK Telkom Purwokerto', 'Pengumuman resmi sekolah yang terbaru, diurutkan berdasarkan tanggal.'],
  '/pengumuman/semua': ['Semua Pengumuman | SMK Telkom Purwokerto', 'Seluruh pengumuman resmi sekolah, dari yang terbaru sampai yang terlama.'],
  '/pengumuman/timeline': ['Timeline Pengumuman | SMK Telkom Purwokerto', 'Pengumuman sekolah disusun berdasarkan tanggal pengumuman.'],
  '/pengumuman/informasi-penting': ['Informasi Penting | SMK Telkom Purwokerto', 'Informasi sekolah untuk calon siswa, siswa, dan orang tua.'],
  '/berita/trending': ['Berita Trending | SMK Telkom Purwokerto', 'Berita sekolah yang paling banyak dibaca belakangan ini.'],
  '/berita/agenda': ['Agenda Sekolah | SMK Telkom Purwokerto', 'Kegiatan dan agenda SMK Telkom Purwokerto.'],
  '/prestasi/galeri': ['Galeri Prestasi | SMK Telkom Purwokerto', 'Dokumentasi pencapaian siswa SMK Telkom Purwokerto.'],
};

// Deployment URL already used by adminProfilSekolah; override only for a domain migration.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://smk-telkom-purwokerto.vercel.app').replace(/\/$/, '');
export const OG_IMAGE = `${SITE_URL}/og-school.jpg`;
const schoolId = `${SITE_URL}/#school`;
const websiteId = `${SITE_URL}/#website`;
let retainedSchool; // Preserve known identity across private/noindex SPA screens.

// Use the same identity-based summary in browser navigation and static HTML.
export function detailDescription({ title, lead, subtitle }) {
  const summary = (lead || subtitle || '').replace(/\s+/g, ' ').trim();
  return summary && !summary.includes(title) ? `${title} — ${summary}` : summary || title;
}

export function articleMetadata(item) {
  return {
    headline: item.title,
    // Author entity type is not verified; do not turn an editorial label into a Person.
    ...(item.image && /^https?:\/\//.test(item.image) ? { image: [item.image] } : {}),
    // created_at on imported records is not proof of the original publication date.
  };
}

export function pageMetadata({ pathname, title, description, indexable = true, school, breadcrumbs, article }) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const url = new URL(path, `${SITE_URL}/`).href;
  const graph = indexable ? [
    { '@type': 'School', '@id': schoolId, name: 'SMK Telkom Purwokerto', url: `${SITE_URL}/`, ...(school || {}) },
    { '@type': 'WebSite', '@id': websiteId, name: 'SMK Telkom Purwokerto', url: `${SITE_URL}/`, publisher: { '@id': schoolId } },
    { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description, isPartOf: { '@id': websiteId }, about: { '@id': schoolId }, ...(breadcrumbs ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}) },
    ...(article ? [{ '@type': 'Article', '@id': `${url}#article`, ...article, mainEntityOfPage: { '@id': `${url}#webpage` }, publisher: { '@id': schoolId } }] : []),
    ...(breadcrumbs ? [{ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: breadcrumbs.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: new URL(item.path, `${SITE_URL}/`).href })) }] : []),
  ] : [];
  return { title, description, url, indexable, ogType: article && indexable ? 'article' : 'website', jsonLd: { '@context': 'https://schema.org', '@graph': graph } };
}

export function applyPageMetadata(options) {
  const metadata = pageMetadata(options);
  document.title = metadata.title;
  const upsert = (selector, tag, attributes) => {
    const matches = [...document.head.querySelectorAll(selector)];
    const node = matches.shift() || document.createElement(tag);
    matches.forEach(duplicate => duplicate.remove());
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (!node.isConnected) document.head.append(node);
    return node;
  };
  for (const [name, content] of Object.entries({ description: metadata.description, robots: metadata.indexable ? 'index, follow' : 'noindex, follow', 'twitter:card': 'summary_large_image', 'twitter:title': metadata.title, 'twitter:description': metadata.description, 'twitter:image': OG_IMAGE })) {
    upsert(`meta[name="${name}"]`, 'meta', { name, content });
  }
  for (const [property, content] of Object.entries({ 'og:title': metadata.title, 'og:description': metadata.description, 'og:type': metadata.ogType, 'og:image': OG_IMAGE, 'og:url': metadata.url })) {
    upsert(`meta[property="${property}"]`, 'meta', { property, content });
  }
  if (metadata.indexable) upsert('link[rel="canonical"]', 'link', { rel: 'canonical', href: metadata.url });
  else document.querySelectorAll('link[rel="canonical"]').forEach(node => node.remove());
  const script = upsert('script[data-school-schema]', 'script', { type: 'application/ld+json', 'data-school-schema': '' });
  // Keep build-time school contact fields when updating the same graph in the browser.
  let previousSchool;
  try { previousSchool = JSON.parse(script.textContent || '{}')['@graph']?.find(node => node['@type'] === 'School'); }
  catch { /* A stale or malformed graph must not prevent metadata repair. */ }
  if (previousSchool?.['@id'] === schoolId) retainedSchool = previousSchool;
  previousSchool = retainedSchool;
  if (previousSchool && metadata.indexable) metadata.jsonLd['@graph'][0] = previousSchool;
  const trail = document.querySelector('main nav[aria-label="Jejak navigasi"], main nav[aria-label="Breadcrumb"]');
  const breadcrumbLinks = [...(trail?.querySelectorAll('a') || [])];
  if (metadata.indexable && breadcrumbLinks.length) {
    const breadcrumbs = breadcrumbLinks.map(link => ({ name: link.textContent.trim(), path: new URL(link.href).pathname }));
    const current = trail.querySelector('[aria-current="page"]');
    if (current) breadcrumbs.push({ name: current.textContent.trim(), path: options.pathname });
    if (breadcrumbs.length >= 2) metadata.jsonLd = pageMetadata({ ...options, breadcrumbs, school: previousSchool }).jsonLd;
  }
  script.textContent = JSON.stringify(metadata.jsonLd).replace(/</g, '\\u003c');
}
