import { useLanguage } from '../../context/LanguageContext';
import { Search } from 'lucide-react';
import { pengumumanFilter } from '../../data/dummyData';

// `chips` sengaja kosong secara bawaan: barisnya hanya pantas muncul kalau
// memang ada kategori yang bisa dibedakan (lihat PengumumanDaftarSection).
const PengumumanFilterBar = ({ chip, onChip, query, onQuery, chips = [] }) => {
  const { t } = useLanguage();
  return (
  <div className="flex flex-wrap items-center gap-2">
    {chips.map((c) => (
      <button
        key={c}
        type="button"
        onClick={() => onChip(c)}
        aria-pressed={chip === c}
        className={`min-w-[62px] rounded-full px-3 py-2 ${c === 'Semua' ? 'text-[19.4px]' : 'text-[13.86px]'} font-bold leading-[normal] tracking-[.05em] transition-colors ${
          chip === c
            ? 'bg-primary text-white'
            : 'border border-dark-200 text-dark-600 hover:border-primary hover:text-primary'
        }`}
      >
        {t(c)}
      </button>
    ))}

    <label className="relative ml-auto w-full sm:w-auto">
      <span className="sr-only">{t(pengumumanFilter.searchPlaceholder)}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dark-600" />
      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={t(pengumumanFilter.searchPlaceholder)}
        className="min-h-11 w-full scroll-mt-24 rounded-lg border border-dark-200 py-2 pl-8 pr-3 text-[16.63px] font-bold leading-[normal] tracking-[.05em] text-dark-900 outline-none transition-colors placeholder:text-dark-600 focus:border-primary sm:w-[220px] lg:scroll-mt-28"
      />
    </label>
  </div>
  );
};

export default PengumumanFilterBar;
