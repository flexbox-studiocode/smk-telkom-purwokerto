import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, ClipboardCheck, ExternalLink, ImageDown, Pencil, Save, SkipForward,
} from 'lucide-react';
import Modal from '../../../components/dashboard/Modal';
import RichContent from '../../../components/RichContent';
import RichTextEditor from '../../../components/dashboard/RichTextEditor';
import {
  getWordPressArchiveItem, importWordPressArchiveItem, resolveWordPressArchiveMedia,
  reviewWordPressArchiveItem, skipWordPressArchiveItem, startWordPressArchiveAudit,
  updateWordPressArchiveItem,
} from '../../../services/wordpressArchiveService';
import { apiErrorMessage } from '../../../utils/apiError';
import { richTextToPlain } from '../../../utils/richText';
import { normalizeArchiveNewlineArtifacts } from '../../../utils/normalizeArchiveText';

const TARGET_LABEL = { berita: 'Berita', pengumuman: 'Pengumuman', prestasi: 'Prestasi', needs_review: 'Perlu review' };
const REVIEW_LABEL = { pending_review: 'Perlu review', ready: 'Siap diaudit', in_audit: 'Sedang diaudit', imported: 'Sudah diimport', skipped: 'Dilewati', failed: 'Gagal' };
const CRUD_PATH = { berita: '/dashboard/berita', pengumuman: '/dashboard/pengumuman', prestasi: '/dashboard/prestasi' };
const REVIEW_TONE = {
  pending_review: 'border-amber-200 bg-amber-50 text-amber-800', ready: 'border-blue-200 bg-blue-50 text-blue-800',
  in_audit: 'border-violet-200 bg-violet-50 text-violet-800', imported: 'border-green-200 bg-green-50 text-green-800',
  skipped: 'border-dark-200 bg-dark-50 text-dark-600', failed: 'border-primary-200 bg-primary-50 text-primary-800',
};

const inputClass = 'w-full min-w-0 rounded-lg border border-dark-200 px-3 py-2 text-sm text-dark-900 outline-none transition-colors placeholder:text-dark-400 focus:border-primary';
const labelClass = 'mb-1 block text-xs font-semibold text-dark-700';
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dark-200 bg-white px-3 py-2 text-xs font-bold text-dark-700 transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:border-dark-100 disabled:bg-dark-50 disabled:text-dark-400';
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(date);
};
const formatSourceDate = (value) => {
  if (!value) return 'Tanggal sumber tidak tersedia';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Tanggal sumber tidak tersedia' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(date);
};

