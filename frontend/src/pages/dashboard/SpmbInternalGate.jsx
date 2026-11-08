import { ExternalLink, Info } from 'lucide-react';
import { useAppConfig } from '../../context/AppConfigContext';
import { useLanguage } from '../../context/LanguageContext';

// Menjaga halaman admin SPMB internal tetap dapat diakses saat fitur aktif,
// dan menampilkan pemberitahuan resmi saat fitur nonaktif. Route dan source
// code tidak dihapus sehingga fitur dapat dinyalakan kembali kapan saja.
export default function SpmbInternalGate({ children }) {
  const { spmbInternalEnabled, officialAdmissionsUrl, loading } = useAppConfig();
  const { t } = useLanguage();

  if (loading) {
    return <p role="status" className="text-sm text-dark-500">{t('Memeriksa konfigurasi SPMB...')}</p>;
  }

  if (spmbInternalEnabled) return children;

  return (
    <section aria-labelledby="spmb-disabled-title" className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-dark-100 bg-white p-6 shadow-card sm:p-8">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary-50 text-primary">
          <Info className="size-5" aria-hidden="true" />
        </span>
        <h1 id="spmb-disabled-title" className="mt-4 font-heading text-xl font-extrabold text-dark-900">
          {t('SPMB internal sedang dinonaktifkan')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-dark-600">
          {t('Pendaftaran peserta didik baru SMK Telkom Purwokerto kini dikelola melalui portal resmi Yayasan Telkom Schools. Pengelolaan SPMB internal tidak tersedia saat fitur ini nonaktif.')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-dark-600">
          {t('Data pendaftaran historis tetap tersimpan dan dapat diakses administrator melalui API yang sah.')}
        </p>
        <a
          href={officialAdmissionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-800"
        >
          {t('Buka portal SPMB resmi')}
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}