import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import DataTable from '../../components/dashboard/DataTable';
import PageHeader from '../../components/dashboard/PageHeader';
import StatCard from '../../components/dashboard/StatCard';
import StatusBadge from '../../components/dashboard/StatusBadge';
import { getDashboardStats } from '../../services/dashboardService';
import { useAppConfig } from '../../context/AppConfigContext';

const formatTanggal = (value) => {
  if (!value) return '-';
  const tanggal = new Date(value);
  if (Number.isNaN(tanggal.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(tanggal);
};

const statusLabel = {
  menunggu: 'Menunggu',
  diproses: 'Diproses',
  diterima: 'Diterima',
  ditolak: 'Ditolak',
};

// Catatan: desain halaman ini tidak ikut di PDF referensi (berkasnya mulai dari
// halaman 2). Susunannya memakai komponen yang sama dengan halaman lain supaya
// tetap satu bahasa visual, dan gampang diganti kalau desainnya menyusul.
const DashboardHomePage = () => {
  const { spmbInternalEnabled } = useAppConfig();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStats(await getDashboardStats());
    } catch {
      setError('Data dashboard belum dapat dimuat. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getDashboardStats()
      .then((data) => mounted && setStats(data))
      .catch(() => mounted && setError('Data dashboard belum dapat dimuat. Silakan coba lagi.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const counts = stats?.counts ?? {};
  const berita = stats?.beritaTerbaru ?? [];
  const pendaftar = stats?.ppdbTerbaru ?? [];

  const columns = [
    { key: 'no', header: 'No', kelas: 'w-14' },
    {
      key: 'judul',
      header: 'Judul Berita',
      render: (b) => (
        <Link
          to="/dashboard/berita"
          className="font-medium text-dark-800 transition-colors hover:text-primary"
        >
          {b.judul}
        </Link>
      ),
    },
    { key: 'penulis', header: 'Penulis', kelas: 'w-40', render: (b) => b.penulis || '-' },
    {
      key: 'status',
      header: 'Status',
      kelas: 'w-32 text-center',
      render: (b) => <StatusBadge nilai={b.status === 'published' ? 'Published' : 'Draft'} />,
    },
    { key: 'created_at', header: 'Tanggal', kelas: 'w-36', render: (b) => formatTanggal(b.created_at) },
  ];

  const ppdbColumns = [
    { key: 'no', header: 'No', kelas: 'w-14' },
    { key: 'nama_lengkap', header: 'Nama', render: (p) => <span className="font-medium text-dark-800">{p.nama_lengkap}</span> },
    { key: 'asal_sekolah', header: 'Asal Sekolah' },
    { key: 'pilihan_jurusan', header: 'Jurusan', kelas: 'w-48' },
    { key: 'status', header: 'Status', kelas: 'w-32 text-center', render: (p) => <StatusBadge nilai={statusLabel[p.status] ?? p.status} nada={p.status === 'diterima' ? 'hijau' : p.status === 'ditolak' ? 'merah' : p.status === 'diproses' ? 'biru' : 'oranye'} /> },
    { key: 'created_at', header: 'Tanggal', kelas: 'w-36', render: (p) => formatTanggal(p.created_at) },
  ];

  const statCards = [
    { label: 'Total Berita', value: counts.berita ?? 0, nada: 'merah', icon: 'berita' },
    { label: 'Total Pengumuman', value: counts.pengumuman ?? 0, nada: 'biru', icon: 'pengumuman' },
    { label: 'Total Prestasi', value: counts.prestasi ?? 0, nada: 'ungu', icon: 'prestasi' },
    { label: 'BKK Aktif', value: counts.bkkAktif ?? 0, nada: 'hijau', icon: 'lowongan' },
  ];
  const ppdbStatCards = [
    { label: 'Total SPMB', value: counts.ppdbTotal ?? 0, nada: 'merah', icon: 'ppdb' },
    { label: 'Menunggu', value: counts.ppdbMenunggu ?? 0, nada: 'oranye', icon: 'tunggu' },
    { label: 'Diproses', value: counts.ppdbDiproses ?? 0, nada: 'biru', icon: 'diproses' },
    { label: 'Diterima', value: counts.ppdbDiterima ?? 0, nada: 'hijau', icon: 'diterima' },
    { label: 'Ditolak', value: counts.ppdbDitolak ?? 0, nada: 'merah', icon: 'ditolak' },
  ];

  return (
    <section>
      <PageHeader judul="Dashboard" breadcrumb={[{ label: 'Dashboard' }]} />

      <div className="mb-6 rounded-2xl bg-primary px-6 py-6 text-white">
        <p className="font-heading text-lg font-extrabold">Selamat datang di Dashboard Admin.</p>
        <p className="mt-1.5 text-xs text-white/80">
          {loading
            ? 'Memuat ringkasan data terbaru...'
            : !spmbInternalEnabled
              ? 'Pendaftaran SPMB dikelola melalui portal resmi Yayasan Telkom Schools.'
              : counts.ppdbMenunggu > 0
                ? `Ada ${counts.ppdbMenunggu} pendaftar yang menunggu diproses.`
                : 'Tidak ada pendaftar yang menunggu diproses.'}
        </p>
        {spmbInternalEnabled && (
          <Link
            to="/dashboard/spmb"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-primary transition-transform hover:-translate-y-0.5"
          >
            Buka Manajemen SPMB
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-5 py-4 text-xs text-primary-900">
          <span>{error}</span>
          <button type="button" onClick={loadStats} disabled={loading} className="rounded-lg bg-primary px-4 py-2 font-bold text-white hover:bg-primary-800 disabled:opacity-60">Coba lagi</button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {spmbInternalEnabled && (
        <>
          <h2 className="mb-4 font-heading text-lg font-extrabold text-dark-900">Ringkasan SPMB</h2>
          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
            {ppdbStatCards.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        </>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-extrabold text-dark-900">Berita Terbaru</h2>
        <Link
          to="/dashboard/berita"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
        >
          Lihat semua
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <DataTable columns={columns} rows={berita} perPage={5} kosong="Belum ada berita." />

      {spmbInternalEnabled && (
        <>
          <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-extrabold text-dark-900">Pendaftar Terbaru</h2>
            <Link to="/dashboard/spmb" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              Lihat semua <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <DataTable columns={ppdbColumns} rows={pendaftar} perPage={5} kosong="Belum ada pendaftar." />
        </>
      )}
    </section>
  );
};

export default DashboardHomePage;
