import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import GaleriFoto from '../GaleriFoto';
import Reveal from '../Reveal';
import ContentImage from '../ContentImage';

// Bagian khas halaman detail Prestasi: yang ditonjolkan adalah momen juaranya —
// angka sorotan, tahapan menuju podium, lalu foto-fotonya. Seluruh isinya datang
// dari objek `item`, jadi tiap prestasi menampilkan datanya sendiri.
const PrestasiDetailKonten = ({ item, relatedItems = [] }) => {
  const { t } = useLanguage();

  const lainnya = relatedItems.slice(0, 3);

  return (
    <>
      {item.sorotan && (
        <div className="mt-8 grid grid-cols-3 gap-3">
          {item.sorotan.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-primary px-3 py-4 text-center text-white transition-transform duration-300 hover:-translate-y-1"
            >
              <p className="font-heading text-lg font-extrabold leading-none sm:text-2xl">
                {t(s.angka)}
              </p>
              <p className="mt-1.5 text-[9px] leading-tight text-white/85 sm:text-[10px]">
                {t(s.label)}
              </p>
            </div>
          ))}
        </div>
      )}

      {item.perjalanan && (
        <section className="mt-10">
          <h2 className="font-heading text-lg font-extrabold text-dark-900 sm:text-xl">{t("Perjalanan Menuju Podium")}</h2>
          <ol className="mt-5 space-y-4 border-l-2 border-primary-100 pl-6">
            {item.perjalanan.map((tahap, i) => (
              <Reveal key={tahap.tahap} as="li" className="relative">
                <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-primary font-heading text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="font-heading text-xs font-bold text-dark-900 sm:text-sm">
                  {t(tahap.tahap)}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-dark-500">{t(tahap.isi)}</p>
              </Reveal>
            ))}
          </ol>
        </section>
      )}

      {item.instagramUrl && (
        <a href={item.instagramUrl} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-11 items-center rounded-full border border-primary/40 px-5 py-2 text-xs font-bold text-primary hover:bg-primary-50">
          {t('Lihat post Instagram')}
        </a>
      )}

      <GaleriFoto variant="prestasi"
        items={item.galeri}
        title={t("Momen Juara")}
        description={t("Dokumentasi kegiatan dan hasil karya di balik prestasi ini.")}
      />

      {lainnya.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading text-lg font-extrabold text-dark-900 sm:text-xl">{t("Prestasi Lainnya")}</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {lainnya.map((p) => (
              <Link
                key={p.slug}
                to={`/prestasi/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-dark-100 bg-white shadow-card transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="overflow-hidden">
                  <ContentImage variant="prestasi"
                    src={p.image}
                    alt={t(p.title)}
                    loading="lazy"
                    className="aspect-[16/9] w-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-primary">
                    <Trophy className="h-3 w-3" />
                    {t(p.kategori)}
                  </span>
                  <h3 className="mt-1 font-heading text-[11px] font-bold leading-snug text-dark-900">
                    {t(p.title)}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
};

export default PrestasiDetailKonten;
