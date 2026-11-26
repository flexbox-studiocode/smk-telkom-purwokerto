/**
 * Ringkasan teks berbasis kata untuk kartu konten (mis. Prestasi Unggulan).
 *
 * - Teks dipotong pada batas kata sehingga tidak ada kata yang terbelah.
 * - Ellipsis (… ) ditambahkan bila konten dipotong.
 * - Paragraf pendek (<=targetWords) dibiarkan utuh, tidak dipaksa dipotong.
 * - HTML-like tags dihapus secara defensif agar hasil tetap plain text.
 *
 * @param {string} value  - Teks input. Kosong/null/undefined → ''.
 * @param {object} opts
 * @param {number} [opts.targetWords=45] - Batas kata target.
 * @param {number} [opts.minWords=35]    - Batas minimum; pemotongan tidak
 *                                         akan menghasilkan kurang dari ini.
 * @returns {string}
 */
export const summarizeText = (value, { targetWords = 45, minWords = 35 } = {}) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  // Defensif: hapus tag HTML-like sebelum splitting.
  // Menghindari tag rusak jika teks mengandung markup yang tidak sengaja masuk.
  const text = raw.replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/\s+/g, ' ').trim();

  const words = text.split(' ');
  if (words.length <= targetWords) return text;

  const cut = Math.max(minWords, Math.min(targetWords, words.length));
  return `${words.slice(0, cut).join(' ')}…`;
};
