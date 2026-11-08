import { useLanguage } from '../../context/LanguageContext';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { pengumumanTimeline } from '../../data/dummyData';
import { getPengumumanCounts } from '../../utils/publicContent';

// Lihat catatan tampilkanLihatSemua di PengumumanPopulerCard.
const PengumumanTimelineBar = ({ items = [], tampilkanLihatSemua = true }) => {
  const { t } = useLanguage();
  const counts = getPengumumanCounts(items);
  return (
  <div className="rounded-lg border border-dark-200 px-5 py-6 lg:px-8">
    <p className="mb-4 text-[10px] leading-relaxed text-dark-500">
      {t('Ringkasan berdasarkan tanggal pengumuman yang sudah diterbitkan di website ini.')}
    </p>
    <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
    {['Hari Ini', 'Besok', 'Minggu Ini', 'Bulan Ini'].map((label, index) => (
      <div key={label}>
        <p className="font-heading text-lg font-bold leading-[normal] tracking-[.05em] text-dark-900 sm:text-[24.95px]">{t(label)}</p>
        <p className="mt-1 font-heading text-[11.09px] font-bold leading-[normal] tracking-[.05em] text-dark-900">{t('{count} Pengumuman', { count: counts[index] })}</p>
      </div>
    ))}

    {tampilkanLihatSemua && (
      <Link
        to="/pengumuman/timeline"
        className="col-span-2 inline-flex items-center gap-2 font-heading text-[19.4px] font-bold leading-[normal] tracking-[.05em] text-primary hover:underline sm:col-span-4 lg:col-span-1 lg:justify-self-end"
      >
        {t(pengumumanTimeline.linkText)}
        <ArrowRight className="h-4 w-4" />
      </Link>
    )}
    </div>
  </div>
  );
};

export default PengumumanTimelineBar;
