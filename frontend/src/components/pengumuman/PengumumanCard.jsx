import { useLanguage } from '../../context/LanguageContext';
import { formatPublicDate } from '../../utils/publicContent';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { daftarPengumuman } from '../../data/dummyData';

import ContentImage from '../ContentImage';
import cardPattern from '../../assets/pengumuman/card-background-pattern.png';

const Tag = ({ children }) => (
  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-extrabold leading-[normal] tracking-[.05em] text-[#ce2a45] sm:text-[clamp(10px,1.5cqw,16px)]">
    {children}
  </span>
);

const PengumumanCard = ({ item }) => {
  const { t, locale } = useLanguage();

  return (
  <article className="relative isolate overflow-hidden rounded-xl bg-[#ce2a45] p-4 font-[family-name:var(--font-jakarta)] sm:px-[2.91%] sm:pt-[3.56%] sm:pb-[5.91%]">
    {/* Motif diekspor dari lapisan gambar Figma; tetap mengikuti ukuran kartu. */}
    <img src={cardPattern} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover" />
    <div className="grid grid-cols-[76px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[17.05%_minmax(0,1fr)] sm:gap-[6.08%]">
      {/* Foto berasal dari pengumuman ini, dengan fallback bersama jika kosong/rusak. */}
      <div className="overflow-hidden rounded-md bg-white p-1.5">
        <ContentImage src={item.image} alt={t(item.title)} loading="lazy" className="aspect-[155/161] w-full rounded-sm object-cover" />
      </div>

    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(item.tags || [item.kategori || 'Pengumuman']).map((tag) => (
            <Tag key={tag}>{t(tag)}</Tag>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Tag>
            {formatPublicDate(item.iso, {}, locale)}
          </Tag>
          {item.penting && <Tag>{t("Penting!")}</Tag>}
        </div>
      </div>

      <div className="mt-2.5 flex flex-1 flex-col items-start justify-between gap-3 sm:flex-row">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-sm font-extrabold leading-[normal] tracking-[0.05em] text-white sm:text-[clamp(14px,2.25cqw,24px)]">
            {t(item.title)}
          </h2>
          <p className="mt-1 break-words text-[11px] font-extrabold leading-[normal] tracking-[0.05em] text-white sm:text-[clamp(11px,1.88cqw,20px)]">
            {t(item.desc)}
          </p>
        </div>

        <Link
          to={`/pengumuman/${item.slug}`}
          className="inline-flex min-h-9 flex-shrink-0 items-center gap-2 rounded-md bg-white px-3 py-2 text-[11px] font-extrabold leading-[normal] tracking-[.05em] text-[#ce2a45] transition-colors hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-[clamp(11px,1.878cqw,20px)]"
        >
          {t(daftarPengumuman.detailText)}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
    </div>
  </article>
  );
};

export default PengumumanCard;
