import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, Outlet, Navigate, useParams } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import ContentSkeleton from './components/ContentSkeleton';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import ErrorPage from './pages/ErrorPage';
import MainLayout from './layouts/MainLayout';
import { canonicalAdmissionsPath, isHiddenAdmissionsPath, OFFICIAL_ADMISSIONS_URL } from './utils/admissions';
import { useAppConfig } from './context/AppConfigContext';
import { PAGE_META, applyPageMetadata } from './utils/seo';
const LandingPage = lazy(() => import('./pages/LandingPage'));
const FasilitasPage = lazy(() => import('./pages/FasilitasPage'));
import { useLanguage } from './context/LanguageContext';
const ProfileSekolahPage = lazy(() => import('./pages/TentangPage'));
const GuruPage = lazy(() => import('./pages/GuruPage'));
const GuruDetailPage = lazy(() => import('./pages/GuruDetailPage'));
const JurusanPage = lazy(() => import('./pages/JurusanPage'));
const PrestasiPage = lazy(() => import('./pages/PrestasiPage'));
const BkkPage = lazy(() => import('./pages/BkkPage'));
const SinergiPage = lazy(() => import('./pages/SinergiPage'));
const BeritaPage = lazy(() => import('./pages/BeritaPage'));
const PengumumanPage = lazy(() => import('./pages/PengumumanPage'));
const KalenderPage = lazy(() => import('./pages/KalenderPage'));
const SpmbPage = lazy(() => import('./pages/SpmbPage'));
const JurusanDetailPage = lazy(() => import('./pages/JurusanDetailPage'));
const PrestasiDetailPage = lazy(() => import('./pages/PrestasiDetailPage'));
const BeritaDetailPage = lazy(() => import('./pages/BeritaDetailPage'));
const PengumumanDetailPage = lazy(() => import('./pages/PengumumanDetailPage'));
const StelaPage = lazy(() => import('./pages/StelaPage'));
const DetailPelengkapPage = lazy(() => import('./pages/DetailPelengkapPage'));
const KoleksiPage = lazy(() => import('./pages/KoleksiPage'));
const GaleriPage = lazy(() => import('./pages/GaleriPage'));
const PanduanPage = lazy(() => import('./pages/PanduanPage'));
const JurusanFaqPage = lazy(() => import('./pages/JurusanFaqPage'));
const JurusanPerbandinganPage = lazy(() => import('./pages/JurusanPerbandinganPage'));
const KetentuanPpdbPage = lazy(() => import('./pages/KetentuanPpdbPage'));
const LupaSandiPage = lazy(() => import('./pages/ppdb/LupaSandiPage'));
const AturSandiPage = lazy(() => import('./pages/ppdb/AturSandiPage'));
const DokumenPesertaPage = lazy(() => import('./pages/ppdb/DokumenPesertaPage'));
const Login = lazy(() => import('./page/Login/Login'));
const AuthProvider = lazy(() => import('./context/AuthContext').then(({ AuthProvider: Provider }) => ({ default: Provider })));
const PpdbProvider = lazy(() => import('./context/PpdbContext').then(({ PpdbProvider: Provider }) => ({ default: Provider })));
const PpdbRegisterPage = lazy(() => import('./pages/ppdb/RegisterPage'));
const PpdbLoginPage = lazy(() => import('./pages/ppdb/LoginPage'));
const VerifyEmailPage = lazy(() => import('./pages/ppdb/VerifyEmailPage'));
const ConfirmEmailPage = lazy(() => import('./pages/ppdb/ConfirmEmailPage'));
const RegistrationFormPage = lazy(() => import('./pages/ppdb/RegistrationFormPage'));
const UploadDocumentsPage = lazy(() => import('./pages/ppdb/UploadDocumentsPage'));
const SubmitSuccessPage = lazy(() => import('./pages/ppdb/SubmitSuccessPage'));
const PpdbStatusPage = lazy(() => import('./pages/ppdb/PpdbStatusPage'));
const AdminDataProvider = lazy(() => import('./context/AdminDataContext').then(({ AdminDataProvider: Provider }) => ({ default: Provider })));
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout'));
const DashboardHomePage = lazy(() => import('./pages/dashboard/DashboardHomePage'));
const DashboardJurusanPage = lazy(() => import('./pages/dashboard/JurusanPage'));
const AdminBeritaPage = lazy(() => import('./pages/admin/berita/BeritaPage'));
const AdminPengumumanPage = lazy(() => import('./pages/admin/pengumuman/PengumumanPage'));
const AdminPrestasiPage = lazy(() => import('./pages/admin/prestasi/PrestasiPage'));
const AdminBkkPage = lazy(() => import('./pages/admin/bkk/BkkPage'));
const KalenderAdminPage = lazy(() => import('./pages/admin/kalender/KalenderAdminPage'));
const SpmbInformationPage = lazy(() => import('./pages/admin/spmb/SpmbInformationPage'));
const AdminPpdbPage = lazy(() => import('./pages/admin/ppdb/PPDBPage'));
const SpmbInternalGate = lazy(() => import('./pages/dashboard/SpmbInternalGate'));
const ProtectedRoute = lazy(() => import('./router/ProtectedRoute'));
const NextTelPage = lazy(() => import('./pages/NextTelPage'));
const EkstrakurikulerPage = lazy(() => import('./pages/EkstrakurikulerPage'));
const KebijakanPrivasiPage = lazy(() => import('./pages/KebijakanPrivasiPage'));



