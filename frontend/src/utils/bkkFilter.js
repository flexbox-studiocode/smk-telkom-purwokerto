export const BKK_CATEGORIES = ['LKS', 'Robotik', 'Programming', 'UI/UX', 'AI', 'Game', 'Networking'];

const bidang = {
  Nasional: /\b(nasional|national)\b/i,
  Internasional: /\b(internasional|international)\b/i,
  LKS: /\b(lks|lomba kompetensi siswa)\b/i,
  Robotik: /\brobot(?:ik|ics)?\b/i,
  Programming: /\b(software|backend|frontend|full[ -]?stack|programming|programmer|pemrograman|web developer)\b/i,
  'UI/UX': /\b(ui|ux|user interface|user experience)\b/i,
  AI: /\b(ai|artificial intelligence|machine learning|kecerdasan buatan)\b/i,
  Game: /\b(game|gim)\b/i,
  Networking: /\b(network(?:ing)?|jaringan|tkj)\b/i,
};

// shortcut: BKK belum memiliki kolom kategori; gunakan tag eksplisit dan bidang
// yang disebut di posisi/deskripsi, pindah ke kategori CMS saat kolomnya tersedia.
export const kategoriBkk = (item) => {
  const explicit = [item.kategori, ...(item.tags || [])].filter(Boolean);
  const text = [item.role, item.meta, item.deskripsi].filter(Boolean).join(' ');
  return [...new Set([...explicit, ...Object.keys(bidang).filter((key) => bidang[key].test(text))])];
};

// Pilihan dropdown diturunkan dari lowongan yang benar-benar ada, bukan daftar
// tetap. Daftar tetap menawarkan kota yang tidak punya lowongan sama sekali,
// sekaligus menyembunyikan kota yang punya.
export const opsiFilter = (items = []) => {
  const unik = (ambil) => [...new Set(items.map(ambil).filter(Boolean))].sort();
  return {
    lokasiOptions: unik((job) => job.lokasi),
    tipeOptions: unik((job) => job.tipe_pekerjaan),
  };
};

// Semua kriteria di-AND-kan: lowongan harus lolos semuanya. Kriteria yang
// kosong berarti "tidak menyaring".
export const saringLowongan = (items = [], { keyword = '', lokasi = '', tipe = '', kategori = '' } = {}) => {
  const q = keyword.trim().toLowerCase();
  return items.filter((job) => {
    const cocokTeks =
      !q ||
      [job.role, job.company, job.name, job.meta, job.deskripsi, ...(job.tags || [])]
        .some((text) => text?.toLowerCase().includes(q));
    // Cocok persis pada kolom aslinya, bukan `includes` pada array turunan:
    // lokasi "Jakarta" tidak boleh ikut menangkap "Jakarta Selatan" hanya
    // karena substring-nya sama.
    const cocokLokasi = !lokasi || job.lokasi === lokasi;
    const cocokTipe = !tipe || job.tipe_pekerjaan === tipe;
    const cocokKategori = !kategori || kategoriBkk(job).some((value) => value.toLowerCase() === kategori.toLowerCase());
    return cocokTeks && cocokLokasi && cocokTipe && cocokKategori;
  });
};
