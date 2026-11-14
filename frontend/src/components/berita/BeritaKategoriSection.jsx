import { useSiteSettings } from '../../context/SiteSettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatPublicDate } from '../../utils/publicContent';
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { kategoriBerita } from '../../data/dummyData';
import ContentImage from '../ContentImage';
import SearchResultStatus from '../SearchResultStatus';

const BeritaKategoriSection = ({ items = [], children }) => {
  const { t, locale } = useLanguage();
  const { settings } = useSiteSettings();
  const perPage = settings?.news_page_size ?? kategoriBerita.perPage;

  const [params, setParams] = useSearchParams();
  const chip = params.get('kategori') || 'Semua';
  const query = params.get('q') || '';
  const sort = params.get('sort') === 'terlama' ? 'terlama' : 'terbaru';
  const count = Number(params.get('jumlah'));
  const shownCount = Number.isSafeInteger(count) && count > 0
    ? Math.max(perPage, Math.min(count, 10000)) : perPage;
  const sourceItems = items;

  // Chip dulu diambil dari daftar tetap sepuluh kategori (Prestasi, Sekolah,
  // PPDB, ...), padahal tabel `berita` tidak punya kolom kategori sama sekali:
  // setiap berita berkategori "Berita". Jadi sembilan dari sepuluh chip itu
  // dijamin memulangkan halaman kosong.
  //
  // Sekarang chip diturunkan dari data yang benar-benar ada -- pola yang sama
  // dengan PrestasiGaleriSection -- dan barisnya disembunyikan selama belum ada
  // yang bisa dibedakan. Begitu kolom kategori ditambahkan, chip muncul sendiri.
  const kategoriChips = useMemo(() => {
    const unik = [...new Set(sourceItems.map((n) => n.kategori).filter(Boolean))].sort();
    return unik.length > 1 ? ['Semua', ...unik] : [];
  }, [sourceItems]);

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sourceItems.filter((n) => {
      const byChip = chip === 'Semua' || n.kategori === chip;
      const byText =
        !q || [n.title, n.excerpt, t(n.title), t(n.excerpt)].join(' ').toLowerCase().includes(q);
      return byChip && byText;
    });
    return [...list].sort((a, b) =>
      sort === 'terbaru' ? b.iso.localeCompare(a.iso) : a.iso.localeCompare(b.iso)
    );
  }, [chip, query, sort, sourceItems, t]);

  const shown = matched.slice(0, shownCount);
  const hasMore = shownCount < matched.length;

  // Setiap perubahan filter mengembalikan jumlah kartu ke halaman pertama,
  // supaya "Muat Lebih Banyak" tidak membawa sisa hitungan filter sebelumnya.
  const applyFilter = (key, value, defaultValue = '') => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value === defaultValue) next.delete(key);
      else next.set(key, value);
      next.delete('jumlah');
      return next;
    }, { replace: true });
  };
  const setShownCount = (value) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value === perPage) next.delete('jumlah');
      else next.set('jumlah', String(value));
      return next;
    }, { replace: true });
  };

  return (
    <>
    <section id="kategori-berita" className="bg-white py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-dark-900">
          {t(kategoriBerita.title)}
        </h2>

        {/* Chip kategori + pencarian + urutan */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {kategoriChips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => applyFilter('kategori', c, 'Semua')}
              aria-pressed={chip === c}
              className={`rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
                chip === c
                  ? 'border-primary bg-primary text-white'
                  : 'border-dark-200 bg-white text-dark-600 hover:border-primary hover:text-primary'
              }`}
            >
              {t(c)}
            </button>
          ))}

          <label className="relative ml-auto">
            <span className="sr-only">{t(kategoriBerita.searchPlaceholder)}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dark-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => applyFilter('q', e.target.value)}
              placeholder={t(kategoriBerita.searchPlaceholder)}
              className="w-40 rounded-full border border-dark-200 py-1.5 pl-8 pr-3 text-[11px] font-medium tracking-figma-copy text-dark-700 outline-none transition-colors placeholder:text-dark-400 focus:border-primary"
            />
          </label>

          <label>
            <span className="sr-only">{t("Urutkan berita")}</span>
            <select
              value={sort}
              onChange={(e) => applyFilter('sort', e.target.value, 'terbaru')}
              className="rounded-full border border-dark-200 px-3 py-1.5 text-[11px] font-medium tracking-figma-copy text-dark-600 outline-none transition-colors focus:border-primary"
            >
              {kategoriBerita.sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.label)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Kartu berita */}
        {shown.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((n) => (
              <article
                key={n.title}
                className="group flex flex-col overflow-hidden rounded-xl border border-dark-100 bg-white shadow-card transition-transform hover:-translate-y-1"
              >
                <div className="relative overflow-hidden">
                  <ContentImage
                    src={n.image}
                    alt={t(n.title)}
                    className="w-full aspect-[16/10] object-cover object-top transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[11px] font-semibold tracking-figma-copy text-white">
                    {t(n.kategori)}
                  </span>
                </div>

                <div className="flex flex-1 flex-col px-3 py-3">
                  <h3 className="font-heading text-[11px] font-bold leading-snug text-dark-900">
                    {t(n.title)}
                  </h3>
                  <p className="mt-1.5 text-xs font-medium tracking-figma-copy text-dark-500">
                    {formatPublicDate(n.iso, {}, locale)} &nbsp;·&nbsp; {t(n.author)}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium leading-[normal] tracking-figma-copy text-dark-500">{t(n.excerpt)}</p>
                  <Link
                    to={`/berita/${n.slug}`}
                    className="mt-auto pt-3 text-[11px] font-extrabold tracking-figma-copy text-primary hover:underline"
                  >{t("Baca Selengkapnya")}</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-center text-xs text-dark-500">{t("Tidak ada berita yang cocok dengan filter itu.")}</p>
        )}

        {/* Navigasi & muat lebih banyak */}
        <div className="mt-7 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => setShownCount(perPage)}
            disabled={shownCount <= perPage}
            aria-label={t("Kembali ke berita awal")}
            className="relative text-primary transition-opacity before:absolute before:-inset-2 before:content-[''] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setShownCount(shownCount + perPage)}
            disabled={!hasMore}
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-white px-4 py-2 text-[11px] font-extrabold tracking-figma-copy text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-primary"
          >
            {t(kategoriBerita.ctaText)}
          </button>

          <button
            type="button"
            onClick={() => setShownCount(shownCount + perPage)}
            disabled={!hasMore}
            aria-label={t("Berita berikutnya")}
            className="relative text-primary transition-opacity before:absolute before:-inset-2 before:content-[''] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <SearchResultStatus className="mt-3 text-center text-xs text-dark-500" message={t('Menampilkan {shown} dari {total} berita', { shown: shown.length, total: matched.length })} />
      </div>
    </section>
    {/* Teruskan hasil yang terlihat tanpa menyimpan salinan state di halaman induk. */}
    {children?.(shown)}
    </>
  );
};

export default BeritaKategoriSection;