const PageMetadata = () => {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  useEffect(() => {
    if (document.querySelector('#error-title')) return;
    const path = pathname.replace(/\/+$/, '') || '/';
    const key = Object.keys(PAGE_META).find((entry) => path === entry || (['/dashboard', '/spmb'].includes(entry) && path.startsWith(`${entry}/`)));
    // Detail components own metadata after validating the item. Do not overwrite
    // a current-route prerender canonical with transient noindex while data loads.
    if (!key && /^\/(berita|prestasi|pengumuman|jurusan|galeri|bkk|profil-sekolah)\//.test(path)) {
      const canonical = document.querySelector('link[rel="canonical"]')?.href;
      if (canonical && new URL(canonical).pathname === path) return;
      if (document.querySelector('main h1')) return;
    }
    if (!key && document.querySelector('main h1')) return;
    const [title, description] = PAGE_META[key] || ['SMK Telkom Purwokerto', 'Website resmi SMK Telkom Purwokerto.'];
    applyPageMetadata({ pathname, title: t(title), description: t(description), indexable: Boolean(key) && !/^\/(login|dashboard|auth|lupa-sandi)(\/|$)/.test(path) && !path.startsWith('/spmb/') });
  }, [pathname, t]);
  return null;
};

const LegacyProfileGuruRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={`/profil-sekolah/guru/${slug}`} replace />;
};

const AdmissionsRedirect = () => {
  const { pathname, search, hash } = useLocation();
  const canonicalPath = canonicalAdmissionsPath(pathname);
  return <Navigate to={{ pathname: canonicalPath === '/spmb' || canonicalPath === '/spmb/' ? '/spmb/masuk' : canonicalPath, search, hash }} replace />;
};

const RouteLoading = () => {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const loadingStatus = <div role="status" className="grid min-h-screen place-items-center bg-white text-sm text-dark-600">{t('Memuat halaman...')}</div>;
  if (pathname !== '/spmb' && pathname !== '/spmb/' && /^\/(spmb|ppdb|dashboard|login|auth)(\/|$)/.test(pathname)) {
    return loadingStatus;
  }
  return <Suspense fallback={loadingStatus}><MainLayout busy><section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><p role="status" className="text-sm text-dark-600">{t('Memuat halaman...')}</p><ContentSkeleton /></section></MainLayout></Suspense>;
};

const OfficialAdmissionsRedirect = () => {
  const { t } = useLanguage();
  useEffect(() => {
    applyPageMetadata({ pathname: window.location.pathname, title: 'SPMB', description: '', indexable: false });
    // Never forward legacy query strings or authentication tokens to another site.
    window.location.replace(OFFICIAL_ADMISSIONS_URL);
  }, []);
  return <a href={OFFICIAL_ADMISSIONS_URL}>{t('Masuk SPMB')}</a>;
};

