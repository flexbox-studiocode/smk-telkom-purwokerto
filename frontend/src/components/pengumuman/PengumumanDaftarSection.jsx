import { useLanguage } from '../../context/LanguageContext';
import { useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import PengumumanFilterBar from './PengumumanFilterBar';
import PengumumanTimelineBar from './PengumumanTimelineBar';
import PengumumanCard from './PengumumanCard';
import PengumumanPopulerCard from './PengumumanPopulerCard';
import { daftarPengumuman } from '../../data/dummyData';

// Lihat catatan tampilkanLihatSemua di PengumumanPopulerCard.
const ITEMS_PER_PAGE = 5;

const PengumumanDaftarSection = ({ items = [], tampilkanLihatSemua = true }) => {
  const { t } = useLanguage();
  const lenis = useLenis();

  const [chip, setChip] = useState('Semua');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const sectionRef = useRef(null);

  // Sama seperti di Berita: tabel `pengumuman` tidak punya kolom kategori,
  // jadi barisan chip-nya dulu berisi sepuluh kategori yang tak satu pun bisa
  // cocok. Sempat ditambal dengan chips={['Semua']} -- satu tombol yang tidak
  // menyaring apa-apa. Sekarang diturunkan dari data, dan hilang selama belum
  // ada yang bisa dibedakan.
  const kategoriChips = useMemo(() => {
    const unik = [...new Set(items.map((item) => item.kategori).filter(Boolean))].sort();
    return unik.length > 1 ? ['Semua', ...unik] : [];
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const byChip = chip === 'Semua' || item.kategori === chip;
      const byText =
        !q || [item.title, item.desc, t(item.title), t(item.desc)].join(' ').toLowerCase().includes(q);
      return byChip && byText;
    });
  }, [chip, query, items, t]);

  // Halaman utama adalah pratinjau; daftar lengkap memakai hasil filter yang sama.
  const totalPages = Math.max(1, Math.ceil(shown.length / ITEMS_PER_PAGE));
  const currentPage = tampilkanLihatSemua ? 1 : Math.min(page, totalPages);
  const pageItems = shown.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const changePage = (nextPage) => {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
    if (lenis && sectionRef.current) lenis.scrollTo(sectionRef.current);
    else sectionRef.current?.scrollIntoView({ block: 'start' });
  };

  return (
    <section ref={sectionRef} id="daftar-pengumuman" className="scroll-mt-24 bg-white pb-8 pt-6 lg:scroll-mt-28 lg:pb-12 lg:pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PengumumanFilterBar
          chip={chip}
          onChip={(value) => { setChip(value); setPage(1); }}
          query={query}
          onQuery={(value) => { setQuery(value); setPage(1); }}
          chips={kategoriChips}
        />

        <div className="mt-5">
          <PengumumanTimelineBar items={items} />
        </div>

        {/* Figma: kartu 1065 px, jarak 72 px, sidebar 565 px. */}
        <div className="mt-7 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1065fr_565fr] lg:gap-x-[4.23%]">
          <div className="@container">
            {shown.length > 0 ? (
              <div className="space-y-4">
                {pageItems.map((item) => (
                  <PengumumanCard key={item.slug} item={item} />
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-xs text-dark-500">{t("Tidak ada pengumuman yang cocok dengan filter itu.")}</p>
            )}

            {!tampilkanLihatSemua && shown.length > 0 && (
              <nav aria-label={t('Pagination pengumuman')} className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-dark-200 px-4 py-2 text-xs font-semibold text-dark-700 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />{t('Sebelumnya')}
                </button>
                <p aria-live="polite" className="text-xs text-dark-600">{t('Halaman {page} dari {total}', { page: currentPage, total: totalPages })}</p>
                <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-dark-200 px-4 py-2 text-xs font-semibold text-dark-700 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  {t('Berikutnya')}<ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            )}

            {tampilkanLihatSemua && (
              <div className="mt-4 flex justify-start">
                <Link
                  to="/pengumuman/semua"
                  className="inline-flex min-h-11 items-center justify-between gap-6 rounded-md border border-primary px-6 py-3 font-[family-name:var(--font-jakarta)] text-[16.63px] font-extrabold leading-[normal] tracking-[.05em] text-primary transition-colors hover:bg-primary hover:text-white sm:w-[47.4%]"
                >
                  {t(daftarPengumuman.ctaText)}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <PengumumanPopulerCard items={items} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PengumumanDaftarSection;
