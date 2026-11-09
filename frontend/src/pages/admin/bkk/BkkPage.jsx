import RichContent from '../../../components/RichContent';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, MapPin, Plus, RefreshCw, Search, X } from 'lucide-react';
import BkkForm from './BkkForm';
import BkkModal from './BkkModal';
import BkkTable from './BkkTable';
import { createBkk, deleteBkk, getBkk, updateBkk } from '../../../services/bkkService';
import { formatDateOnly, toDateKey } from '../../../utils/date';
import { apiErrorMessage } from '../../../utils/apiError';

const getErrorMessage = (error, fallback) => apiErrorMessage(error, fallback);
const formatDate = (date) => date ? formatDateOnly(date, { dateStyle: 'long' }) : 'Belum ditentukan';
const isPastDeadline = (deadline) => {
  const key = toDateKey(deadline);
  return key ? key < new Date().toISOString().slice(0, 10) : false;
};

const BkkPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sort, setSort] = useState('deadline-asc');
  const [modal, setModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadBkk = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getBkk());
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Daftar lowongan BKK gagal dimuat.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch awal menyinkronkan state halaman dengan data backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBkk();
  }, [loadBkk]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const locations = useMemo(() => [...new Set(items.map((item) => item.lokasi).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = items.filter((item) => {
      const searchable = [item.perusahaan, item.posisi, item.lokasi, item.tipe_pekerjaan].filter(Boolean).join(' ').toLowerCase();
      return (statusFilter === 'all' || item.status === statusFilter) && (locationFilter === 'all' || item.lokasi === locationFilter) && (!normalizedQuery || searchable.includes(normalizedQuery));
    });

    return [...result].sort((a, b) => {
      if (sort === 'terbaru') return new Date(b.created_at) - new Date(a.created_at);
      if (!a.deadline && !b.deadline) return new Date(b.created_at) - new Date(a.created_at);
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      const comparison = toDateKey(a.deadline).localeCompare(toDateKey(b.deadline));
      return sort === 'deadline-desc' ? -comparison : comparison;
    });
  }, [items, locationFilter, query, sort, statusFilter]);

  const closeModal = () => { if (!submitting) setModal(null); };

  const handleSave = async (data) => {
    setSubmitting(true);
    try {
      if (modal.type === 'create') {
        await createBkk(data);
        setFeedback({ type: 'success', message: 'BKK berhasil ditambahkan.' });
      } else {
        await updateBkk(modal.item.id, data);
        setFeedback({ type: 'success', message: 'BKK berhasil diperbarui.' });
      }
      setModal(null);
      await loadBkk();
    } catch (saveError) {
      setFeedback({ type: 'error', message: getErrorMessage(saveError, 'BKK gagal disimpan.') });
      return getErrorMessage(saveError, 'BKK gagal disimpan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteBkk(modal.item.id);
      setModal(null);
      setFeedback({ type: 'success', message: 'BKK berhasil dihapus.' });
      await loadBkk();
    } catch (deleteError) {
      setFeedback({ type: 'error', message: getErrorMessage(deleteError, 'BKK gagal dihapus.') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Panel Admin</p><h1 className="mt-2 font-heading text-2xl font-extrabold text-dark-900 sm:text-3xl">Kelola BKK</h1><p className="mt-2 text-sm text-dark-500">Kelola lowongan kerja dan peluang karier dari BKK.</p></div><button type="button" onClick={() => setModal({ type: 'create' })} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-800"><Plus className="h-4 w-4" />Tambah BKK</button></div>

      {feedback && <div className={`mt-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-primary-200 bg-primary-50 text-primary-800'}`} role="status">{feedback.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}<span className="flex-1">{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Tutup notifikasi"><X className="h-4 w-4" /></button></div>}

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-dark-100 bg-white p-4 shadow-card sm:flex-row sm:flex-wrap"><label className="relative min-w-0 flex-1"><span className="sr-only">Cari BKK</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari perusahaan, posisi, lokasi, atau tipe pekerjaan..." className="w-full rounded-lg border border-dark-200 py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-dark-400 focus:border-primary" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-dark-200 px-3 py-2.5 text-sm text-dark-700 outline-none focus:border-primary" aria-label="Filter status BKK"><option value="all">Semua Status</option><option value="aktif">Aktif</option><option value="ditutup">Ditutup</option></select><select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className="rounded-lg border border-dark-200 px-3 py-2.5 text-sm text-dark-700 outline-none focus:border-primary" aria-label="Filter lokasi BKK"><option value="all">Semua Lokasi</option>{locations.map((location) => <option key={location} value={location}>{location}</option>)}</select><select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-dark-200 px-3 py-2.5 text-sm text-dark-700 outline-none focus:border-primary" aria-label="Urutkan BKK"><option value="deadline-asc">Deadline terdekat</option><option value="deadline-desc">Deadline terjauh</option><option value="terbaru">Terbaru</option></select><button type="button" onClick={loadBkk} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-dark-200 px-3 py-2.5 text-xs font-bold text-dark-600 hover:border-primary hover:text-primary disabled:opacity-50" title="Muat ulang"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /><span className="sm:hidden">Muat ulang</span></button></div>

      <div className="mt-5">{loading ? <div className="rounded-2xl border border-dark-100 bg-white p-12 text-center text-sm text-dark-500 shadow-card">Memuat daftar BKK...</div> : error ? <div className="rounded-2xl border border-primary-200 bg-primary-50 p-8 text-center shadow-card"><AlertCircle className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 text-sm font-semibold text-primary-800">{error}</p><button type="button" onClick={loadBkk} className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-800">Coba Lagi</button></div> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-dark-300 bg-white p-12 text-center shadow-card"><p className="text-sm font-semibold text-dark-700">Belum ada BKK.</p><p className="mt-1 text-xs text-dark-500">Tambahkan lowongan pertama untuk mulai mengisi peluang karier.</p></div> : filteredItems.length === 0 ? <div className="rounded-2xl border border-dashed border-dark-300 bg-white p-12 text-center text-sm text-dark-500 shadow-card">Tidak ada BKK yang cocok dengan pencarian atau filter.</div> : <BkkTable items={filteredItems} onDetail={(item) => setModal({ type: 'detail', item })} onEdit={(item) => setModal({ type: 'edit', item })} onDelete={(item) => setModal({ type: 'delete', item })} />}</div>

      {!loading && !error && items.length > 0 && <p className="mt-3 text-center text-xs text-dark-400">Menampilkan {filteredItems.length} dari {items.length} BKK</p>}

      {modal?.type === 'create' || modal?.type === 'edit' ? <BkkModal title={modal.type === 'create' ? 'Tambah BKK' : 'Edit BKK'} onClose={closeModal}><BkkForm key={modal.item?.id || 'new'} initialData={modal.item} onSubmit={handleSave} onCancel={closeModal} submitting={submitting} /></BkkModal> : null}

      {modal?.type === 'detail' && <BkkModal title="Detail BKK" onClose={closeModal}>{modal.item.logo_url && <img src={modal.item.logo_url} alt={`Logo ${modal.item.perusahaan}`} className="mb-5 h-16 max-w-48 object-contain" />}<div className="flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${modal.item.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-dark-100 text-dark-600'}`}>{modal.item.status === 'aktif' ? 'Aktif' : 'Ditutup'}</span>{modal.item.tipe_pekerjaan && <span className="rounded-full bg-dark-100 px-2.5 py-1 text-[10px] font-bold text-dark-600">{modal.item.tipe_pekerjaan}</span>}</div><h3 className="mt-3 font-heading text-xl font-extrabold text-dark-900">{modal.item.posisi}</h3><p className="mt-1 text-sm font-semibold text-dark-600">{modal.item.perusahaan}</p><p className="mt-3 flex items-center gap-1 text-xs text-dark-500"><MapPin className="h-4 w-4" />{modal.item.lokasi || 'Lokasi belum ditentukan'}</p><p className={`mt-2 text-xs ${isPastDeadline(modal.item.deadline) ? 'font-semibold text-primary-700' : 'text-dark-500'}`}>Deadline: {formatDate(modal.item.deadline)}{isPastDeadline(modal.item.deadline) && ' (terlewat)'}</p>{modal.item.deskripsi && <RichContent className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-dark-700" value={modal.item.deskripsi} />}{modal.item.link_pendaftaran && <a href={modal.item.link_pendaftaran} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-800">Buka Link Pendaftaran <ExternalLink className="h-4 w-4" /></a>}</BkkModal>}

      {modal?.type === 'delete' && <BkkModal title="Hapus BKK" onClose={closeModal} size="max-w-md"><p className="text-sm leading-relaxed text-dark-600">Yakin ingin menghapus lowongan <strong className="text-dark-900">{modal.item.posisi} di {modal.item.perusahaan}</strong>? Tindakan ini tidak dapat dibatalkan.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeModal} disabled={submitting} className="rounded-lg border border-dark-200 px-4 py-2.5 text-xs font-bold text-dark-600 hover:border-dark-400 disabled:opacity-50">Batal</button><button type="button" onClick={handleDelete} disabled={submitting} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Menghapus...' : 'Ya, Hapus'}</button></div></BkkModal>}
    </section>
  );
};

export default BkkPage;

