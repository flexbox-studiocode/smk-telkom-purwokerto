import { useLanguage } from '../../context/LanguageContext';
import { formatPublicDate } from '../../utils/publicContent';
import { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { galeriPrestasi } from '../../data/dummyData';
import ContentImage from '../ContentImage';

// Lihat catatan tampilkanLihatSemua di PengumumanPopulerCard.
const PrestasiGaleriSection = ({ items = [], tampilkanLihatSemua = true }) => {
  const { t, locale } = useLanguage();

  const [filter, setFilter] = useState('Semua');
  const [query, setQuery] = useState('');

  const sourceItems = items;
  // Filter di sini sudah benar sejak awal -- diturunkan dari data, bukan daftar
  // tetap. Yang ditambahkan: barisnya disembunyikan kalau tidak ada yang bisa
  // dibedakan, supaya tidak menyisakan tombol "Semua" tunggal yang tak
  // menyaring apa-apa. Sama seperti di Berita, Pengumuman, dan BKK.
  const nilaiUnik = [...new Set(sourceItems.flatMap((item) => [item.level, item.kategori].filter(Boolean)))].sort();
  const filters = nilaiUnik.length > 1 ? ['Semua', ...nilaiUnik] : [];

  const shown = (() => {
    const q = query.trim().toLowerCase();
    return sourceItems.filter((item) => {
      const byTag = filter === 'Semua' || item.tags?.includes(filter) || item.level === filter || item.kategori === filter;
      const byText = !q || [item.title, item.level, t(item.title), t(item.level)].join(' ').toLowerCase().includes(q);
      return byTag && byText;
    });
  })();

  return (
    <section id="galeri-prestasi" className="bg-white py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 [container-type:inline-size]">
        <h2 className="font-heading text-[clamp(1.25rem,2.296cqw,2.5rem)] font-extrabold tracking-[.05em] text-dark-900">
          {t(galeriPrestasi.title)}
        </h2>

        {/* Filter + pencarian */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full border px-4 py-1.5 text-[clamp(.6875rem,1.378cqw,1.5rem)] font-semibold tracking-[.12em] transition-colors ${
                filter === f
                  ? 'border-primary bg-primary text-white'
                  : 'border-dark-200 bg-white text-dark-600 hover:border-primary hover:text-primary'
              }`}
            >
              {t(f)}
            </button>
          ))}

          <label className="relative ml-auto">
            <span className="sr-only">{t("Cari prestasi")}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dark-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Cari prestasi…")}
              className="w-44 rounded-full border border-dark-200 py-1.5 pl-8 pr-3 text-[11px] text-dark-700 outline-none transition-colors placeholder:text-dark-400 focus:border-primary"
            />
          </label>
        </div>

        {/* Kartu galeri */}
        {shown.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {shown.map((item) => (
              <Link
                key={item.title}
                to={`/prestasi/${item.slug}`}
                className="group flex flex-col overflow-hidden [container-type:inline-size] rounded-xl border border-dark-100 bg-white shadow-card transition-transform hover:-translate-y-1"
              >
                <div className="relative overflow-hidden">
                  <ContentImage
                    src={item.image}
                    alt={t(item.imageAlt || item.title)}
                    className="w-full aspect-[16/10] object-cover object-top transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-primary px-1.5 py-0.5 text-[clamp(.5rem,4.333cqw,.8125rem)] font-semibold text-white">
                    {t(item.level)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col px-3 py-2.5">
                  <h3 className="font-heading text-[clamp(.625rem,6.667cqw,1.25rem)] font-bold leading-normal text-dark-900">
                    {t(item.title)}
                  </h3>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                    <p className="text-[clamp(.5625rem,5cqw,.9375rem)] font-medium text-dark-400">{formatPublicDate(item.iso, {}, locale)}</p>
                    <ArrowRight className="h-3 w-3 flex-shrink-0 text-primary" />
                  </div>
                  {item.imageNote && (
                    <p className="mt-1 text-[8px] leading-snug text-dark-400">{t(item.imageNote)}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-center text-xs text-dark-500">{t("Tidak ada prestasi yang cocok dengan filter itu.")}</p>
        )}

        {tampilkanLihatSemua && (
          <div className="mt-7 flex justify-center">
            <Link
              to="/prestasi/galeri"
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-white px-5 py-2 text-[clamp(.6875rem,.861cqw,.9375rem)] font-extrabold tracking-[.12em] text-primary transition-colors hover:bg-primary hover:text-white"
            >
              {t(galeriPrestasi.ctaText)}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default PrestasiGaleriSection;
