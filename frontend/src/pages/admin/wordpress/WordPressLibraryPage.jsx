import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Eye, Library, RefreshCw, Search, Upload, X,
} from 'lucide-react';
import PageHeader from '../../../components/dashboard/PageHeader';
import Modal from '../../../components/dashboard/Modal';
import ContentImage from '../../../components/ContentImage';
import WordPressArchiveItemModal from './WordPressArchiveItemModal';
import {
  bulkWordPressArchiveAction, getWordPressArchive, getWordPressJobs,
} from '../../../services/wordpressArchiveService';
import { apiErrorMessage } from '../../../utils/apiError';

const TARGET_LABEL = { berita: 'Berita', pengumuman: 'Pengumuman', prestasi: 'Prestasi', needs_review: 'Perlu review' };
const REVIEW_LABEL = { pending_review: 'Perlu review', ready: 'Siap diaudit', in_audit: 'Sedang diaudit', imported: 'Sudah diimport', skipped: 'Dilewati', failed: 'Gagal' };
const REVIEW_TONE = { pending_review: 'bg-orange-50 text-orange-600', ready: 'bg-blue-50 text-blue-600', in_audit: 'bg-purple-50 text-purple-700', imported: 'bg-green-50 text-green-600', skipped: 'bg-dark-100 text-dark-600', failed: 'bg-primary-50 text-primary' };

const formatDate = (value) => (value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : '-');

const WordPressLibraryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [targetType, setTargetType] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [jobId, setJobId] = useState(searchParams.get('jobId') || '');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [detailId, setDetailId] = useState('');
  const [bulkAction, setBulkAction] = useState(null);
  const [busy, setBusy] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(query.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (searchParams.get('jobId') !== jobId) {
      const next = new URLSearchParams(searchParams);
      if (jobId) next.set('jobId', jobId); else next.delete('jobId');
      setSearchParams(next, { replace: true });
    }
  }, [jobId, searchParams, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getWordPressArchive({ targetType, reviewStatus, jobId, search, sort, order, page, limit: pageSize });
      setItems(result.data);
      setPagination(result.pagination);
      setSelected(new Set());
    } catch (loadError) {
      setError(apiErrorMessage(loadError, 'Pustaka arsip gagal dimuat.'));
    } finally {
      setLoading(false);
    }
  }, [targetType, reviewStatus, jobId, search, sort, order, page]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  useEffect(() => {
    let active = true;
    getWordPressJobs({ limit: 50 })
      .then((result) => active && setJobs(result.data))
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 6000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const selectedItems = useMemo(() => items.filter((item) => selected.has(item.id)), [items, selected]);

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  const toggleOne = (id) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const runBulk = async () => {
    const ids = selectedItems.map((item) => item.id);
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const action = bulkAction === 'audit' ? 'audit' : bulkAction === 'ready' ? 'ready' : 'skip';
      const result = await bulkWordPressArchiveAction(ids, action);
      const summary = result.data;
      setFeedback({
        type: summary.failed > 0 ? 'error' : 'success',
        message: `${summary.ok} item diproses${summary.skippedImported ? `, ${summary.skippedImported} item sudah diimpor tetap tidak berubah` : ''}${summary.failed ? `, ${summary.failed} gagal` : ''}.`,
      });
      setBulkAction(null);
      await load();
      if (action === 'audit' && summary.ok === 1) {
        const response = await getWordPressArchive({ jobId, search, limit: 100 });
        const target = response.data.find((item) => ids.includes(item.id));
        if (target) navigate(`/dashboard/wordpress/audit/${target.id}`);
      }
    } catch (actionError) {
      setFeedback({ type: 'error', message: apiErrorMessage(actionError, 'Aksi massal gagal.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <PageHeader
        judul="Pustaka Konten WordPress"
        breadcrumb={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'WordPress', to: '/dashboard/wordpress/import' }, { label: 'Pustaka Konten' }]}
        aksi={<Link to="/dashboard/wordpress/import" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-800"><Upload className="h-4 w-4" />Import SQL Baru</Link>}
      />

      {feedback && <div className={`mb-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-primary-200 bg-primary-50 text-primary-800'}`} role="status">
        {feedback.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
        <span className="flex-1">{feedback.message}</span>
        <button type="button" onClick={() => setFeedback(null)} aria-label="Tutup notifikasi"><X className="h-4 w-4" /></button>
      </div>}

      <div className="rounded-2xl border border-dark-100 bg-white p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative xl:col-span-2">
            <span className="sr-only">Cari arsip</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul, slug, atau isi..." className="w-full rounded-lg border border-dark-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary" />
          </label>
          <select value={targetType} onChange={(event) => { setTargetType(event.target.value); setPage(1); }} className="rounded-lg border border-dark-200 px-3 py-2.5 text-sm text-dark-700 outline-none focus:border-primary" aria-label="Filter jenis target">
            <option value="">Semua jenis</option>
            <option value="berita">Berita</option>
            <option value="pengumuman">Pengumuman</option>
            <option value="prestasi">Prestasi</option>
            <option value="needs_review">Perlu review</option>
          </select>
          <select value={reviewStatus} onChange={(event) => { setReviewStatus(event.target.value); setPage(1); }} className="rounded-lg border border-dark-200 px-3 py-2.5 text-sm text-dark-700 outline-none focus:border-primary" aria-label="Filter status review">
            <option value="">Semua status</option>
            {Object.entries(REVIEW_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={jobId} onChange={(event) => { setJobId(event.target.value); setPage(1); }} className="rounded-lg border border-dark-200 px-3 py-2.5 text-sm text-dark-700 outline-none focus:border-primary" aria-label="Filter job upload">
            <option value="">Semua job</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.originalFileName}</option>)}
          </select>
          <div className="flex gap-2">
            <select value={`${sort}:${order}`} onChange={(event) => { const [nextSort, nextOrder] = event.target.value.split(':'); setSort(nextSort); setOrder(nextOrder); setPage(1); }} className="min-w-0 flex-1 rounded-lg border border-dark-200 px-3 py-2.5 text-sm text-dark-700 outline-none focus:border-primary" aria-label="Urutkan">
              <option value="createdAt:desc">Terbaru diarsipkan</option>
              <option value="sourceDate:desc">Tanggal sumber terbaru</option>
              <option value="sourceDate:asc">Tanggal sumber terlama</option>
              <option value="title:asc">Judul A-Z</option>
              <option value="title:desc">Judul Z-A</option>
            </select>
            <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-dark-200 px-3 text-dark-600 hover:border-primary hover:text-primary disabled:opacity-50" title="Muat ulang" aria-label="Muat ulang"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>

        {selectedItems.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-800">
          <span>{selectedItems.length} item dipilih</span>
          <button type="button" onClick={() => setBulkAction('audit')} className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white hover:bg-primary-800">Audit Konten</button>
          <button type="button" onClick={() => setBulkAction('ready')} className="rounded-lg border border-primary/30 px-3 py-1.5 text-[11px] font-bold hover:bg-white">Tandai Siap</button>
          <button type="button" onClick={() => setBulkAction('skip')} className="rounded-lg border border-primary/30 px-3 py-1.5 text-[11px] font-bold hover:bg-white">Lewati</button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-[11px] underline">Bersihkan pilihan</button>
        </div>}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-card">
        {loading ? (
          <div className="p-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Memuat pustaka arsip...</span>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex animate-pulse items-center gap-4">
                  <div className="h-4 w-4 rounded bg-dark-100" />
                  <div className="h-10 w-14 rounded bg-dark-100" />
                  <div className="flex-1 space-y-2"><div className="h-3.5 w-2/3 rounded bg-dark-100" /><div className="h-3 w-1/3 rounded bg-dark-100" /></div>
                  <div className="h-6 w-20 rounded-full bg-dark-100" />
                  <div className="h-8 w-24 rounded bg-dark-100" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center"><AlertCircle className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 text-sm font-semibold text-primary-800">{error}</p><button type="button" onClick={() => void load()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white">Coba Lagi</button></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center"><Library className="mx-auto h-9 w-9 text-dark-300" /><p className="mt-3 text-sm font-semibold text-dark-700">Belum ada konten yang cocok.</p><p className="mt-1 text-xs text-dark-500">Ubah filter/pencarian, atau unggah dump SQL di menu Import & Adaptasi WordPress.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] table-fixed text-left">
              <thead className="border-b border-dark-100 bg-dark-50 text-[11px] font-bold uppercase tracking-wide text-dark-500">
                <tr>
                  <th className="w-10 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Pilih semua item di halaman ini" /></th>
                  <th className="w-[34%] px-3 py-3">Judul dan slug</th>
                  <th className="w-[11%] px-3 py-3">Jenis target</th>
                  <th className="w-[14%] px-3 py-3">Status review</th>
                  <th className="w-[11%] px-3 py-3">Tanggal sumber</th>
                  <th className="w-[10%] px-3 py-3">Gambar</th>
                  <th className="w-[11%] px-3 py-3">Status import</th>
                  <th className="w-[9%] px-3 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {items.map((item) => {
                  const imported = Boolean(item.importedAt) || item.reviewStatus === 'imported';
                  return (
                    <tr key={item.id} className="align-top text-sm text-dark-700 hover:bg-dark-50/60">
                      <td className="px-4 py-4"><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleOne(item.id)} aria-label={`Pilih ${item.title}`} /></td>
                      <td className="px-3 py-4">
                        <button type="button" onClick={() => setDetailId(item.id)} title={item.title} className="line-clamp-2 break-words text-left font-semibold leading-snug text-dark-900 hover:text-primary">{item.title || '(tanpa judul)'}</button>
                        <p className="mt-1 truncate text-[11px] text-dark-400" title={`/${item.slug} · WP #${item.wordpressId}`}>/{item.slug} · WP #{item.wordpressId}</p>
                      </td>
                      <td className="px-3 py-4 text-xs">{TARGET_LABEL[item.targetType] || item.targetType}</td>
                      <td className="px-3 py-4"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${REVIEW_TONE[item.reviewStatus] || 'bg-dark-100 text-dark-600'}`}>{REVIEW_LABEL[item.reviewStatus] || item.reviewStatus}</span></td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs text-dark-500">{formatDate(item.sourceDate)}</td>
                      <td className="px-3 py-4">
                        <ContentImage src={item.imageUrl} alt={`Gambar ${item.title}`} className="h-10 w-14 rounded object-cover" />
                      </td>
                      <td className="px-3 py-4 text-xs">{imported ? <span className="font-semibold text-green-700">{formatDate(item.importedAt)}</span> : <span className="text-dark-400">Belum diimpor</span>}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-col items-end gap-1">
                          <button type="button" onClick={() => setDetailId(item.id)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-bold text-dark-600 hover:bg-dark-100"><Eye className="h-4 w-4" />Detail</button>
                          {!imported && <button type="button" onClick={() => navigate(`/dashboard/wordpress/audit/${item.id}`)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-bold text-primary hover:bg-primary-50"><ClipboardCheck className="h-4 w-4" />Audit</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-dark-100 px-5 py-3 text-xs text-dark-500">
            <span>Halaman {pagination.page} dari {pagination.pages} · {pagination.total} item</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-1 rounded-lg border border-dark-200 px-3 py-1.5 font-bold text-dark-600 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" />Sebelumnya</button>
              <button type="button" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-lg border border-dark-200 px-3 py-1.5 font-bold text-dark-600 disabled:opacity-40">Berikutnya<ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
      </div>

      <Modal terbuka={Boolean(bulkAction)} onTutup={() => !busy && setBulkAction(null)} judul={bulkAction === 'audit' ? 'Masukkan ke Audit Konten' : bulkAction === 'ready' ? 'Tandai siap diaudit' : 'Lewati item terpilih'} deskripsi="Tindakan divalidasi backend sesuai state machine." busy={busy} lebar="max-w-lg">
        <p className="text-sm leading-relaxed text-dark-600">
          {bulkAction === 'audit'
            ? `${selectedItems.length} item akan dimasukkan ke antrean Audit Konten. Item yang sudah diimpor tidak akan diubah.`
            : bulkAction === 'ready'
              ? `${selectedItems.length} item akan ditandai siap diaudit.`
              : `${selectedItems.length} item akan ditandai dilewati.`}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={() => setBulkAction(null)} className="rounded-lg border border-dark-200 px-4 py-2 text-xs font-bold text-dark-600 disabled:opacity-50">Batal</button>
          <button type="button" disabled={busy} onClick={runBulk} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-60">{busy ? 'Memproses...' : bulkAction === 'audit' ? 'Masukkan ke Audit' : 'Lanjutkan'}</button>
        </div>
      </Modal>

      {detailId && <WordPressArchiveItemModal itemId={detailId} onClose={() => setDetailId('')} onChanged={load} />}
    </section>
  );
};

export default WordPressLibraryPage;