import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Save, Send, AlertCircle } from 'lucide-react';
import PageHeader from '../../../components/dashboard/PageHeader';
import RichTextEditor from '../../../components/dashboard/RichTextEditor';
import {
  getWordPressArchive, getWordPressArchiveItem, importWordPressArchiveItem,
  updateWordPressArchiveItem,
} from '../../../services/wordpressArchiveService';
import { apiErrorMessage } from '../../../utils/apiError';
import { richTextToPlain } from '../../../utils/richText';

const TARGET_LABEL = { berita: 'Berita', pengumuman: 'Pengumuman', prestasi: 'Prestasi', needs_review: 'Perlu review' };
const inputClass = 'w-full rounded-lg border border-dark-200 px-3 py-2.5 text-sm outline-none focus:border-primary';

function AuditEditor({ itemId }) {
  const [item, setItem] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWordPressArchiveItem(itemId);
      setItem(data);
      setForm({ title: data.title || '', slug: data.slug || '', summary: data.summary || '', content: data.content || '', targetType: data.targetType || 'needs_review' });
    } catch (error) { setFeedback(apiErrorMessage(error, 'Item audit tidak dapat dibuka.')); }
    finally { setLoading(false); }
  }, [itemId]);
  // Dijadwalkan pada tick berikutnya agar tidak memicu cascading render sinkron.
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!form.title.trim() || !form.slug.trim() || !richTextToPlain(form.content).trim()) { setFeedback('Judul, slug, dan isi wajib diisi.'); return; }
    setBusy(true); setFeedback('');
    try { await updateWordPressArchiveItem(itemId, { ...form, summary: form.summary.trim() || null }); await load(); setFeedback('Perubahan audit tersimpan.'); }
    catch (error) { setFeedback(apiErrorMessage(error, 'Perubahan gagal disimpan.')); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    setBusy(true); setFeedback('');
    try { await updateWordPressArchiveItem(itemId, { ...form, summary: form.summary.trim() || null, reviewStatus: 'ready' }); await importWordPressArchiveItem(itemId, { status: 'published' }); setFeedback('Konten berhasil diterbitkan.'); await load(); }
    catch (error) { setFeedback(apiErrorMessage(error, 'Publikasi gagal. Periksa field wajib dan target konten.')); }
    finally { setBusy(false); }
  };

  if (loading) return <p className="rounded-2xl border border-dark-100 bg-white p-10 text-center text-sm text-dark-500">Memuat item audit...</p>;
  if (!form || !item) return <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 text-sm text-primary-800">{feedback || 'Item tidak ditemukan.'}</div>;

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
    <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-card">
      <div className="mb-5 flex items-center gap-3"><ClipboardCheck className="h-6 w-6 text-primary" /><div><h2 className="font-heading text-lg font-extrabold text-dark-900">Editor Audit</h2><p className="text-xs text-dark-500">Perubahan tidak mengubah arsip sumber secara destruktif.</p></div></div>
      {feedback && <div className="mb-4 flex gap-2 rounded-lg border border-dark-200 bg-dark-50 px-3 py-2 text-xs text-dark-700"><AlertCircle className="h-4 w-4 shrink-0" />{feedback}</div>}
      <label className="mb-1 block text-xs font-semibold">Judul</label><input className={inputClass} value={form.title} onChange={(e) => update('title', e.target.value)} />
      <div className="mt-4 grid gap-4 md:grid-cols-2"><div><label className="mb-1 block text-xs font-semibold">Slug</label><input className={inputClass} value={form.slug} onChange={(e) => update('slug', e.target.value)} /></div><div><label className="mb-1 block text-xs font-semibold">Jenis tujuan</label><select className={inputClass} value={form.targetType} onChange={(e) => update('targetType', e.target.value)}>{Object.entries(TARGET_LABEL).filter(([key]) => key !== 'needs_review').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div></div>
      <label className="mt-4 mb-1 block text-xs font-semibold">Ringkasan</label><textarea className={inputClass} rows="3" value={form.summary} onChange={(e) => update('summary', e.target.value)} />
      <label className="mt-4 mb-1 block text-xs font-semibold">Isi konten</label><RichTextEditor value={form.content} onChange={(e) => update('content', e.target.value)} aria-label="Isi konten audit" />
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-lg border border-dark-200 px-4 py-2.5 text-xs font-bold"><Save className="h-4 w-4" />Simpan Draft</button><button type="button" disabled={busy || form.targetType === 'needs_review'} onClick={() => void publish()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" />Terbitkan</button></div>
    </div>
    <aside className="h-fit rounded-2xl border border-dark-100 bg-white p-5 shadow-card xl:sticky xl:top-5"><p className="text-xs font-bold uppercase tracking-wide text-dark-500">Status audit</p><p className="mt-2 text-sm font-bold text-dark-900">{item.reviewStatus}</p><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-dark-500">Sumber</dt><dd className="font-semibold">{item.sourcePostType} · WP #{item.wordpressId}</dd></div><div><dt className="text-dark-500">Target</dt><dd className="font-semibold">{TARGET_LABEL[form.targetType]}</dd></div><div><dt className="text-dark-500">Peringatan</dt><dd>{Array.isArray(item.metadata?.warnings) && item.metadata.warnings.length ? item.metadata.warnings.join(', ') : 'Tidak ada'}</dd></div></dl></aside>
  </div>;
}

export default function WordPressAuditPage() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { if (!id) getWordPressArchive({ reviewStatus: 'ready', limit: 50 }).then((result) => setItems(result.data)).catch((e) => setError(apiErrorMessage(e, 'Antrean audit gagal dimuat.'))); }, [id]);
  return <section><PageHeader judul="Audit Konten" breadcrumb={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Muat Konten' }, { label: 'Audit Konten' }]} aksi={<Link to="/dashboard/wordpress/library" className="inline-flex items-center gap-2 rounded-lg border border-dark-200 px-4 py-2.5 text-xs font-bold"><ArrowLeft className="h-4 w-4" />Pustaka Konten</Link>} />{id ? <AuditEditor itemId={id} /> : <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-card">{error && <p className="mb-4 text-sm text-primary">{error}</p>}{items.length ? <div className="divide-y divide-dark-100">{items.map((item) => <Link key={item.id} to={`/dashboard/wordpress/audit/${item.id}`} className="flex items-center justify-between gap-4 py-4 hover:text-primary"><span><strong className="block text-sm">{item.title}</strong><small className="text-xs text-dark-500">{TARGET_LABEL[item.targetType]} · {item.reviewStatus}</small></span><span className="text-xs font-bold">Lanjutkan Audit</span></Link>)}</div> : <p className="py-8 text-center text-sm text-dark-500">Belum ada konten dalam antrean audit. Pilih konten dari Pustaka.</p>}</div>}</section>;
}
