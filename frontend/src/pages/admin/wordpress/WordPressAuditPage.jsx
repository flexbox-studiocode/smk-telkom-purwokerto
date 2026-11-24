import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, ClipboardCheck, Eye, Save, Send, Sparkles } from 'lucide-react';
import PageHeader from '../../../components/dashboard/PageHeader';
import RichTextEditor from '../../../components/dashboard/RichTextEditor';
import RichContent from '../../../components/RichContent';
import {
  getWordPressAudit, getWordPressAuditItem, getWordPressAuditOverview,
  importWordPressArchiveItem, updateWordPressArchiveItem,
} from '../../../services/wordpressArchiveService';
import { apiErrorMessage } from '../../../utils/apiError';
import { richTextToPlain } from '../../../utils/richText';

const TARGET_LABEL = { berita: 'Berita', pengumuman: 'Pengumuman', prestasi: 'Prestasi', needs_review: 'Perlu review' };
const STATE_LABEL = { pending_review: 'Perlu review', ready: 'Siap diaudit', in_audit: 'Sedang diaudit', imported: 'Sudah diimpor', skipped: 'Dilewati', failed: 'Gagal', published: 'Terbit', draft: 'Draft' };
const inputClass = 'w-full rounded-lg border border-dark-200 px-3 py-2.5 text-sm text-dark-900 outline-none transition-colors placeholder:text-dark-400 focus:border-primary';
const labelClass = 'mb-1 block text-xs font-semibold text-dark-700';

const TABS = [
  { value: 'queue', label: 'Antrean audit' },
  { value: 'in_audit', label: 'Sedang diaudit' },
  { value: 'ready', label: 'Siap diaudit' },
  { value: 'imported', label: 'Sudah diimpor' },
];

