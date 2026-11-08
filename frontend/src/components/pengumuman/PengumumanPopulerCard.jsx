import { useLanguage } from '../../context/LanguageContext';
import { formatPublicDate } from '../../utils/publicContent';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Warna nomor mengikuti lima lingkaran pada sidebar Figma.
const warnaNomor = [
  'bg-[#f5ced2] text-[#9b0011]',
  'bg-[#d9f5ce] text-[#268500]',
  'bg-[#cecff5] text-[#0b11cd]',
  'bg-[#ceebf5] text-[#0b9ccd]',
  'bg-[#f5f2ce] text-[#8f8c69]',
];

// tampilkanLihatSemua dimatikan saat komponen ini menjadi isi halaman
// /pengumuman/populer itu sendiri. Di sana tombolnya akan menunjuk ke halaman
// yang sedang dibuka -- tombol yang diklik tapi tidak ke mana-mana.
const PengumumanPopulerCard = ({ items = [], tampilkanLihatSemua = true }) => {
  const { t, locale } = useLanguage();
  return (
  <div className="rounded-xl bg-white p-4 font-[family-name:var(--font-jakarta)] shadow-card">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[16.63px] font-extrabold leading-[normal] tracking-[.05em] text-dark-900">{t("Pengumuman Terbaru")}</h2>
      {tampilkanLihatSemua && (
        <Link
          to="/pengumuman/populer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary px-2.5 py-1 text-[16.63px] font-extrabold leading-[normal] tracking-[.05em] text-primary transition-colors hover:bg-primary hover:text-white"
        >{t("Lihat Semua")}<ArrowRight className="h-2.5 w-2.5" />
        </Link>
      )}
    </div>

    <ul className="mt-5 space-y-6">
      {(tampilkanLihatSemua ? items.slice(0, 5) : items).map((item, i) => (
        <li key={item.slug}>
          <Link to={`/pengumuman/${item.slug}`} className="flex items-start gap-3">
            <span
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-[38px] font-bold leading-[normal] tracking-[.05em] sm:h-14 sm:w-14 sm:text-[44.35px] ${warnaNomor[i % warnaNomor.length]}`}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16.63px] font-extrabold leading-[normal] tracking-[.05em] text-dark-900">
                {t(item.title)}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-[16.63px] font-extrabold leading-[normal] tracking-[.05em] text-dark-600">
                {formatPublicDate(item.iso, {}, locale)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
  );
};

export default PengumumanPopulerCard;
