import { useEffect } from 'react';
import { ArrowLeft, House, MapPinOff, RefreshCw, ShieldX, WifiOff, TriangleAlert } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import { useLanguage } from '../context/LanguageContext';
import { applyPageMetadata } from '../utils/seo';

const ERRORS = {
  notFound: { code: '404', title: 'Halaman Tidak Ditemukan', description: 'Halaman yang Anda cari tidak tersedia. Periksa kembali alamat URL atau kembali ke beranda.', icon: MapPinOff },
  forbidden: { code: '403', title: 'Akses Tidak Diizinkan', description: 'Akun Anda tidak memiliki izin untuk mengakses halaman ini.', icon: ShieldX },
  application: { title: 'Halaman Mengalami Gangguan', description: 'Terjadi kesalahan saat menampilkan halaman. Silakan muat ulang atau kembali ke beranda.', icon: TriangleAlert },
  chunk: { title: 'Halaman Gagal Dimuat', description: 'Berkas halaman gagal dimuat. Periksa koneksi internet, lalu muat ulang untuk mencoba lagi.', icon: RefreshCw },
  offline: { title: 'Koneksi Internet Terputus', description: 'Periksa koneksi internet Anda, lalu coba lagi.', icon: WifiOff },
};

export default function ErrorPage({ kind = 'notFound', onRetry }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname, key } = useLocation();
  const { code, title, description, icon: Icon } = ERRORS[kind];
  // React Router's index excludes a previous page outside this browsing session.
  const canGoBack = typeof window !== 'undefined' && (window.history.state?.idx ?? 0) > 0;
  const heading = `${code ? `${code} — ` : ''}${t(title)}`;

  useEffect(() => {
    applyPageMetadata({ pathname, title: `${heading} | SMK Telkom Purwokerto`, description: t(description), indexable: false });
  }, [heading, description, t, pathname, key]);

  return (
    <MainLayout>
      <section className="bg-white px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="error-title">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-primary-100 bg-primary-50 text-primary" aria-hidden="true">
            <Icon className="h-9 w-9" />
          </span>
          {code && <p className="mt-6 font-heading text-7xl font-extrabold tracking-tight text-primary sm:text-8xl" aria-hidden="true">{code}</p>}
          <h1 id="error-title" className="mt-6 font-heading text-2xl font-extrabold text-dark-900 sm:text-3xl">{code && <span className="sr-only">{code} — </span>}{t(title)}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-dark-600 sm:text-base">{t(description)}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
              <House className="h-4 w-4" aria-hidden="true" />{t('Kembali ke Beranda')}
            </Link>
            {onRetry ? <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-dark-200 px-6 py-3 text-sm font-semibold text-dark-700 hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />{t('Muat Ulang')}
            </button> : canGoBack && <button type="button" onClick={() => navigate(-1)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-dark-200 px-6 py-3 text-sm font-semibold text-dark-700 hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />{t('Kembali')}
            </button>}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
