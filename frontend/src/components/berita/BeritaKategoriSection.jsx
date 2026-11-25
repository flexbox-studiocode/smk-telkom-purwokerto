import { useSiteSettings } from '../../context/SiteSettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatPublicDate } from '../../utils/publicContent';
import { useMemo } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
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
    <section id="kategori-berita" className="bg-white py-8 lg:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h2 className="font-heading text-xl font-bold tracking-tight text-dark-900 sm:text-2xl">
            {t(kategoriBerita.title)}
          </h2>

          {/* Pencarian + urutan */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label className="relative min-w-0 flex-1 sm:flex-none">
              <span className="sr-only">{t(kategoriBerita.searchPlaceholder)}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dark-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => applyFilter('q', e.target.value)}
                placeholder={t(kategoriBerita.searchPlaceholder)}
                className="w-full rounded-full border border-dark-200 bg-white py-2 pl-8 pr-3 text-xs text-dark-700 outline-none transition-colors placeholder:text-dark-400 focus:border-primary sm:w-48"
              />
            </label>

            <label>
              <span className="sr-only">{t("Urutkan berita")}</span>
              <select
                value={sort}
                onChange={(e) => applyFilter('sort', e.target.value, 'terbaru')}
                className="rounded-full border border-dark-200 bg-white px-3 py-2 text-xs text-dark-600 outline-none transition-colors focus:border-primary"
              >
                {kategoriBerita.sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.label)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Chip kategori: hanya muncul bila ada lebih dari satu kategori nyata */}
        {kategoriChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {kategoriChips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => applyFilter('kategori', c, 'Semua')}
                aria-pressed={chip === c}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  chip === c
                    ? 'border-primary bg-primary text-white'
                    : 'border-dark-200 bg-white text-dark-600 hover:border-primary hover:text-primary'
                }`}
              >
                {t(c)}
              </button>
            ))}
          </div>
        )}

        {/* Kartu berita */}
        {shown.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((n) => (
              <article
                key={n.slug || n.title}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_16px_-6px_rgba(17,24,39,0.08)] transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-dark-200 hover:shadow-[0_2px_4px_rgba(17,24,39,0.04),0_12px_28px_-10px_rgba(17,24,39,0.16)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/60"
              >
                <div className="relative overflow-hidden bg-dark-50">
                  <ContentImage variant="berita"
                    src={n.image}
                    alt={t(n.title)}
                    className="aspect-[16/10] w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold leading-none text-primary shadow-sm">
                    {t(n.kategori)}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <p className="flex items-center gap-1.5 text-xs text-dark-500">
                    <time dateTime={n.iso} className="shrink-0">{formatPublicDate(n.iso, { month: 'short' }, locale)}</time>
                    <span aria-hidden="true" className="text-dark-300 lg:max-xl:hidden">&bull;</span>
                    <span className="truncate lg:max-xl:hidden">{t(n.author)}</span>
                  </p>
                  <h3 className="mt-2 line-clamp-3 font-heading text-base font-semibold leading-snug text-dark-900 transition-colors group-hover:text-primary">
                    {t(n.title)}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-dark-600">{t(n.excerpt)}</p>
                  <Link
                    to={`/berita/${n.slug}`}
                    className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-semibold text-primary after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                  >
                    {t("Baca Selengkapnya")}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
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
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-white px-5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-primary"
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
