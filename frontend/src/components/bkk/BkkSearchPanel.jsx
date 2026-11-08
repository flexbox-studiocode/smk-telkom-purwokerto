import { useLanguage } from '../../context/LanguageContext';
import { ChevronDown } from 'lucide-react';
import { BKK_CATEGORIES, opsiFilter } from '../../utils/bkkFilter';
import companyImage from '../../assets/bkk/search/company.png';
import companyOutline from '../../assets/bkk/search/company-outline.png';
import talentImage from '../../assets/bkk/search/talent.png';
import talentPhoto from '../../assets/bkk/search/talent-photo.png';

const controlClass = 'h-11 w-full min-w-0 rounded-md border border-dark-400 bg-white px-3 text-[12.47px] font-semibold leading-[normal] tracking-[.08em] text-dark-700 outline-none placeholder:text-dark-600 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 lg:h-12';

const BkkSearchPanel = ({ talent = false, items, filters, onChange, onSubmit, resultsId }) => {
  const { t } = useLanguage();
  const id = talent ? 'talenta' : 'perusahaan';
  const { lokasiOptions, tipeOptions } = opsiFilter(items);
  const categories = talent ? BKK_CATEGORIES : ['Nasional', 'Internasional', ...BKK_CATEGORIES];
  const keywordLabel = talent ? 'Cari Talenta, Developer, Engineer' : 'Cari Posisi, Perusahaan, atau Skill';
  const active = Object.values(filters).some(Boolean);
  const accent = t(talent ? 'Talenta' : 'Perusahaan');
  const [headingStart, headingEnd] = t('Temukan {target} Terbaik').split('{target}');
  const select = (name, label, options) => (
    <label className="relative block min-w-0">
      <span className="sr-only">{t(label)}</span>
      <select className={`${controlClass} appearance-none pr-10`} value={filters[name]} onChange={(event) => onChange({ ...filters, [name]: event.target.value })} aria-controls={resultsId}>
        <option value="">{t(label)}</option>
        {options.map((option) => <option key={option} value={option}>{t(option)}</option>)}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-dark-600" />
    </label>
  );

  return (
    <section aria-labelledby={`${id}-title`} data-bkk-search={id} className="relative rounded-2xl border border-dark-200 bg-white px-5 pb-6 pt-3 shadow-card sm:px-8 lg:pb-8">
      <div className="mb-4 flex min-h-12 items-end gap-4 sm:gap-6">
        <div aria-hidden="true" className="relative -mt-14 h-[84px] w-[104px] shrink-0 sm:h-[104px] sm:w-[128px]">
          <div className="absolute inset-x-0 bottom-0 h-[76px] rounded-xl bg-linear-to-b from-transparent from-40% to-primary sm:h-[94px]" />
          {talent ? (
            <>
              <img src={talentImage} alt="" width="204" height="252" className="absolute bottom-0 left-1/2 h-auto w-[82px] -translate-x-1/2 sm:w-[102px]" />
              <div className="absolute bottom-0.5 left-1/2 h-[94px] w-[76px] -translate-x-1/2 overflow-hidden sm:h-[117.5px] sm:w-[95px]">
                <img src={talentPhoto} alt="" className="block h-auto w-full" />
              </div>
            </>
          ) : (
            <div className="absolute inset-x-0 bottom-0 aspect-[204/156] overflow-hidden rounded-b-xl">
              <img src={companyOutline} alt="" width="316" height="156" className="absolute bottom-0 left-[-35.2941%] h-auto w-[154.902%] max-w-none brightness-0 invert" />
              <div className="absolute inset-x-0 bottom-0 aspect-[204/150] overflow-hidden">
                <img src={companyImage} alt="" data-figma-node="328:1425" className="absolute left-[-29.4118%] top-0 h-auto w-[149.0196%] max-w-none" />
              </div>
            </div>
          )}
        </div>
        <h2 id={`${id}-title`} className="min-w-0 break-words pb-1 font-heading text-lg font-extrabold leading-[normal] tracking-[.05em] text-dark-900 sm:text-2xl lg:text-[27.72px]">
          {headingStart}<span className="text-primary">{accent}</span>{headingEnd}
        </h2>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[451fr_216fr_263fr_264fr_330fr]" role="search" aria-labelledby={`${id}-title`}>
        <label className="min-w-0 sm:col-span-2 lg:col-span-1">
          <span className="sr-only">{t(keywordLabel)}</span>
          <input type="search" className={controlClass} value={filters.keyword} placeholder={t(keywordLabel)} onChange={(event) => onChange({ ...filters, keyword: event.target.value })} aria-controls={resultsId} />
        </label>
        {select('lokasi', 'Lokasi', lokasiOptions)}
        {select('kategori', 'Kategori', categories)}
        {select('tipe', 'Tipe Pekerjaan', tipeOptions)}
        <button type="submit" aria-controls={resultsId} className="min-h-11 rounded-md bg-primary px-4 py-3 text-[16.63px] font-semibold leading-[normal] tracking-[.08em] text-white transition-colors hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:min-h-12">
          {t(talent ? 'Cari Talenta' : 'Cari Lowongan')}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1" role="group" aria-label={t('Kategori')}>
        {['', ...categories].map((category) => (
          <button key={category} type="button" aria-pressed={filters.kategori === category} aria-controls={resultsId} onClick={() => onChange({ ...filters, kategori: category })} className="group min-h-11 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className={`block rounded-full border px-3 py-1.5 leading-[normal] font-semibold tracking-[.12em] ${category ? 'text-[13.86px]' : 'text-[16.63px]'} transition-colors ${filters.kategori === category ? 'border-primary bg-primary text-white' : 'border-dark-300 bg-white text-dark-600 group-hover:border-primary group-hover:text-primary'}`}>
              {t(category || 'Semua')}
            </span>
          </button>
        ))}
        {active && <button type="button" onClick={() => onChange({ keyword: '', lokasi: '', kategori: '', tipe: '' })} className="min-h-11 px-2 text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary">{t('Atur Ulang')}</button>}
      </div>
    </section>
  );
};

export default BkkSearchPanel;
