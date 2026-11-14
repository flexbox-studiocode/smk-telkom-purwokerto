import RichContent from './RichContent';
import { ArrowLeft, CalendarDays, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Reveal from './Reveal';
import VideoEmbed from './VideoEmbed';
import ContentImage from './ContentImage';
import TeacherPhoto from './TeacherPhoto';
import { useLanguage } from '../context/LanguageContext';
import { useEffect } from 'react';
import { applyPageMetadata, detailDescription, articleMetadata } from '../utils/seo';
import { formatPublicDate } from '../utils/publicContent';

// Tampilan bersama untuk semua halaman detail. Komponen ini sengaja tidak tahu
// kategori apa pun: seluruh isinya datang dari objek `item` yang dicari lewat
// slug di halaman detail masing-masing, jadi tidak ada teks yang dipaku di sini.
// Penekanan yang berbeda tiap kategori dititipkan lewat `children`.
const DetailLayout = ({ item, backTo, backLabel, children }) => {
  const { pathname } = useLocation();
  const { t, locale } = useLanguage();
  useEffect(() => {
    applyPageMetadata({ pathname, title: `${t(item.title)} | SMK Telkom Purwokerto`, description: detailDescription({ title: t(item.title), lead: t(item.lead || ''), subtitle: t(item.subtitle || '') }), article: /^\/berita\/[^/]+\/?$/.test(pathname) ? articleMetadata({ ...item, title: t(item.title) }) : undefined, indexable: true });
  }, [pathname, item, backTo, t]);
  return (
  <MainLayout>
    <article className="bg-white py-8 lg:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label={t('Jejak navigasi')} className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-primary">
          <Link to="/" className="hover:underline">
            {t('Beranda')}
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <Link to={backTo} className="hover:underline">
            {t(backLabel)}
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span aria-current="page" title={t(item.title)} className="max-w-full truncate text-dark-500">{t(item.title)}</span>
        </nav>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="rounded bg-primary-50 px-2.5 py-1 text-[10px] font-bold text-primary">
            {t(item.kategori)}
          </span>
          {item.date && <span className="flex items-center gap-1.5 text-[11px] text-dark-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {item.iso ? formatPublicDate(item.iso, {}, locale) : t(item.date)}
          </span>}
          {item.author && <span className="text-[11px] text-dark-500">{t(item.author)}</span>}
        </div>

        <h1 className="mt-4 font-heading text-2xl sm:text-3xl font-extrabold leading-tight text-dark-900">
          {t(item.title)}
        </h1>
        {item.subtitle && (
          <p className="mt-2 text-sm font-semibold text-primary">{t(item.subtitle)}</p>
        )}

        <div className="mt-7 overflow-hidden rounded-2xl">
          {item.photoCropClassName ? (
            <TeacherPhoto teacher={item} alt={t(item.imageAlt)} className="mx-auto w-full max-w-sm" />
          ) : (
            <ContentImage
              src={item.image}
              alt={t(item.imageAlt || 'Foto ilustrasi; dokumentasi belum terverifikasi')}
              className="w-full object-cover object-top aspect-[16/9] transition-transform duration-700 hover:scale-105"
            />
          )}
        </div>

        {item.imageNote && (
          <p className="mt-2 text-[10px] text-dark-400">{t(item.imageNote)}</p>
        )}

        <p className="mt-7 text-sm sm:text-base font-medium leading-relaxed text-dark-700">
          {t(item.lead)}
        </p>

        {item.richBody && <RichContent value={item.richBody} className="mt-5 text-sm text-dark-700" />}
        <div className="mt-5 space-y-4">
          {item.body.map((paragraf) => (
            <p key={paragraf} className="text-xs sm:text-sm leading-relaxed text-dark-500">
              {t(paragraf)}
            </p>
          ))}
        </div>

        {/* Slot video per item. Isi `video: { videoId, poster, title, desc }` di
            dummyData.js pada entri mana pun, dan pemutarnya langsung muncul. */}
        {item.video && (
          <Reveal className="mt-8">
            <VideoEmbed
              videoSrc={item.video.videoSrc}
              videoId={item.video.videoId}
              poster={item.video.poster || item.image}
              title={item.video.title}
              desc={item.video.desc}
            />
          </Reveal>
        )}

        {item.facts && (
          <Reveal>
            <dl className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-dark-100 bg-dark-100 sm:grid-cols-2">
              {item.facts.map((fakta) => (
                <div key={fakta.label} className="bg-white px-5 py-4">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-dark-400">
                    {t(fakta.label)}
                  </dt>
                  <dd className="mt-1 font-heading text-xs font-bold text-dark-900">
                    {t(fakta.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        )}

        {children}

        {/* Halaman sekolah dan proyek memakai konten lokal; tombol sumber berita tetap tersedia. */}
        {item.sourceUrl && !['/prestasi', '/pengumuman', '/jurusan'].includes(backTo) && (
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/40 px-5 py-2 text-xs font-bold text-primary hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-primary">
            {t('Lihat sumber')}<ChevronRight className="h-4 w-4" aria-hidden="true" />
          </a>
        )}

        <Link
          to={backTo}
          className="mt-9 inline-flex items-center gap-2 rounded-full border border-dark-200 bg-white px-6 py-3 text-xs font-semibold text-dark-700 transition-colors hover:border-primary hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('Kembali ke {label}', { label: t(backLabel) })}
        </Link>
      </div>
    </article>
  </MainLayout>
  );
};

export default DetailLayout;
