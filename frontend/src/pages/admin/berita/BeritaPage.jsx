import RichContent from '../../../components/RichContent';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Plus, RefreshCw, Search, X } from 'lucide-react';
import BeritaForm from './BeritaForm';
import BeritaModal from './BeritaModal';
import BeritaTable from './BeritaTable';
import { createBerita, deleteBerita, getBerita, updateBerita } from '../../../services/beritaService';
import { apiErrorMessage } from '../../../utils/apiError';

const getErrorMessage = (error, fallback) => apiErrorMessage(error, fallback, {
  duplicate: 'Slug tersebut sudah digunakan. Gunakan slug yang berbeda.',
  not_found: 'Berita sudah tidak tersedia. Muat ulang daftar berita.',
});

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(date));
};

const BeritaPage = () => {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [query, setQuery] = useState(() => searchParams.get('cari') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadBerita = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getBerita());
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Daftar berita gagal dimuat.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch awal menyinkronkan state halaman dengan data backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBerita();
  }, [loadBerita]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const searchable = [item.judul, item.slug, item.ringkasan, item.penulis].filter(Boolean).join(' ').toLowerCase();
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [items, query, statusFilter]);

  const closeModal = () => {
    if (!submitting) setModal(null);
  };

  const handleSave = async (data) => {
    setSubmitting(true);
    try {
      if (modal.type === 'create') {
        await createBerita(data);
        setFeedback({ type: 'success', message: 'Berita berhasil ditambahkan.' });
      } else {
        await updateBerita(modal.item.id, data);
        setFeedback({ type: 'success', message: 'Berita berhasil diperbarui.' });
      }
      setModal(null);
      await loadBerita();
    } catch (saveError) {
      setFeedback({ type: 'error', message: getErrorMessage(saveError, 'Berita gagal disimpan.') });
      return getErrorMessage(saveError, 'Berita gagal disimpan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteBerita(modal.item.id);
      setModal(null);
      setFeedback({ type: 'success', message: 'Berita berhasil dihapus.' });
      await loadBerita();
    } catch (deleteError) {
      setFeedback({ type: 'error', message: getErrorMessage(deleteError, 'Berita gagal dihapus.') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Panel Admin</p>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-dark-900 sm:text-3xl">Kelola Berita</h1>
          <p className="mt-2 text-sm text-dark-500">Kelola artikel berita sekolah dan status publikasinya.</p>
        </div>
        <button type="button" onClick={() => setModal({ type: 'create' })} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-800">
          <Plus className="h-4 w-4" />
          Tambah Berita
        </button>
      </div>

      {feedback && (
        <div className={`mt-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-primary-200 bg-primary-50 text-primary-800'}`} role="status">
          {feedback.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="flex-1">{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Tutup notifikasi"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-dark-100 bg-white p-4 shadow-card sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Cari berita</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul, slug, ringkasan, atau penulis..." className="w-full rounded-lg border border-dark-200 py-2.5 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-dark-400 focus:border-primary" />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-dark-200 px-3 py-2.5 text-sm text-dark-700 outline-none focus:border-primary" aria-label="Filter status berita">
          <option value="all">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button type="button" onClick={loadBerita} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-dark-200 px-3 py-2.5 text-xs font-bold text-dark-600 hover:border-primary hover:text-primary disabled:opacity-50" title="Muat ulang">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="sm:hidden">Muat ulang</span>
        </button>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="rounded-2xl border border-dark-100 bg-white p-12 text-center text-sm text-dark-500 shadow-card">Memuat daftar berita...</div>
        ) : error ? (
          <div className="rounded-2xl border border-primary-200 bg-primary-50 p-8 text-center shadow-card">
            <AlertCircle className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 text-sm font-semibold text-primary-800">{error}</p>
            <button type="button" onClick={loadBerita} className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-800">Coba Lagi</button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-dark-300 bg-white p-12 text-center shadow-card">
            <p className="text-sm font-semibold text-dark-700">Belum ada berita.</p>
            <p className="mt-1 text-xs text-dark-500">Tambahkan berita pertama untuk mulai mengisi konten.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-dark-300 bg-white p-12 text-center shadow-card text-sm text-dark-500">Tidak ada berita yang cocok dengan pencarian atau filter.</div>
        ) : (
          <BeritaTable items={filteredItems} onDetail={(item) => setModal({ type: 'detail', item })} onEdit={(item) => setModal({ type: 'edit', item })} onDelete={(item) => setModal({ type: 'delete', item })} />
        )}
      </div>

      {!loading && !error && items.length > 0 && <p className="mt-3 text-center text-xs text-dark-400">Menampilkan {filteredItems.length} dari {items.length} berita</p>}

      {modal?.type === 'create' || modal?.type === 'edit' ? (
        <BeritaModal title={modal.type === 'create' ? 'Tambah Berita' : 'Edit Berita'} onClose={closeModal}>
          <BeritaForm key={modal.item?.id || 'new'} initialData={modal.item} onSubmit={handleSave} onCancel={closeModal} submitting={submitting} />
        </BeritaModal>
      ) : null}

      {modal?.type === 'detail' && (
        <BeritaModal title="Detail Berita" onClose={closeModal}>
          {modal.item.gambar_url && <img src={modal.item.gambar_url} alt="" className="mb-5 max-h-64 w-full rounded-xl object-cover" />}
          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${modal.item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-dark-100 text-dark-600'}`}>{modal.item.status === 'published' ? 'Published' : 'Draft'}</span>
          <h3 className="mt-3 font-heading text-xl font-extrabold text-dark-900">{modal.item.judul}</h3>
          <p className="mt-2 text-xs text-dark-500">/{modal.item.slug} · {modal.item.penulis || 'Tanpa penulis'} · {formatDateTime(modal.item.created_at)}</p>
          {modal.item.ringkasan && <p className="mt-5 rounded-lg bg-dark-50 p-4 text-sm font-medium leading-relaxed text-dark-700">{modal.item.ringkasan}</p>}
          <RichContent className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-dark-700" value={modal.item.konten} />
        </BeritaModal>
      )}

      {modal?.type === 'delete' && (
        <BeritaModal title="Hapus Berita" onClose={closeModal} size="max-w-md">
          <p className="text-sm leading-relaxed text-dark-600">Yakin ingin menghapus berita <strong className="text-dark-900">{modal.item.judul}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeModal} disabled={submitting} className="rounded-lg border border-dark-200 px-4 py-2.5 text-xs font-bold text-dark-600 hover:border-dark-400 disabled:opacity-50">Batal</button>
            <button type="button" onClick={handleDelete} disabled={submitting} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Menghapus...' : 'Ya, Hapus'}</button>
          </div>
        </BeritaModal>
      )}
    </section>
  );
};

export default BeritaPage;
