import { useLanguage } from '../../context/LanguageContext';
import { formatPublicDate } from '../../utils/publicContent';
import { Link } from 'react-router-dom';
import { CalendarDays, Quote } from 'lucide-react';
import GaleriFoto from '../GaleriFoto';
import ContentImage from '../ContentImage';

// Bagian khas halaman detail Berita: yang ditonjolkan dokumentasinya — kutipan
// narasumber, galeri liputan, lalu berita lain pada kategori yang sama.
const BeritaDetailKonten = ({ item, relatedItems = [] }) => {
  const { t, locale } = useLanguage();

  // Utamakan berita sekategori; kalau belum cukup tiga, lengkapi dari kategori
  // lain supaya baris rekomendasinya tidak pernah tampil setengah kosong.
  const terkait = relatedItems.slice(0, 3);

  return (
    <>
      {item.kutipan && (
        <blockquote className="mt-9 rounded-2xl border-l-4 border-primary bg-primary-50 px-6 py-5">
          <Quote className="h-5 w-5 text-primary" />
          <p className="mt-2 font-heading text-sm font-semibold leading-relaxed text-dark-900 sm:text-base">
            {t(item.kutipan.teks)}
          </p>
          <footer className="mt-2.5 text-[11px] font-medium text-dark-500">
            — {t(item.kutipan.oleh)}
          </footer>
        </blockquote>
      )}

      <GaleriFoto
        items={item.galeri}
        title={t("Galeri Liputan")}
        description={t("Dokumentasi foto dari kegiatan yang diberitakan.")}
      />

      {terkait.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading text-lg font-extrabold text-dark-900 sm:text-xl">{t("Berita Lainnya")}</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {terkait.map((b) => (
              <Link
                key={b.slug}
                to={`/berita/${b.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-dark-100 bg-white shadow-card transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="overflow-hidden">
                  <ContentImage
                    src={b.image}
                    alt={t(b.title)}
                    loading="lazy"
                    className="aspect-[16/9] w-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="px-4 py-3">
                  <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {t(b.kategori)}
                  </span>
                  <h3 className="mt-1.5 font-heading text-[11px] font-bold leading-snug text-dark-900">
                    {t(b.title)}
                  </h3>
                  <span className="mt-1.5 flex items-center gap-1 text-[11px] text-dark-400">
                    <CalendarDays className="h-2.5 w-2.5" />
                    {formatPublicDate(b.iso, {}, locale)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
};

export default BeritaDetailKonten;