const WordPressArchiveItemModal = ({ itemId, onClose, onChanged }) => {
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('detail');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [failedImageUrl, setFailedImageUrl] = useState('');
  const [form, setForm] = useState({ title: '', slug: '', summary: '', content: '', targetType: 'needs_review', reviewNotes: '' });
  const [importedPublic, setImportedPublic] = useState(null);

  useEffect(() => {
    let active = true;
    const task = window.setTimeout(() => {
      setLoading(true);
      setError('');
    }, 0);
    getWordPressArchiveItem(itemId)
      .then((data) => {
        if (!active) return;
        setItem(data);
        setForm({
          title: data.title || '', slug: data.slug || '', summary: data.summary || '', content: data.content || '',
          targetType: data.targetType || 'needs_review', reviewNotes: data.reviewNotes || '',
        });
      })
      .catch((loadError) => active && setError(apiErrorMessage(loadError, 'Detail arsip gagal dimuat.')))
      .finally(() => active && setLoading(false));
    return () => { active = false; window.clearTimeout(task); };
  }, [itemId]);


  const warnings = useMemo(() => {
    const list = item?.metadata?.warnings;
    return Array.isArray(list) ? list : [];
  }, [item]);
  const reasons = useMemo(() => {
    const list = item?.metadata?.classifierReasons;
    return Array.isArray(list) ? list : [];
  }, [item]);

  const notify = (type, message) => setFeedback({ type, message });

  const reload = async () => {
    const data = await getWordPressArchiveItem(itemId);
    setItem(data);
    setForm({
      title: data.title || '', slug: data.slug || '', summary: data.summary || '', content: data.content || '',
      targetType: data.targetType || 'needs_review', reviewNotes: data.reviewNotes || '',
    });
    onChanged?.();
  };

  const handleSave = async () => {
    if (!form.title.trim()) { notify('error', 'Judul wajib diisi.'); return; }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) { notify('error', 'Slug hanya huruf kecil, angka, dan tanda hubung.'); return; }
    if (!richTextToPlain(form.content).trim()) { notify('error', 'Konten tidak boleh kosong.'); return; }
    setBusy(true);
    try {
      await updateWordPressArchiveItem(itemId, {
        title: form.title.trim(), slug: form.slug.trim(), summary: form.summary.trim() || null,
        content: form.content, targetType: form.targetType, reviewNotes: form.reviewNotes || null,
      });
      await reload();
      setMode('detail');
      notify('success', 'Perubahan disimpan ke arsip (bukan ke tabel publik).');
    } catch (saveError) {
      notify('error', apiErrorMessage(saveError, 'Perubahan gagal disimpan.'));
    } finally {
      setBusy(false);
    }
  };

  const handleReview = async (reviewStatus) => {
    setBusy(true);
    try {
      await reviewWordPressArchiveItem(itemId, { reviewStatus, reviewNotes: form.reviewNotes || null, targetType: form.targetType });
      await reload();
      notify('success', reviewStatus === 'ready' ? 'Item ditandai siap diimport.' : 'Item dikembalikan ke antrean review.');
    } catch (reviewError) {
      notify('error', apiErrorMessage(reviewError, 'Status review gagal diubah.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    setBusy(true);
    try {
      await skipWordPressArchiveItem(itemId, { reviewNotes: form.reviewNotes || null });
      await reload();
      notify('success', 'Item dilewati.');
    } catch (skipError) {
      notify('error', apiErrorMessage(skipError, 'Item gagal dilewati.'));
    } finally {
      setBusy(false);
    }
  };

  const handleAudit = async () => {
    setBusy(true);
    try {
      await startWordPressArchiveAudit(itemId, { targetType: form.targetType });
      onChanged?.();
      onClose();
      navigate(`/dashboard/wordpress/audit/${itemId}`);
    } catch (auditError) {
      notify('error', apiErrorMessage(auditError, 'Item gagal dimasukkan ke Audit Konten.', {
        already_imported: 'Item sudah diimpor ke CMS. Kelola perubahan melalui menu konten tujuan.',
        not_found: 'Item sudah dihapus. Muat ulang Pustaka Konten.',
      }));
      setBusy(false);
    }
  };

  const handleMedia = async () => {
    setBusy(true);
    try {
      await resolveWordPressArchiveMedia(itemId);
      await reload();
      notify('success', 'Gambar berhasil diverifikasi dan disimpan.');
    } catch (mediaError) {
      notify('error', apiErrorMessage(mediaError, 'Gambar tidak dapat diambil.'));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    try {
      const result = await importWordPressArchiveItem(itemId);
      setImportedPublic({ targetType: item.targetType, id: result.data.id });
      await reload();
      setMode('detail');
      notify('success', 'Konten masuk ke website sebagai DRAFT. Terbitkan manual dari menu pengelolaan.');
    } catch (importError) {
      notify('error', apiErrorMessage(importError, 'Import gagal.', {
        already_imported: 'Item ini sudah pernah diimport. Tidak ada duplikasi dibuat.',
        duplicate: 'Slug sudah dipakai konten lain. Ubah slug arsip lalu coba lagi.',
      }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      terbuka={Boolean(itemId)}
      onTutup={onClose}
      judul={mode === 'edit' ? 'Edit hasil adaptasi' : mode === 'import' ? 'Masukkan ke Website' : 'Detail Konten WordPress'}
      deskripsi={item ? 'Tinjau konten sumber dan kelola status arsip.' : undefined}
      lebar="max-w-[min(1120px,calc(100vw-2rem))]"
      contentClassName="sm:p-6"
      busy={busy}
    >
      {loading ? <div className="flex min-h-56 items-center justify-center" role="status"><p className="text-sm text-dark-500">Memuat detail...</p></div> : error ? (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-800" role="alert">{error}</div>
      ) : !item ? <p className="py-8 text-center text-sm text-dark-500">Konten tidak ditemukan.</p> : (
        <div className="min-w-0">
          {feedback && <div className={`mb-4 flex min-w-0 items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-primary-200 bg-primary-50 text-primary-800'}`} role="status">
            {feedback.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="min-w-0 flex-1 break-words">{feedback.message}</span>
          </div>}

          {importedPublic && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Berhasil dibuat sebagai draft. <Link to={CRUD_PATH[importedPublic.targetType]} className="font-bold underline underline-offset-2">Buka {TARGET_LABEL[importedPublic.targetType]} untuk memeriksa & menerbitkan</Link>.
          </div>}

          <section className="mb-5 rounded-xl border border-dark-100 bg-dark-50/70 p-3 sm:p-4" aria-label="Tindakan konten">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setMode(mode === 'edit' ? 'detail' : 'edit')} className={buttonClass} aria-label={mode === 'edit' ? 'Batalkan edit' : 'Edit arsip'}>
                <Pencil className="h-4 w-4 shrink-0" />{mode === 'edit' ? 'Batal edit' : 'Edit'}
              </button>
              {item.metadata?.imageCandidateUrl && <button type="button" disabled={busy} onClick={handleMedia} className={buttonClass}>
                <ImageDown className="h-4 w-4 shrink-0" />Ambil gambar
              </button>}
              <button type="button" disabled={busy || item.reviewStatus === 'imported'} onClick={() => handleReview('ready')} className={buttonClass}>Tandai siap</button>
              <button type="button" disabled={busy || item.reviewStatus === 'imported'} onClick={() => handleReview('pending_review')} className={buttonClass}>Perlu review</button>
              <button type="button" disabled={busy || item.reviewStatus === 'imported'} onClick={handleSkip} className={buttonClass}>
                <SkipForward className="h-4 w-4 shrink-0" />Lewati
              </button>
              <button type="button" disabled={busy || item.reviewStatus === 'imported'} onClick={() => void handleAudit()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-dark-300">
                <ClipboardCheck className="h-4 w-4 shrink-0" />Audit Konten
              </button>
              <div className="ml-auto flex flex-wrap items-center gap-1.5 sm:pl-2">
                <span className="rounded-full border border-dark-200 bg-white px-2.5 py-1 text-xs font-semibold text-dark-700">{TARGET_LABEL[item.targetType] || 'Perlu review'}</span>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${REVIEW_TONE[item.reviewStatus] || REVIEW_TONE.pending_review}`}>{REVIEW_LABEL[item.reviewStatus] || item.reviewStatus || 'Perlu review'}</span>
              </div>
            </div>
          </section>

          {mode === 'edit' ? (
            <div className="min-w-0 space-y-4">
              <div>
                <label htmlFor="wp-edit-title" className={labelClass}>Judul</label>
                <input id="wp-edit-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} />
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0"><label htmlFor="wp-edit-slug" className={labelClass}>Slug</label><input id="wp-edit-slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} className={inputClass} /></div>
                <div className="min-w-0"><label htmlFor="wp-edit-target" className={labelClass}>Target konten</label><select id="wp-edit-target" value={form.targetType} onChange={(event) => setForm((current) => ({ ...current, targetType: event.target.value }))} className={inputClass}>{Object.entries(TARGET_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              </div>
              <div><label htmlFor="wp-edit-summary" className={labelClass}>Ringkasan</label><textarea id="wp-edit-summary" value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} rows={3} className={`${inputClass} resize-y`} /></div>
              <div className="min-w-0"><label htmlFor="wp-edit-content" className={labelClass}>Konten (HTML disanitasi di server)</label><RichTextEditor id="wp-edit-content" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} disabled={busy} /></div>
              <div><label htmlFor="wp-edit-notes" className={labelClass}>Catatan review</label><textarea id="wp-edit-notes" value={form.reviewNotes} onChange={(event) => setForm((current) => ({ ...current, reviewNotes: event.target.value }))} rows={2} className={`${inputClass} resize-y`} /></div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-dark-100 pt-4">
                <button type="button" onClick={() => setMode('detail')} disabled={busy} className={buttonClass}>Batal</button>
                <button type="button" onClick={handleSave} disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-dark-300"><Save className="h-4 w-4" />{busy ? 'Menyimpan...' : 'Simpan ke arsip'}</button>
              </div>
            </div>
          ) : mode === 'import' ? (
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-dark-700">Konten akan dibuat di <strong>{TARGET_LABEL[item.targetType]}</strong> dengan status <strong>DRAFT</strong>. Periksa daftar berikut sebelum melanjutkan.</p>
              <ul className="mt-3 space-y-2 break-words text-sm text-dark-600">
                <li>Target: {TARGET_LABEL[item.targetType]}</li><li>Judul: {item.title}</li><li>Slug: {item.slug} (bentrok slug akan ditolak backend)</li>
                <li>Konten: {richTextToPlain(item.content).trim() ? 'terisi' : 'KOSONG — perbaiki dahulu'}</li>
                <li>Gambar: {item.imageUrl ? 'sudah tersimpan' : item.metadata?.imageCandidateUrl ? 'kandidat tersedia (opsional diambil)' : 'tidak digunakan'}</li>
                <li>Status import: {item.reviewStatus === 'imported' ? 'sudah pernah diimport' : 'belum pernah diimport'}</li>
              </ul>
              <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-dark-100 pt-4">
                <button type="button" onClick={() => setMode('detail')} disabled={busy} className={buttonClass}>Batal</button>
                <button type="button" onClick={handleImport} disabled={busy || !richTextToPlain(item.content).trim() || item.reviewStatus === 'imported'} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-dark-300">{busy ? 'Mengimport...' : 'Ya, masukkan sebagai draft'}</button>
              </div>
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)] lg:gap-6">
              <article className="min-w-0">
                {item.imageUrl && failedImageUrl !== item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title ? `Gambar utama: ${item.title}` : 'Gambar utama konten'} onError={() => setFailedImageUrl(item.imageUrl)} className="mb-5 max-h-[340px] w-full rounded-xl bg-dark-50 object-cover" />
                ) : item.imageUrl ? (
                  <div className="mb-5 flex h-28 items-center justify-center rounded-xl border border-dashed border-dark-200 bg-dark-50 text-sm text-dark-500">Gambar tidak dapat dimuat</div>
                ) : null}
                <h1 className="min-w-0 break-words font-heading text-2xl font-extrabold leading-tight text-dark-900 sm:text-[28px]" style={{ overflowWrap: 'anywhere' }}>{item.title}</h1>
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-dark-500">
                  <span className="min-w-0 break-all font-mono" title={`/${item.slug}`}>/{item.slug}</span><span aria-hidden="true">·</span><time dateTime={item.sourceDate || undefined}>{formatSourceDate(item.sourceDate)}</time>
                </div>
                {item.summary && <section className="mt-5 rounded-xl border border-primary-100 bg-primary-50/60 p-4" aria-label="Ringkasan">
                  <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-primary-800">Ringkasan</h2>
                  <p className="break-words text-sm leading-7 text-dark-700">{item.summary}</p>
                </section>}
                <section className="mt-5 min-w-0 rounded-xl border border-dark-100 bg-white p-4 sm:p-5" aria-label="Preview konten">
                  <RichContent className="text-[15px] leading-[1.75] text-dark-700" value={normalizeArchiveNewlineArtifacts(item.content || '<p><em>Konten kosong.</em></p>')} />
                </section>
                {item.reviewNotes && <section className="mt-4 rounded-xl border border-dark-100 bg-dark-50 p-4 text-sm leading-relaxed text-dark-600"><strong className="text-dark-800">Catatan review:</strong> <span className="break-words">{item.reviewNotes}</span></section>}
              </article>

              <aside className="min-w-0 space-y-4 lg:sticky lg:top-0">
                <section className="min-w-0 rounded-xl border border-dark-100 bg-white p-4">
                  <h2 className="mb-3 font-heading text-sm font-extrabold text-dark-900">Metadata sumber</h2>
                  <dl className="grid min-w-0 grid-cols-[minmax(88px,0.75fr)_minmax(0,1.25fr)] gap-x-3 gap-y-2.5 text-xs leading-relaxed">
                    <dt className="text-dark-500">WordPress ID</dt><dd className="min-w-0 break-words text-right font-mono text-dark-800">{item.wordpressId ?? '-'}</dd>
                    <dt className="text-dark-500">Tipe sumber</dt><dd className="min-w-0 break-words text-right text-dark-800">{item.sourcePostType || '-'}</dd>
                    <dt className="text-dark-500">Status sumber</dt><dd className="min-w-0 break-words text-right text-dark-800">{item.sourcePostStatus || '-'}</dd>
                    <dt className="text-dark-500">Slug sumber</dt><dd className="min-w-0 break-all text-right text-dark-800" title={item.sourceSlug || undefined}>{item.sourceSlug || '-'}</dd>
                    <dt className="text-dark-500">Tanggal sumber</dt><dd className="min-w-0 break-words text-right text-dark-800">{formatDate(item.sourceDate)}</dd>
                    <dt className="text-dark-500">Target</dt><dd className="min-w-0 break-words text-right text-dark-800">{TARGET_LABEL[item.targetType] || item.targetType || '-'}</dd>
                  </dl>
                  {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex max-w-full items-start gap-1.5 text-xs font-semibold leading-relaxed text-primary hover:underline" title={item.sourceUrl}>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="min-w-0 break-all">URL sumber: {item.sourceUrl}</span>
                  </a>}
                </section>

                <section className="min-w-0 rounded-xl border border-dark-100 bg-white p-4">
                  <h2 className="mb-3 font-heading text-sm font-extrabold text-dark-900">Alasan klasifikasi</h2>
                  {reasons.length === 0 ? <p className="text-xs leading-relaxed text-dark-500">Tidak ada catatan klasifikasi.</p> : <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-dark-700">{reasons.map((reason, index) => <li key={`${index}-${reason}`} className="break-words">{reason}</li>)}</ul>}
                </section>

                {warnings.length > 0 && <section className="min-w-0 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                  <h2 className="mb-2 font-heading text-sm font-extrabold text-amber-900">Peringatan validasi</h2>
                  <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-amber-900">{warnings.map((warning, index) => <li key={`${index}-${warning}`} className="break-words">{warning}</li>)}</ul>
                </section>}

                <section className="min-w-0 rounded-xl border border-dark-100 bg-white p-4">
                  <h2 className="mb-3 font-heading text-sm font-extrabold text-dark-900">Histori perubahan</h2>
                  {(!item.revisions || item.revisions.length === 0) ? <p className="text-xs leading-relaxed text-dark-500">Tidak ada perubahan pada konten ini.</p> : <ol className="space-y-3 border-l border-dark-200 pl-3">
                    {[...item.revisions].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)).map((revision) => <li key={revision.id} className="relative min-w-0 break-words text-xs leading-relaxed text-dark-600">
                      <span className="absolute -left-[calc(.75rem+.5px)] top-1 h-2 w-2 rounded-full border-2 border-white bg-primary" />
                      <span className="font-semibold text-dark-800">{revision.action}</span>
                      <time className="mt-0.5 block text-dark-500" dateTime={revision.createdAt || undefined}>{formatDate(revision.createdAt)}</time>
                      {revision.actor?.name && <span className="mt-0.5 block text-dark-500">oleh {revision.actor.name}</span>}
                    </li>)}
                  </ol>}
                </section>
              </aside>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default WordPressArchiveItemModal;
