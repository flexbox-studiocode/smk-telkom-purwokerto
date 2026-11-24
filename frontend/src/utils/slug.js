// Judul -> potongan URL. Dipakai untuk merakit tautan detail dari data dummy,
// jadi setiap kartu punya alamatnya sendiri tanpa perlu menulis slug satu per
// satu di dummyData.js. Aman untuk judul non-ASCII: diakritik diurai (NFKD)
// lalu tanda kombinasinya dibuang, sisanya menjadi tanda hubung.
export const slugify = (text) =>
  String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