function OverviewCards({ overview }) {
  if (!overview) return null;
  const cards = [
    { label: 'Antrean audit', value: overview.queueTotal },
    { label: 'Siap diaudit', value: overview.needCheck },
    { label: 'Sedang diaudit', value: overview.inAudit },
    { label: 'Perlu review', value: overview.pendingReview },
  ];
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-dark-100 bg-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wide text-dark-500">{card.label}</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-dark-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function AuditEditor({ itemId }) {
  const [item, setItem] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWordPressAuditItem(itemId);
      setItem(data);
      setForm({ title: data.title || '', slug: data.slug || '', summary: data.summary || '', content: data.content || '', targetType: data.targetType || 'needs_review' });
    } catch (error) { setFeedback({ type: 'error', message: apiErrorMessage(error, 'Item audit tidak dapat dibuka.') }); }
    finally { setLoading(false); }
  }, [itemId]);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const validate = () => {
    if (!form.title.trim() || !form.slug.trim() || !richTextToPlain(form.content).trim()) {
      setFeedback({ type: 'error', message: 'Judul, slug, dan isi wajib diisi.' });
      return false;
    }
    return true;
  };
  const save = async () => {
    if (!validate()) return;
    setBusy(true); setFeedback(null);
    try {
      await updateWordPressArchiveItem(itemId, { ...form, summary: form.summary.trim() || null });
      await load();
      setFeedback({ type: 'success', message: 'Perubahan audit tersimpan sebagai draft (belum diubah di CMS).' });
    } catch (error) { setFeedback({ type: 'error', message: apiErrorMessage(error, 'Perubahan gagal disimpan.') }); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    if (!validate()) return;
    setBusy(true); setFeedback(null);
    try {
      await updateWordPressArchiveItem(itemId, { ...form, summary: form.summary.trim() || null });
      await importWordPressArchiveItem(itemId, { status: 'published' });
      setFeedback({ type: 'success', message: 'Konten berhasil diterbitkan ke website.' });
      await load();
    } catch (error) {
      setFeedback({ type: 'error', message: apiErrorMessage(error, 'Publikasi gagal. Periksa field wajib dan target konten.', {
        already_imported: 'Item sudah pernah diterbitkan. Kelola perubahannya dari menu konten tujuan.',
        duplicate: 'Slug sudah dipakai konten lain. Ubah slug lalu coba lagi.',
      }) });
    } finally { setBusy(false); }
  };

  if (loading) return <p className="rounded-2xl border border-dark-100 bg-white p-10 text-center text-sm text-dark-500">Memuat item audit...</p>;
  if (!form || !item) return <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 text-sm text-primary-800">{feedback?.message || 'Item tidak ditemukan.'}</div>;

  const imported = item.reviewStatus === 'imported';
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-card">
        <div className="mb-5 flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <div><h2 className="font-heading text-lg font-extrabold text-dark-900">Editor Audit</h2><p className="text-xs text-dark-500">Semua perubahan aman: arsip sumber tidak pernah diubah.</p></div>
        </div>
        {feedback && <div className={`mb-4 flex gap-2 rounded-lg border px-3 py-2 text-xs ${feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-primary-200 bg-primary-50 text-primary-800'}`} role="status"><AlertCircle className="h-4 w-4 shrink-0" />{feedback.message}</div>}

        <label className={labelClass} htmlFor="audit-title">Judul</label>
        <input id="audit-title" className={inputClass} value={form.title} onChange={(e) => update('title', e.target.value)} disabled={imported} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><label className={labelClass} htmlFor="audit-slug">Slug arsip</label><input id="audit-slug" className={inputClass} value={form.slug} onChange={(e) => update('slug', e.target.value)} disabled={imported} />
            <p className="mt-1 text-[11px] leading-snug text-dark-500">Hanya untuk arsip. URL Berita dibuat server: judul + kode unik 3–8 digit.</p></div>
          <div><label className={labelClass} htmlFor="audit-target">Jenis tujuan</label><select id="audit-target" className={inputClass} value={form.targetType} onChange={(e) => update('targetType', e.target.value)} disabled={imported}>{Object.entries(TARGET_LABEL).filter(([key]) => key !== 'needs_review').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
        </div>
        <label className={`mt-4 ${labelClass}`} htmlFor="audit-summary">Ringkasan</label>
        <textarea id="audit-summary" className={inputClass} rows="3" value={form.summary} onChange={(e) => update('summary', e.target.value)} disabled={imported} />
        <label className={`mt-4 ${labelClass}`}>Isi konten</label>
        {imported
          ? <div className="rounded-xl border border-dark-100 p-4"><RichContent className="text-sm leading-relaxed text-dark-700" value={form.content} /></div>
          : <RichTextEditor value={form.content} onChange={(e) => update('content', e.target.value)} aria-label="Isi konten audit" />}

        {imported ? (
          <p className="mt-5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">Item ini sudah diimpor ke CMS. Perubahan lanjutan dilakukan dari menu konten tujuan.</p>
        ) : (
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg border border-dark-200 px-4 py-2.5 text-xs font-bold text-dark-700 disabled:opacity-50"><Save className="h-4 w-4" />Simpan Draft</button>
            <button type="button" disabled={busy || form.targetType === 'needs_review'} onClick={() => void publish()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" />Terbitkan</button>
          </div>
        )}
      </div>

      <aside className="h-fit rounded-2xl border border-dark-100 bg-white p-5 shadow-card xl:sticky xl:top-5">
        <p className="text-xs font-bold uppercase tracking-wide text-dark-500">Status audit</p>
        <p className="mt-2 text-sm font-bold text-dark-900">{STATE_LABEL[item.auditState] || item.auditState}</p>
        <dl className="mt-4 space-y-3 text-xs">
          <div><dt className="text-dark-500">Sumber</dt><dd className="font-semibold">{item.sourcePostType} · WP #{item.wordpressId}</dd></div>
          <div><dt className="text-dark-500">Target</dt><dd className="font-semibold">{TARGET_LABEL[form.targetType]}</dd></div>
          <div><dt className="text-dark-500">Status publikasi CMS</dt><dd className="font-semibold">{item.cmsStatus ? (STATE_LABEL[item.cmsStatus] || item.cmsStatus) : 'Belum diimpor'}</dd></div>
          <div><dt className="text-dark-500">Peringatan</dt><dd>{Array.isArray(item.metadata?.warnings) && item.metadata.warnings.length ? item.metadata.warnings.join(', ') : 'Tidak ada'}</dd></div>
        </dl>
      </aside>
    </div>
  );
}

function AuditQueue() {
  const [items, setItems] = useState([]);
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const task = window.setTimeout(() => {
      setLoading(true);
      Promise.all([getWordPressAudit({ status: tab, limit: 50 }), getWordPressAuditOverview()])
        .then(([list, stats]) => {
          if (!active) return;
          setItems(list.data);
          setOverview(stats.data);
        })
        .catch((loadError) => active && setError(apiErrorMessage(loadError, 'Antrean audit gagal dimuat.')))
        .finally(() => active && setLoading(false));
    }, 0);
    return () => { active = false; window.clearTimeout(task); };
  }, [tab]);

  return (
    <div>
      <OverviewCards overview={overview} />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button key={entry.value} type="button" onClick={() => setTab(entry.value)} className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${tab === entry.value ? 'bg-primary text-white' : 'border border-dark-200 text-dark-600 hover:border-primary hover:text-primary'}`}>{entry.label}</button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-card">
        {loading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-dark-100" />)}</div>
        ) : error ? (
          <p className="p-8 text-center text-sm text-primary">{error}</p>
        ) : items.length === 0 ? (
          <div className="p-12 text-center"><Sparkles className="mx-auto h-9 w-9 text-dark-300" /><p className="mt-3 text-sm font-semibold text-dark-700">Tidak ada konten pada kategori ini.</p><p className="mt-1 text-xs text-dark-500">Pilih konten dari Pustaka Konten lalu tekan “Audit Konten”.</p></div>
        ) : (
          <ul className="divide-y divide-dark-100">
            {items.map((item) => (
              <li key={item.id}>
                <Link to={`/dashboard/wordpress/audit/${item.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-dark-50/60">
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-dark-900">{item.title || '(tanpa judul)'}</strong>
                    <small className="text-xs text-dark-500">{TARGET_LABEL[item.targetType]} · {STATE_LABEL[item.auditState] || item.auditState} · WP #{item.wordpressId}</small>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-primary"><Eye className="h-4 w-4" />Lanjutkan Audit</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function WordPressAuditPage() {
  const { id } = useParams();
  return (
    <section>
      <PageHeader
        judul="Audit Konten"
        breadcrumb={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Muat Konten' }, { label: 'Audit Konten' }]}
        aksi={<Link to="/dashboard/wordpress/library" className="inline-flex items-center gap-2 rounded-lg border border-dark-200 px-4 py-2.5 text-xs font-bold text-dark-700"><ArrowLeft className="h-4 w-4" />Pustaka Konten</Link>}
      />
      {id ? <AuditEditor itemId={id} /> : <AuditQueue />}
    </section>
  );
}
