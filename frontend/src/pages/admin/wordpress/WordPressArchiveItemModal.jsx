import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ClipboardCheck, ImageDown, Pencil, Save, SkipForward } from 'lucide-react';
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

const TARGET_LABEL = { berita: 'Berita', pengumuman: 'Pengumuman', prestasi: 'Prestasi', needs_review: 'Perlu review' };
const REVIEW_LABEL = { pending_review: 'Perlu review', ready: 'Siap diaudit', in_audit: 'Sedang diaudit', imported: 'Sudah diimport', skipped: 'Dilewati', failed: 'Gagal' };
const CRUD_PATH = { berita: '/dashboard/berita', pengumuman: '/dashboard/pengumuman', prestasi: '/dashboard/prestasi' };

const inputClass = 'w-full rounded-lg border border-dark-200 px-3 py-2 text-sm text-dark-900 outline-none transition-colors placeholder:text-dark-400 focus:border-primary';
const labelClass = 'mb-1 block text-xs font-semibold text-dark-700';

const formatDate = (value) => (value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)) : '-');

const WordPressArchiveItemModal = ({ itemId, onClose, onChanged }) => {
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('detail');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
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
          title: data.title || '',
          slug: data.slug || '',
          summary: data.summary || '',
          content: data.content || '',
          targetType: data.targetType || 'needs_review',
          reviewNotes: data.reviewNotes || '',
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
    <Modal terbuka={Boolean(itemId)} onTutup={onClose} judul={mode === 'edit' ? 'Edit hasil adaptasi' : mode === 'import' ? 'Masukkan ke Website' : 'Detail arsip WordPress'} deskripsi={item ? `${TARGET_LABEL[item.targetType]} · ${REVIEW_LABEL[item.reviewStatus]}` : undefined} lebar="max-w-4xl" busy={busy}>
      {loading ? <p className="py-8 text-center text-sm text-dark-500">Memuat detail...</p> : error ? (
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm text-primary-800">{error}</div>
      ) : !item ? null : (
        <div>
          {feedback && <div className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-primary-200 bg-primary-50 text-primary-800'}`} role="status">
            {feedback.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="flex-1">{feedback.message}</span>
          </div>}

          {importedPublic && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
            Berhasil dibuat sebagai draft. <Link to={CRUD_PATH[importedPublic.targetType]} className="font-bold underline">Buka {TARGET_LABEL[importedPublic.targetType]} untuk memeriksa & menerbitkan</Link>.
          </div>}

          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode(mode === 'edit' ? 'detail' : 'edit')} className="inline-flex items-center gap-1.5 rounded-lg border border-dark-200 px-3 py-2 text-xs font-bold text-dark-600 hover:border-primary hover:text-primary"><Pencil className="h-4 w-4" />{mode === 'edit' ? 'Batal edit' : 'Edit'}</button>
            {item.metadata?.imageCandidateUrl && <button type="button" disabled={busy} onClick={handleMedia} className="inline-flex items-center gap-1.5 rounded-lg border border-dark-200 px-3 py-2 text-xs font-bold text-dark-600 hover:border-primary hover:text-primary disabled:opacity-50"><ImageDown className="h-4 w-4" />Ambil gambar</button>}
            <button type="button" disabled={busy || item.reviewStatus === 'imported'} onClick={() => handleReview('ready')} className="rounded-lg border border-dark-200 px-3 py-2 text-xs font-bold text-dark-600 hover:border-primary hover:text-primary disabled:opacity-50">Tandai siap</button>
            <button type="button" disabled={busy || item.reviewStatus === 'imported'} onClick={() => handleReview('pending_review')} className="rounded-lg border border-dark-200 px-3 py-2 text-xs font-bold text-dark-600 hover:border-primary hover:text-primary disabled:opacity-50">Perlu review</button>
            <button type="button" disabled={busy || item.reviewStatus === 'imported'} onClick={handleSkip} className="inline-flex items-center gap-1.5 rounded-lg border border-dark-200 px-3 py-2 text-xs font-bold text-dark-600 hover:border-primary hover:text-primary disabled:opacity-50"><SkipForward className="h-4 w-4" />Lewati</button>
            <button type="button" disabled={busy || item.reviewStatus === 'imported'} onClick={() => void handleAudit()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-50"><ClipboardCheck className="h-4 w-4" />Audit Konten</button>
          </div>

          {mode === 'edit' ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="wp-edit-title" className={labelClass}>Judul</label>
                <input id="wp-edit-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="wp-edit-slug" className={labelClass}>Slug</label>
                  <input id="wp-edit-slug" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="wp-edit-target" className={labelClass}>Target konten</label>
                  <select id="wp-edit-target" value={form.targetType} onChange={(event) => setForm((current) => ({ ...current, targetType: event.target.value }))} className={inputClass}>
                    {Object.entries(TARGET_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="wp-edit-summary" className={labelClass}>Ringkasan</label>
                <textarea id="wp-edit-summary" value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} rows={3} className={inputClass} />
              </div>
              <div>
                <label htmlFor="wp-edit-content" className={labelClass}>Konten (HTML disanitasi di server)</label>
                <RichTextEditor id="wp-edit-content" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} disabled={busy} />
              </div>
              <div>
                <label htmlFor="wp-edit-notes" className={labelClass}>Catatan review</label>
                <textarea id="wp-edit-notes" value={form.reviewNotes} onChange={(event) => setForm((current) => ({ ...current, reviewNotes: event.target.value }))} rows={2} className={inputClass} />
              </div>
              <div className="flex justify-end gap-2 border-t border-dark-100 pt-3">
                <button type="button" onClick={() => setMode('detail')} disabled={busy} className="rounded-lg border border-dark-200 px-3 py-2 text-xs font-bold text-dark-600 disabled:opacity-50">Batal</button>
                <button type="button" onClick={handleSave} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-60"><Save className="h-4 w-4" />{busy ? 'Menyimpan...' : 'Simpan ke arsip'}</button>
              </div>
            </div>
          ) : mode === 'import' ? (
            <div>
              <p className="text-sm leading-relaxed text-dark-700">Konten akan dibuat di <strong>{TARGET_LABEL[item.targetType]}</strong> dengan status <strong>DRAFT</strong>. Periksa daftar berikut sebelum melanjutkan.</p>
              <ul className="mt-3 space-y-1.5 text-xs text-dark-600">
                <li>· Target: {TARGET_LABEL[item.targetType]}</li>
                <li>· Judul: {item.title}</li>
                <li>· Slug: {item.slug} (bentrok slug akan ditolak backend)</li>
                <li>· Konten: {richTextToPlain(item.content).trim() ? 'terisi' : 'KOSONG — perbaiki dahulu'}</li>
                <li>· Gambar: {item.imageUrl ? 'sudah tersimpan' : item.metadata?.imageCandidateUrl ? 'kandidat tersedia (opsional diambil)' : 'tidak digunakan'}</li>
                <li>· Status import: {item.reviewStatus === 'imported' ? 'sudah pernah diimport' : 'belum pernah diimport'}</li>
              </ul>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setMode('detail')} disabled={busy} className="rounded-lg border border-dark-200 px-4 py-2 text-xs font-bold text-dark-600 disabled:opacity-50">Batal</button>
                <button type="button" onClick={handleImport} disabled={busy || !richTextToPlain(item.content).trim() || item.reviewStatus === 'imported'} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-50">{busy ? 'Mengimport...' : 'Ya, masukkan sebagai draft'}</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <div>
                {item.imageUrl ? <img src={item.imageUrl} alt="" className="mb-4 max-h-60 w-full rounded-xl object-cover" /> : null}
                <h3 className="font-heading text-xl font-extrabold text-dark-900">{item.title}</h3>
                <p className="mt-1 text-xs text-dark-500">/{item.slug} · {item.sourceDate ? formatDate(item.sourceDate) : 'Tanggal sumber tidak tersedia'}</p>
                {item.summary && <p className="mt-3 rounded-lg bg-dark-50 px-3 py-2 text-sm text-dark-600">{item.summary}</p>}
                <div className="mt-4 rounded-xl border border-dark-100 p-4">
                  <RichContent className="text-sm leading-relaxed text-dark-700" value={item.content || '<p><em>Konten kosong.</em></p>'} />
                </div>
                {item.reviewNotes && <p className="mt-3 text-xs text-dark-500"><strong>Catatan review:</strong> {item.reviewNotes}</p>}
              </div>
              <aside className="space-y-3 text-xs text-dark-600">
                <div className="rounded-xl border border-dark-100 p-3">
                  <h4 className="mb-2 font-bold text-dark-900">Metadata sumber</h4>
                  <dl className="space-y-1">
                    <div className="flex justify-between gap-2"><dt>WordPress ID</dt><dd className="font-mono">{item.wordpressId}</dd></div>
                    <div className="flex justify-between gap-2"><dt>Tipe sumber</dt><dd>{item.sourcePostType}</dd></div>
                    <div className="flex justify-between gap-2"><dt>Status sumber</dt><dd>{item.sourcePostStatus || '-'}</dd></div>
                    <div className="flex justify-between gap-2"><dt>Slug sumber</dt><dd className="max-w-[60%] truncate">{item.sourceSlug || '-'}</dd></div>
                    <div className="flex justify-between gap-2"><dt>Tanggal sumber</dt><dd>{formatDate(item.sourceDate)}</dd></div>
                    <div className="flex justify-between gap-2"><dt>Target</dt><dd>{TARGET_LABEL[item.targetType]}</dd></div>
                  </dl>
                  {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-primary hover:underline">URL sumber</a>}
                </div>
                <div className="rounded-xl border border-dark-100 p-3">
                  <h4 className="mb-2 font-bold text-dark-900">Alasan klasifikasi</h4>
                  {reasons.length === 0 ? <p className="text-dark-500">Tidak ada catatan.</p> : <ul className="list-disc space-y-1 pl-4">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
                  {warnings.length > 0 && <><h5 className="mt-2 font-bold text-orange-700">Peringatan validasi</h5><ul className="list-disc space-y-1 pl-4 text-orange-700">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></>}
                </div>
                <div className="rounded-xl border border-dark-100 p-3">
                  <h4 className="mb-2 font-bold text-dark-900">Histori perubahan</h4>
                  {(!item.revisions || item.revisions.length === 0) ? <p className="text-dark-500">Belum ada perubahan.</p> : <ul className="space-y-1.5">{item.revisions.map((revision) => <li key={revision.id}><span className="font-semibold">{revision.action}</span> · {formatDate(revision.createdAt)}</li>)}</ul>}
                </div>
              </aside>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default WordPressArchiveItemModal;