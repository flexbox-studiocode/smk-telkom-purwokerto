import RichContent from '../../../components/RichContent';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, RefreshCw, Search, X } from 'lucide-react';
import PrestasiForm from './PrestasiForm';
import PrestasiModal from './PrestasiModal';
import PrestasiTable from './PrestasiTable';
import { createPrestasi, deletePrestasi, getPrestasi, updatePrestasi } from '../../../services/prestasiService';
import { apiErrorMessage } from '../../../utils/apiError';

const getErrorMessage = (error, fallback) => apiErrorMessage(error, fallback, {
  duplicate: 'Slug tersebut sudah digunakan. Gunakan slug yang berbeda.',
  not_found: 'Prestasi sudah tidak tersedia. Muat ulang daftar prestasi.',
});

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(date));
};

const PrestasiPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('tanggal-desc');
  const [modal, setModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPrestasi = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getPrestasi());
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Daftar prestasi gagal dimuat.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch awal menyinkronkan state halaman dengan data backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPrestasi();
  }, [loadPrestasi]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = items.filter((item) => {
      const searchable = [item.judul, item.slug, item.kategori, item.deskripsi, item.tingkat].filter(Boolean).join(' ').toLowerCase();
      return !normalizedQuery || searchable.includes(normalizedQuery);
    });

    return [...result].sort((a, b) => {
      if (!a.tanggal && !b.tanggal) return new Date(b.created_at) - new Date(a.created_at);
      if (!a.tanggal) return 1;
      if (!b.tanggal) return -1;
      const comparison = new Date(a.tanggal) - new Date(b.tanggal);
      return sort === 'tanggal-asc' ? comparison : -comparison;
    });
  }, [items, query, sort]);

  const closeModal = () => {
    if (!submitting) setModal(null);
  };

  const handleSave = async (data) => {
    setSubmitting(true);
    try {
      if (modal.type === 'create') {
        await createPrestasi(data);
        setFeedback({ type: 'success', message: 'Prestasi berhasil ditambahkan.' });
      } else {
        await updatePrestasi(modal.item.id, data);
        setFeedback({ type: 'success', message: 'Prestasi berhasil diperbarui.' });
      }
      setModal(null);
      await loadPrestasi();
    } catch (saveError) {
      setFeedback({ type: 'error', message: getErrorMessage(saveError, 'Prestasi gagal disimpan.') });
      return getErrorMessage(saveError, 'Prestasi gagal disimpan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deletePrestasi(modal.item.id);
      setModal(null);
      setFeedback({ type: 'success', message: 'Prestasi berhasil dihapus.' });
      await loadPrestasi();
    } catch (deleteError) {
      setFeedback({ type: 'error', message: getErrorMessage(deleteError, 'Prestasi gagal dihapus.') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Panel Admin</p>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-dark-900 sm:text-3xl">Kelola Prestasi</h1>
          <p className="mt-2 text-sm text-dark-500">Kelola pencapaian dan prestasi sekolah.</p>
        </div>
        <button type="button" onClick={() => setModal({ type: 'create' })} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-800"><Plus className="h-4 w-4" />Tambah Prestasi</button>
      </div>

      {feedback && <div className={`mt-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-primary-200 bg-primary-50 text-primary-800'}`} role="status">
        {feedback.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}<span className="flex-1">{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Tutup notifikasi"><X className="h-4 w-4" /></button>
      </div>}

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-dark-100 bg-white p-4 shadow-card sm:flex-row">
        <label className="relative min-w-0 flex-1"><span className="sr-only">Cari prestasi</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul, kategori, tingkat, atau deskripsi..." className="w-full rounded-lg border border-dark-200 py-2.5 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-dark-400 focus:border-primary" /></label>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-dark-200 px-3 py-2.5 text-sm text-dark-700 outline-none focus:border-primary" aria-label="Urutkan prestasi"><option value="tanggal-desc">Tanggal terbaru</option><option value="tanggal-asc">Tanggal terlama</option></select>
        <button type="button" onClick={loadPrestasi} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-dark-200 px-3 py-2.5 text-xs font-bold text-dark-600 hover:border-primary hover:text-primary disabled:opacity-50" title="Muat ulang"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /><span className="sm:hidden">Muat ulang</span></button>
      </div>

      <div className="mt-5">
        {loading ? <div className="rounded-2xl border border-dark-100 bg-white p-12 text-center text-sm text-dark-500 shadow-card">Memuat daftar prestasi...</div> : error ? <div className="rounded-2xl border border-primary-200 bg-primary-50 p-8 text-center shadow-card"><AlertCircle className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 text-sm font-semibold text-primary-800">{error}</p><button type="button" onClick={loadPrestasi} className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-800">Coba Lagi</button></div> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-dark-300 bg-white p-12 text-center shadow-card"><p className="text-sm font-semibold text-dark-700">Belum ada prestasi.</p><p className="mt-1 text-xs text-dark-500">Tambahkan prestasi pertama untuk mulai mengisi pencapaian sekolah.</p></div> : filteredItems.length === 0 ? <div className="rounded-2xl border border-dashed border-dark-300 bg-white p-12 text-center text-sm text-dark-500 shadow-card">Tidak ada prestasi yang cocok dengan pencarian.</div> : <PrestasiTable items={filteredItems} onDetail={(item) => setModal({ type: 'detail', item })} onEdit={(item) => setModal({ type: 'edit', item })} onDelete={(item) => setModal({ type: 'delete', item })} />}
      </div>

      {!loading && !error && items.length > 0 && <p className="mt-3 text-center text-xs text-dark-400">Menampilkan {filteredItems.length} dari {items.length} prestasi</p>}

      {modal?.type === 'create' || modal?.type === 'edit' ? <PrestasiModal title={modal.type === 'create' ? 'Tambah Prestasi' : 'Edit Prestasi'} onClose={closeModal}><PrestasiForm key={modal.item?.id || 'new'} initialData={modal.item} onSubmit={handleSave} onCancel={closeModal} submitting={submitting} /></PrestasiModal> : null}

      {modal?.type === 'detail' && <PrestasiModal title="Detail Prestasi" onClose={closeModal}>
        {modal.item.gambar_url && <img src={modal.item.gambar_url} alt="" className="mb-5 max-h-64 w-full rounded-xl object-cover" />}
        <div className="flex flex-wrap gap-2"><span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-bold text-primary">{modal.item.tingkat || 'Tingkat belum diisi'}</span>{modal.item.kategori && <span className="rounded-full bg-dark-100 px-2.5 py-1 text-[10px] font-bold text-dark-600">{modal.item.kategori}</span>}</div>
        <h3 className="mt-3 font-heading text-xl font-extrabold text-dark-900">{modal.item.judul}</h3>
        <p className="mt-2 text-xs text-dark-500">/{modal.item.slug} - Tanggal: {modal.item.tanggal ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(modal.item.tanggal)) : 'Belum diisi'}</p>
        <RichContent className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-dark-700" value={modal.item.deskripsi} />
        {modal.item.instagram_url && <a href={modal.item.instagram_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">Lihat post Instagram</a>}
        <p className="mt-5 text-xs text-dark-400">Dibuat: {formatDateTime(modal.item.created_at)}</p>
      </PrestasiModal>}

      {modal?.type === 'delete' && <PrestasiModal title="Hapus Prestasi" onClose={closeModal} size="max-w-md"><p className="text-sm leading-relaxed text-dark-600">Yakin ingin menghapus prestasi <strong className="text-dark-900">{modal.item.judul}</strong>? Tindakan ini tidak dapat dibatalkan.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeModal} disabled={submitting} className="rounded-lg border border-dark-200 px-4 py-2.5 text-xs font-bold text-dark-600 hover:border-dark-400 disabled:opacity-50">Batal</button><button type="button" onClick={handleDelete} disabled={submitting} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Menghapus...' : 'Ya, Hapus'}</button></div></PrestasiModal>}
    </section>
  );
};

export default PrestasiPage;

