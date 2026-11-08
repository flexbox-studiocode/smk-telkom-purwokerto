import { useLanguage } from '../../context/LanguageContext';
import { useState } from "react";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";
import {
  galeriKegiatan,
  newsletterBerita,
} from "../../data/dummyData";
import { formatPublicDate, getBeritaCategories, getBeritaGallery } from '../../utils/publicContent';
import ContentImage from '../ContentImage';

const BeritaAgendaSection = ({ items = [], tampilkanLihatSemua = true }) => {
  const { t, locale } = useLanguage();
  const categories = getBeritaCategories(items);
  const gallery = getBeritaGallery(items);

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSent(true);
    setEmail("");
  };

  return (
    <section aria-label={t('Kategori dan galeri berita')} className="bg-white py-8 lg:py-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        {/* Kategori berasal dari berita yang sedang ditampilkan. */}
        <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-sm font-extrabold text-dark-900">
              {t('Kategori Berita')}
            </h2>
            {tampilkanLihatSemua && (
              <Link
                to="/berita#kategori-berita"
                className="text-[10px] font-extrabold tracking-figma-copy text-primary hover:underline"
              >
                {t('Lihat Semua')}
              </Link>
            )}
          </div>

          <ul className="mt-4 space-y-3">
            {categories.map((category) => (
              <li key={category.name} className="rounded-xl border border-dark-100 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-heading text-xs font-bold text-dark-900">{t(category.name)}</h3>
                  <span className="rounded bg-primary-50 px-2 py-1 text-[9px] font-bold text-primary">
                    {t('{count} berita', { count: category.items.length })}
                  </span>
                </div>
                <ul className="mt-2 space-y-2">
                  {category.items.map((item) => (
                    <li key={item.slug}>
                      <Link to={`/berita/${item.slug}`} className="block text-[10px] font-semibold leading-snug text-dark-700 hover:text-primary hover:underline">
                        {t(item.title)}
                      </Link>
                      <p className="mt-1 text-[9px] text-dark-400">{formatPublicDate(item.iso, {}, locale)}</p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {categories.length === 0 && <p className="mt-4 text-xs text-dark-500">{t('Tidak ada berita yang cocok dengan filter itu.')}</p>}

          {tampilkanLihatSemua && (
            <Link
              to="/berita#kategori-berita"
              className="mt-4 inline-block text-[10px] font-bold text-primary hover:underline"
            >
              {t('Lihat Semua Berita')}
            </Link>
          )}
        </div>

        {/* Galeri kegiatan */}
        <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-sm font-extrabold text-dark-900">
              {t(galeriKegiatan.title)}
            </h2>
            <Link
              to="/galeri"
              className="text-[10px] font-extrabold tracking-figma-copy text-primary hover:underline"
            >
              {t(galeriKegiatan.linkText)}
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {gallery.map((g) => (
              <Link
                key={g.slug}
                to={`/berita/${g.slug}?from=galeri`}
                className="group block overflow-hidden rounded-lg"
              >
                <ContentImage
                  src={g.image}
                  alt={t(g.title)}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-lg object-cover object-top transition-transform duration-500 group-hover:scale-110"
                />
                <span className="mt-1.5 block text-[10px] font-semibold leading-snug text-dark-700 group-hover:text-primary">{t(g.title)}</span>
              </Link>
            ))}
          </div>
          {gallery.length === 0 && <p className="mt-4 text-xs text-dark-500">{t('Belum ada foto berita yang ditampilkan.')}</p>}
        </div>

        {/* Langganan newsletter */}
        <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-card">
          <div className="flex items-center gap-2.5">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-sm font-extrabold text-dark-900">
              {t(newsletterBerita.title)}
            </h2>
          </div>

          <h3 className="mt-4 font-heading text-base font-extrabold text-dark-900">
            {t(newsletterBerita.heading)}
          </h3>
          <p className="mt-2 text-[9px] font-medium leading-[normal] tracking-figma-copy text-dark-500">
            {t(newsletterBerita.description)}
          </p>

          <form onSubmit={submit} className="mt-4">
            <label>
              <span className="sr-only">{t(newsletterBerita.placeholder)}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSent(false);
                }}
                placeholder={t(newsletterBerita.placeholder)}
                className="w-full rounded-lg border border-dark-200 px-3 py-2.5 text-[10px] font-medium tracking-figma-copy text-dark-700 outline-none transition-colors placeholder:text-dark-400 focus:border-primary"
              />
            </label>
            <button
              type="submit"
              className="mt-3 w-full rounded-full bg-primary py-2.5 text-[11px] font-semibold tracking-figma-copy text-white transition-colors hover:bg-primary-800"
            >
              {t(newsletterBerita.ctaText)}
            </button>
          </form>

          <p
            aria-live="polite"
            className="mt-3 text-[8px] font-medium leading-[normal] tracking-figma-copy text-dark-400"
          >
            {sent ? (
              <span className="font-semibold text-primary">
                {t(newsletterBerita.successText)}
              </span>
            ) : (
              t(newsletterBerita.note)
            )}
          </p>
        </div>
      </div>
    </section>
  );
};

export default BeritaAgendaSection;