const App = () => {
  const { pathname } = useLocation();
  const { spmbInternalEnabled, loading: configLoading } = useAppConfig();
  // Tunggu status fitur sebelum memutuskan redirect, supaya portal internal
  // yang sengaja diaktifkan tidak terlanjur dialihkan saat config dimuat.
  if (configLoading && isHiddenAdmissionsPath(pathname)) return <RouteLoading />;
  if (isHiddenAdmissionsPath(pathname, { spmbInternalEnabled })) return <OfficialAdmissionsRedirect />;
  return (
    <>
      <ScrollToTop />
      <RouteErrorBoundary>
      <Suspense fallback={<RouteLoading />}>
      <PageMetadata />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/fasilitas" element={<FasilitasPage />} />
        <Route path="/profil-sekolah" element={<ProfileSekolahPage />} />
        <Route path="/profil-sekolah/guru" element={<GuruPage />} />
        <Route path="/tentang" element={<Navigate to="/profil-sekolah" replace />} />
        <Route path="/jurusan" element={<JurusanPage />} />
        <Route path="/prestasi" element={<PrestasiPage />} />
        <Route path="/bkk" element={<BkkPage />} />
        <Route path="/sinergi" element={<SinergiPage />} />
        <Route path="/layanan/digits" element={<SinergiPage title="DIGITS" category="Layanan" backHref={null} />} />
        <Route path="/layanan/saku" element={<SinergiPage title="SAKU" category="Layanan" backHref={null} />} />
        <Route path="/berita" element={<BeritaPage />} />
        <Route path="/pengumuman" element={<PengumumanPage />} />
        <Route path="/kalender" element={<KalenderPage />} />
        {/* Preserve old bookmarks and authentication callback parameters. */}
        <Route path="/spmb" element={<SpmbPage />} />
        <Route path="/ppdb/*" element={<AdmissionsRedirect />} />
        <Route path="/ketentuan-ppdb" element={<AdmissionsRedirect />} />
        <Route path="/dashboard/ppdb" element={<AdmissionsRedirect />} />

        {/* Halaman pelengkap. Slug-nya mengikuti hasil slugify() pada kartu
            asal, karena tautannya dirakit dari judul kartu. */}
        <Route path="/galeri" element={<GaleriPage />} />
        <Route path="/galeri/:slug" element={<DetailPelengkapPage jenis="galeri" />} />
        <Route path="/berita/agenda/:slug" element={<DetailPelengkapPage jenis="agenda" />} />
        <Route path="/bkk/panduan" element={<PanduanPage />} />
        <Route path="/bkk/panduan/:slug" element={<DetailPelengkapPage jenis="panduan" />} />
        <Route path="/bkk/pkl/:slug" element={<DetailPelengkapPage jenis="pkl" />} />
        <Route path="/bkk/roadmap/:slug" element={<DetailPelengkapPage jenis="roadmap" />} />
        <Route path="/jurusan/faq" element={<JurusanFaqPage />} />
        <Route path="/jurusan/perbandingan" element={<JurusanPerbandinganPage />} />
        <Route path="/jurusan/project/:slug" element={<DetailPelengkapPage jenis="project" />} />
        <Route path="/profil-sekolah/guru/:slug" element={<GuruDetailPage />} />
        <Route path="/tentang/guru/:slug" element={<LegacyProfileGuruRedirect />} />
        <Route path="/ketentuan-spmb" element={<KetentuanPpdbPage />} />
        <Route path="/lupa-sandi" element={<LupaSandiPage />} />

        {/* Alur portal PPDB. PpdbProvider membungkus keenam langkah supaya isian
            formulir tetap ada saat berpindah langkah. */}
        <Route
          element={
            <PpdbProvider>
              <Outlet />
            </PpdbProvider>
          }
        >
          <Route path="/spmb/daftar" element={<PpdbRegisterPage />} />
          <Route path="/spmb/atur-sandi" element={<AturSandiPage />} />
          <Route path="/spmb/masuk" element={<PpdbLoginPage />} />
          <Route path="/spmb/verifikasi" element={<VerifyEmailPage />} />
<Route path="/auth/confirm" element={<ConfirmEmailPage />} />
          <Route path="/spmb/formulir" element={<RegistrationFormPage />} />
          <Route path="/spmb/berkas" element={<UploadDocumentsPage />} />
          <Route path="/spmb/selesai" element={<SubmitSuccessPage />} />
          <Route path="/spmb/status" element={<PpdbStatusPage />} />
          <Route path="/spmb/dokumen-peserta" element={<DokumenPesertaPage />} />
        </Route>

        {/* Halaman detail: isinya dicari dari slug, satu komponen per kategori. */}
        <Route path="/jurusan/:slug" element={<JurusanDetailPage />} />
        {/* Halaman "Lihat Semua". WAJIB berada sebelum rute :slug di bawah:
            tanpa ini /pengumuman/populer cocok dengan /pengumuman/:slug dan
            "populer" dicari sebagai slug artikel -- halaman jadi kosong. */}
        <Route path="/pengumuman/populer" element={<KoleksiPage jenis="pengumuman-populer" />} />
        <Route path="/pengumuman/semua" element={<KoleksiPage jenis="pengumuman-semua" />} />
        <Route path="/pengumuman/timeline" element={<KoleksiPage jenis="pengumuman-timeline" />} />
        <Route path="/pengumuman/informasi-penting" element={<KoleksiPage jenis="pengumuman-informasi-penting" />} />
        <Route path="/berita/trending" element={<KoleksiPage jenis="berita-trending" />} />
        <Route path="/berita/agenda" element={<KoleksiPage jenis="berita-agenda" />} />
        <Route path="/prestasi/galeri" element={<KoleksiPage jenis="prestasi-galeri" />} />

        <Route path="/prestasi/:slug" element={<PrestasiDetailPage />} />
        <Route path="/berita/:slug" element={<BeritaDetailPage />} />
        <Route path="/pengumuman/:slug" element={<PengumumanDetailPage />} />

        <Route path="/nexa" element={<StelaPage />} />
        <Route path="/stela" element={<StelaPage />} />
        <Route path="/nexttel" element={<NextTelPage />} />
        <Route path="/ekstrakurikuler" element={<EkstrakurikulerPage />} />
        <Route path="/kebijakan-privasi" element={<KebijakanPrivasiPage />} />

        <Route element={<AuthProvider><Outlet /></AuthProvider>}>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            {/* Panel admin. AdminDataProvider dipasang di sini, bukan di main.jsx,
                supaya halaman publik tidak ikut menanggung state-nya. */}
            <Route
              path="/dashboard"
              element={
                <AdminDataProvider>
                  <DashboardLayout />
                </AdminDataProvider>
              }
            >
              <Route index element={<DashboardHomePage />} />
              <Route path="informasi-spmb" element={<SpmbInternalGate><SpmbInformationPage /></SpmbInternalGate>} />
              {/* Tambah/edit berita dan detail PPDB kini memakai modal di dalam
                  halamannya masing-masing, jadi tidak ada rute terpisah lagi. */}
              <Route path="berita" element={<AdminBeritaPage />} />
              <Route path="pengumuman" element={<AdminPengumumanPage />} />
              <Route path="spmb" element={<SpmbInternalGate><AdminPpdbPage /></SpmbInternalGate>} />
              <Route path="jurusan" element={<DashboardJurusanPage />} />
              <Route path="prestasi" element={<AdminPrestasiPage />} />
              <Route path="bkk" element={<AdminBkkPage />} />
              <Route path="kalender" element={<KalenderAdminPage />} />
              {/* Menu Pengaturan dihapus dari dashboard; bookmark lama diarahkan ke beranda dashboard. */}
              <Route path="pengaturan" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Route>

        {/* Coming Soon must only be registered on an explicitly planned route. */}
        <Route path="*" element={<ErrorPage />} />
      </Routes>
      </Suspense>
      </RouteErrorBoundary>
    </>
  );
};

export default App;
