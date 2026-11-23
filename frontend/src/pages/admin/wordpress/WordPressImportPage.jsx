import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Ban, CheckCircle2, FileUp, Library, RefreshCw, Trash2, UploadCloud, X,
} from 'lucide-react';
import PageHeader from '../../../components/dashboard/PageHeader';
import Modal from '../../../components/dashboard/Modal';
import {
  cancelWordPressJob, deleteWordPressJob, getWordPressJobProgress, getWordPressJobs, uploadWordPressSql,
} from '../../../services/wordpressArchiveService';
import { apiErrorMessage } from '../../../utils/apiError';

const STATUS_LABEL = {
  uploaded: 'Menunggu diproses',
  processing: 'Diproses',
  completed: 'Selesai',
  partially_completed: 'Selesai sebagian',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
};

const STATUS_TONE = {
  uploaded: 'bg-dark-100 text-dark-600',
  processing: 'bg-blue-50 text-blue-600',
  completed: 'bg-green-50 text-green-600',
  partially_completed: 'bg-orange-50 text-orange-600',
  failed: 'bg-primary-50 text-primary',
  cancelled: 'bg-dark-100 text-dark-600',
};

const formatDate = (value) => (value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-');
const formatBytes = (value) => {
  const size = Number(value || 0);
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const StatCard = ({ label, value, tone = 'text-dark-900' }) => (
  <div className="rounded-2xl border border-dark-100 bg-white p-4 shadow-card">
    <p className="text-[11px] font-bold uppercase tracking-wide text-dark-500">{label}</p>
    <p className={`mt-1 font-heading text-2xl font-extrabold ${tone}`}>{value ?? 0}</p>
  </div>
);

const WordPressImportPage = () => {
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [progress, setProgress] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  const loadJobs = useCallback(async (page = 1) => {
    setError('');
    try {
      const result = await getWordPressJobs({ page, limit: 10 });
      setJobs(result.data);
      setPagination(result.pagination);
      setSelectedJobId((current) => current || result.data[0]?.id || '');
      return result.data;
    } catch (loadError) {
      setError(apiErrorMessage(loadError, 'Daftar job import gagal dimuat.'));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void loadJobs(1), 0);
    return () => window.clearTimeout(task);
  }, [loadJobs]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 6000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const activeJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) || jobs[0] || null, [jobs, selectedJobId]);
  const isProcessing = activeJob && ['uploaded', 'processing'].includes(activeJob.status);

  useEffect(() => {
    if (!activeJob?.id) {
      const reset = window.setTimeout(() => setProgress(null), 0);
      return () => window.clearTimeout(reset);
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const result = await getWordPressJobProgress(activeJob.id);
        if (!cancelled) setProgress(result.data);
        if (!cancelled && ['completed', 'partially_completed', 'failed', 'cancelled'].includes(result.data.status) && isProcessing) {
          void loadJobs(pagination.page);
        }
      } catch {
        // Polling bersifat best-effort; kesalahan sesaat tidak mengubah UI.
      }
    };
    void tick();
    if (isProcessing) {
      pollRef.current = window.setInterval(tick, 2500);
      return () => { cancelled = true; window.clearInterval(pollRef.current); };
    }
    return () => { cancelled = true; };
  }, [activeJob?.id, isProcessing, loadJobs, pagination.page]);

  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.sql$/i.test(file.name)) {
      setFeedback({ type: 'error', message: 'File harus berekstensi .sql.' });
      return;
    }
    setUploading(true);
    setFeedback(null);
    try {
      const result = await uploadWordPressSql(file);
      if (result.duplicate) {
        setFeedback({ type: 'warning', message: 'File dengan checksum sama sudah pernah diunggah. Job lama dibuka, tidak ada pemrosesan duplikat.' });
        setSelectedJobId(result.data.id);
      } else {
        setFeedback({ type: 'success', message: 'File SQL diterima. Analisis dan adaptasi berjalan di latar belakang.' });
      }
      await loadJobs(1);
    } catch (uploadError) {
      setFeedback({ type: 'error', message: apiErrorMessage(uploadError, 'Upload SQL gagal.') });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleCancel = async (job) => {
    try {
      await cancelWordPressJob(job.id);
      setFeedback({ type: 'success', message: 'Permintaan pembatalan dikirim.' });
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await loadJobs(pagination.page);
    } catch (cancelError) {
      setFeedback({ type: 'error', message: apiErrorMessage(cancelError, 'Job tidak dapat dibatalkan.') });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteWordPressJob(deleteTarget.id);
      const data = result.data || {};
      setFeedback({
        type: 'success',
        message: `Job "${deleteTarget.originalFileName}" dihapus. ${data.deletedItemCount ?? 0} arsip ikut dihapus`
          + `${data.preservedImportedCount ? `; ${data.preservedImportedCount} konten yang sudah masuk CMS tetap aman` : ''}.`,
      });
      if (selectedJobId === deleteTarget.id) setSelectedJobId('');
      setDeleteTarget(null);
      await loadJobs(1);
    } catch (deleteError) {
      setFeedback({ type: 'error', message: apiErrorMessage(deleteError, 'Job gagal dihapus.', {
        job_active: 'Job masih diproses. Tunggu hingga selesai atau batalkan terlebih dahulu.',
        not_found: 'Job sudah tidak ada. Muat ulang daftar job.',
      }) });
    } finally {
      setDeleting(false);
    }
  };

  const stats = progress || activeJob;

  return (
    <section>
      <PageHeader
        judul="Import & Adaptasi WordPress"
        breadcrumb={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'WordPress', to: '/dashboard/wordpress/import' }, { label: 'Import & Adaptasi' }]}
        aksi={<Link to="/dashboard/wordpress/library" className="inline-flex items-center gap-2 rounded-lg border border-dark-200 px-4 py-2.5 text-xs font-bold text-dark-600 transition-colors hover:border-primary hover:text-primary"><Library className="h-4 w-4" />Pustaka Konten</Link>}
      />

      {feedback && <div className={`mb-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : feedback.type === 'warning' ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-primary-200 bg-primary-50 text-primary-800'}`} role="status">
        {feedback.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
        <span className="flex-1">{feedback.message}</span>
        <button type="button" onClick={() => setFeedback(null)} aria-label="Tutup notifikasi"><X className="h-4 w-4" /></button>
      </div>}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-card">
          <h2 className="font-heading text-base font-extrabold text-dark-900">Unggah dump SQL WordPress</h2>
          <p className="mt-1 text-xs leading-relaxed text-dark-500">File SQL diperlakukan sebagai data: tidak ada statement yang dieksekusi. Hanya tabel <code className="rounded bg-dark-100 px-1">ic_posts</code> yang diurai. Maksimal ukuran mengikuti konfigurasi server.</p>

          <div
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFile(event.dataTransfer.files?.[0]); }}
            className={`mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${dragging ? 'border-primary bg-primary-50' : 'border-dark-200 bg-dark-50/50'}`}
          >
            <UploadCloud className="h-9 w-9 text-primary" />
            <p className="mt-3 text-sm font-semibold text-dark-700">Tarik file .sql ke sini</p>
            <p className="mt-1 text-xs text-dark-500">atau pilih file dari komputer</p>
            <input ref={inputRef} id="wordpress-sql-file" type="file" accept=".sql,application/sql,text/plain" className="sr-only" onChange={(event) => void handleFile(event.target.files?.[0])} />
            <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-800 disabled:opacity-60">
              {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {uploading ? 'Mengunggah...' : 'Pilih file SQL'}
            </button>
          </div>

          <dl className="mt-5 grid gap-2 text-xs text-dark-600 sm:grid-cols-2">
            <div className="rounded-lg bg-dark-50 px-3 py-2"><dt className="font-bold text-dark-700">post_title</dt><dd>judul</dd></div>
            <div className="rounded-lg bg-dark-50 px-3 py-2"><dt className="font-bold text-dark-700">post_name</dt><dd>slug</dd></div>
            <div className="rounded-lg bg-dark-50 px-3 py-2"><dt className="font-bold text-dark-700">post_excerpt</dt><dd>ringkasan</dd></div>
            <div className="rounded-lg bg-dark-50 px-3 py-2"><dt className="font-bold text-dark-700">post_content</dt><dd>konten tersanitasi</dd></div>
            <div className="rounded-lg bg-dark-50 px-3 py-2"><dt className="font-bold text-dark-700">guid / gambar</dt><dd>kandidat gambar</dd></div>
            <div className="rounded-lg bg-dark-50 px-3 py-2"><dt className="font-bold text-dark-700">post_date</dt><dd>tanggal sumber (bukan tanggal event)</dd></div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-dark-400">Hasil adaptasi tidak pernah langsung terbit. Status WordPress hanya disimpan sebagai metadata sumber.</p>
        </div>

        <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-base font-extrabold text-dark-900">Statistik job</h2>
              <p className="mt-1 text-xs text-dark-500">{activeJob ? `${activeJob.originalFileName} · ${formatBytes(activeJob.fileSize)}` : 'Belum ada job dipilih.'}</p>
            </div>
            <button type="button" onClick={() => void loadJobs(pagination.page)} className="rounded-lg border border-dark-200 p-2 text-dark-500 hover:border-primary hover:text-primary" aria-label="Muat ulang job" title="Muat ulang"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>

          {error && <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-800">{error}</div>}

          {!activeJob ? <p className="mt-6 text-sm text-dark-500">Unggah dump SQL untuk memulai analisis.</p> : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span className={`rounded-full px-2.5 py-1 font-bold ${STATUS_TONE[activeJob.status] || STATUS_TONE.uploaded}`}>{STATUS_LABEL[activeJob.status] || activeJob.status}</span>
                <span className="text-dark-500">Dibuat {formatDate(activeJob.createdAt)}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-dark-100" role="progressbar" aria-valuenow={stats?.progress ?? 0} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats?.progress ?? 0}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-dark-500">{stats?.progress ?? 0}% · {stats?.processedRows ?? 0} baris diproses</p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatCard label="Total record" value={stats?.totalSourceRecords ?? 0} />
                <StatCard label="Kandidat" value={stats?.candidateCount ?? 0} />
                <StatCard label="Berita" value={stats?.beritaCount ?? 0} />
                <StatCard label="Pengumuman" value={stats?.pengumumanCount ?? 0} />
                <StatCard label="Prestasi" value={stats?.prestasiCount ?? 0} />
                <StatCard label="Perlu review" value={stats?.reviewCount ?? 0} tone="text-orange-600" />
                <StatCard label="Diabaikan" value={stats?.skippedCount ?? 0} tone="text-dark-500" />
                <StatCard label="Gagal" value={stats?.failedCount ?? 0} tone="text-primary" />
              </div>

              {stats?.errorSummary && <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">{stats.errorSummary}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/dashboard/wordpress/library?jobId=${activeJob.id}`} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-800"><Library className="h-4 w-4" />Buka hasil adaptasi</Link>
                {isProcessing && <button type="button" onClick={() => void handleCancel(activeJob)} className="inline-flex items-center gap-2 rounded-lg border border-dark-200 px-3 py-2 text-xs font-bold text-dark-600 hover:border-primary hover:text-primary"><Ban className="h-4 w-4" />Batalkan</button>}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dark-100 px-5 py-4">
          <h2 className="font-heading text-base font-extrabold text-dark-900">Histori import</h2>
          <p className="text-xs text-dark-500">{pagination.total} job</p>
        </div>
        {loading ? <p className="p-8 text-center text-sm text-dark-500">Memuat histori...</p> : jobs.length === 0 ? <p className="p-8 text-center text-sm text-dark-500">Belum ada file SQL yang diunggah.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-dark-50 text-[11px] font-bold uppercase tracking-wide text-dark-500">
                <tr>
                  <th className="px-5 py-3">File</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Record</th>
                  <th className="px-4 py-3">Kandidat</th>
                  <th className="px-4 py-3">Review</th>
                  <th className="px-4 py-3">Dibuat</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100">
                {jobs.map((job) => (
                  <tr key={job.id} className={`text-sm text-dark-700 ${job.id === activeJob?.id ? 'bg-primary-50/40' : ''}`}>
                    <td className="max-w-[260px] px-5 py-4"><button type="button" onClick={() => setSelectedJobId(job.id)} className="truncate text-left font-semibold text-dark-900 hover:text-primary">{job.originalFileName}</button><p className="mt-1 text-[11px] text-dark-400">{job.sourceChecksum.slice(0, 12)}…</p></td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_TONE[job.status] || STATUS_TONE.uploaded}`}>{STATUS_LABEL[job.status] || job.status}</span></td>
                    <td className="px-4 py-4 text-xs">{job.totalSourceRecords}</td>
                    <td className="px-4 py-4 text-xs">{job.candidateCount}</td>
                    <td className="px-4 py-4 text-xs">{job.reviewCount}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-dark-500">{formatDate(job.createdAt)}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link to={`/dashboard/wordpress/library?jobId=${job.id}`} className="text-xs font-bold text-primary hover:underline">Lihat</Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(job)}
                          disabled={['uploaded', 'processing'].includes(job.status)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-primary hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title={['uploaded', 'processing'].includes(job.status) ? 'Job sedang diproses' : 'Hapus file SQL dan arsipnya'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-dark-100 px-5 py-3 text-xs text-dark-500">
            <span>Halaman {pagination.page} dari {pagination.pages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={pagination.page <= 1} onClick={() => void loadJobs(pagination.page - 1)} className="rounded-lg border border-dark-200 px-3 py-1.5 font-bold text-dark-600 disabled:opacity-40">Sebelumnya</button>
              <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => void loadJobs(pagination.page + 1)} className="rounded-lg border border-dark-200 px-3 py-1.5 font-bold text-dark-600 disabled:opacity-40">Berikutnya</button>
            </div>
          </div>
        )}
      </div>

      <Modal
        terbuka={Boolean(deleteTarget)}
        onTutup={() => !deleting && setDeleteTarget(null)}
        judul="Hapus file SQL dan arsipnya?"
        deskripsi={deleteTarget ? `${deleteTarget.originalFileName} · ${formatBytes(deleteTarget.fileSize)}` : undefined}
        busy={deleting}
        lebar="max-w-lg"
      >
        <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm leading-relaxed text-primary-900">
          Penghapusan file SQL akan menghapus histori job dan seluruh arsip konten WordPress yang masih terhubung dengan file ini. Konten yang sudah berhasil dimasukkan ke CMS (Berita, Pengumuman, atau Prestasi) tidak akan dihapus.
        </div>
        <p className="mt-3 text-xs leading-relaxed text-dark-500">
          Tindakan ini permanen dan tidak dapat dibatalkan. Gambar yang sudah diunduh tetap tersimpan selama dipakai konten CMS.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="rounded-lg border border-dark-200 px-4 py-2 text-xs font-bold text-dark-600 disabled:opacity-50">Batal</button>
          <button type="button" disabled={deleting} onClick={() => void handleDelete()} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-60">{deleting ? 'Menghapus...' : 'Hapus Permanen'}</button>
        </div>
      </Modal>
    </section>
  );
};

export default WordPressImportPage;