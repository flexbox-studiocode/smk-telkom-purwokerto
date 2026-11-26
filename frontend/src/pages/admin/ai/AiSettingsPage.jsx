import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Bot, CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, RefreshCw, Save, ShieldCheck, Wifi } from 'lucide-react';
import FormInput from '../../../components/dashboard/FormInput';
import { getAiSettings, removeAiApiKey, saveAiSettings, setAiServiceStatus, testAiConnection } from '../../../services/aiSettingsService';

const SERVICES = [
  { key: 'stela', name: 'NEXA AI', description: 'Asisten AI untuk menjawab pertanyaan seputar SMK Telkom Purwokerto.', enabledHint: 'Mengatur endpoint chat NEXA.' },
  { key: 'nexttel', name: 'NextTel', description: 'Asisten rekomendasi jurusan yang membantu siswa memahami hasil pemetaan minat dan bakat.', enabledHint: 'Hanya mengatur penjelasan hasil. Scoring lokal tetap berjalan saat layanan AI nonaktif.' },
];
const DEFAULT_FORM = { provider: 'gemini', endpoint: '', model: 'gemini-2.5-flash', apiKey: '', enabled: false };
const PROVIDER_OPTIONS = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI-compatible API' },
];
const ERROR_SAFE = 'Gagal memproses konfigurasi AI. Periksa data, koneksi, dan pengaturan server.';

const formatDate = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Belum pernah diperbarui';

export function ServiceCard({ service, settings, onChanged }) {
  const config = settings.find((item) => item.service === service.key);
  const [editing, setEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (editing) {
      // Form state must reset when admin opens editor for current config.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        provider: config?.provider || DEFAULT_FORM.provider,
        endpoint: config?.provider === 'gemini' && config?.endpoint?.includes('generativelanguage.googleapis.com') ? '' : config?.endpoint || '',
        model: config?.model || (service.key === 'stela' ? 'gemini-2.5-flash' : 'gemini-2.5-flash'),
        apiKey: '',
        enabled: config?.enabled || false,
      });
      setShowKey(false);
    }
  }, [editing, config, service.key]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const safeAction = async (action, successText) => {
    setBusy(action);
    setMessage(null);
    try {
      if (action === 'save') await saveAiSettings(service.key, form);
      else if (action === 'test') await testAiConnection(service.key, form);
      else if (action === 'toggle') await setAiServiceStatus(service.key, !config?.enabled);
      else if (action === 'remove') {
        if (!window.confirm('API key tersimpan akan dihapus. Konfigurasi environment lama dapat menjadi fallback NEXA. Lanjutkan?')) return;
        await removeAiApiKey(service.key);
      }
      setMessage({ type: 'success', text: successText });
      if (action === 'save') { setEditing(false); setForm((current) => ({ ...current, apiKey: '' })); }
      await onChanged();
    } catch (error) {
      const timeout = error?.code === 'provider_timeout';
      setMessage({ type: 'error', text: action === 'test' ? (timeout ? 'Koneksi timeout. Periksa endpoint dan coba lagi.' : 'Koneksi gagal. Periksa provider, model, endpoint, dan API key.') : ERROR_SAFE });
    } finally {
      setBusy('');
    }
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-card">
      <header className="flex items-start gap-4 border-b border-dark-100 bg-gradient-to-r from-primary-50/80 to-white p-5 sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-card"><Bot className="h-6 w-6" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-lg font-extrabold text-dark-900">{service.name}</h2>
          <p className="mt-1 text-sm leading-relaxed text-dark-600">{service.description}</p>
          {service.key === 'nexttel' && <p className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-800">Scoring lokal selalu aktif. {service.enabledHint}</p>}
        </div>
      </header>

      {message && <div role="status" className={`mx-5 mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm sm:mx-6 ${message.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{message.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}<span>{message.text}</span></div>}

      {!editing ? (
        <div className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-[11px] font-bold uppercase tracking-wide text-dark-400">Status layanan</p><p className="mt-1.5 inline-flex items-center gap-2 text-sm font-bold text-dark-800"><span className={`h-2.5 w-2.5 rounded-full ${config?.enabled ? 'bg-green-500' : 'bg-dark-300'}`} />{config?.enabled ? 'Aktif' : 'Nonaktif'}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-wide text-dark-400">Provider / Model</p><p className="mt-1.5 text-sm font-semibold text-dark-800">{config?.provider && config?.model ? `${config.provider === 'gemini' ? 'Google Gemini' : 'OpenAI-compatible'} · ${config.model}` : 'Belum dikonfigurasi'}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-wide text-dark-400">API key</p><p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-dark-700"><KeyRound className="h-4 w-4 text-dark-400" />{config?.configured ? 'Sudah dikonfigurasi' : 'Belum diatur'}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-wide text-dark-400">Terakhir diperbarui</p><p className="mt-1.5 text-sm text-dark-700">{formatDate(config?.updatedAt)}</p></div>
            {config?.endpoint && <div className="sm:col-span-2"><p className="text-[11px] font-bold uppercase tracking-wide text-dark-400">Endpoint</p><p className="mt-1 break-all text-xs text-dark-600">{config.endpoint}</p></div>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-dark-100 pt-4">
            <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-800"><KeyRound className="h-4 w-4" />{config?.provider ? 'Konfigurasi / Ganti API key' : 'Konfigurasi'}</button>
            <button type="button" disabled={!config?.configured || busy !== ''} onClick={() => safeAction('toggle', config?.enabled ? 'Layanan berhasil dinonaktifkan.' : 'Layanan berhasil diaktifkan.')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-dark-200 px-4 py-2 text-xs font-bold text-dark-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">{busy === 'toggle' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{config?.enabled ? 'Nonaktifkan' : 'Aktifkan'}</button>
            {config?.configured && <button type="button" disabled={busy !== ''} onClick={() => safeAction('remove', 'API key dihapus; layanan dinonaktifkan.')} className="min-h-10 rounded-lg px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Hapus API key</button>}
          </div>
        </div>
      ) : (
        <form className="space-y-4 p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); void safeAction('save', 'Konfigurasi berhasil disimpan.'); }}>
          <FormInput label="Nama layanan" value={service.name} readOnly className="bg-dark-50" />
          <FormInput label="Provider" as="select" options={PROVIDER_OPTIONS} value={form.provider} onChange={(event) => update('provider', event.target.value)} />
          {form.provider === 'openai' && <FormInput label="API endpoint" type="url" value={form.endpoint} onChange={(event) => update('endpoint', event.target.value)} placeholder="https://api.example.com/v1/chat/completions" wajib />}
          {form.provider === 'gemini' && <FormInput label="API endpoint (opsional)" type="url" value={form.endpoint} onChange={(event) => update('endpoint', event.target.value)} placeholder="Kosongkan untuk memakai endpoint Google Gemini" />}
          <FormInput label="Model" value={form.model} onChange={(event) => update('model', event.target.value)} placeholder={form.provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'} wajib />
          <div>
            <label htmlFor={`${service.key}-api-key`} className="mb-1.5 block text-xs font-semibold text-dark-700">API key {config?.configured ? '(kosongkan jika tidak diganti)' : '*'}</label>
            <div className="relative"><input id={`${service.key}-api-key`} type={showKey ? 'text' : 'password'} autoComplete="new-password" value={form.apiKey} onChange={(event) => update('apiKey', event.target.value)} placeholder={config?.configured ? 'Masukkan key baru untuk mengganti' : 'Masukkan API key'} required={!config?.configured} className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2.5 pr-12 text-sm text-dark-900 outline-none focus:border-primary" /><button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? 'Sembunyikan API key' : 'Tampilkan API key yang diketik'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-dark-500 hover:text-primary">{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            <p className="mt-1.5 text-xs text-dark-500">{config?.configured ? 'API key sudah tersimpan. Nilai lama tidak ditampilkan.' : 'API key disimpan secara rahasia di server dan tidak ditampilkan kembali.'}</p>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dark-100 p-3"><input type="checkbox" checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" /><span><span className="block text-sm font-bold text-dark-800">Aktifkan layanan</span><span className="mt-0.5 block text-xs leading-relaxed text-dark-500">{service.enabledHint}</span></span></label>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><ShieldCheck className="mr-1.5 inline h-4 w-4 align-text-bottom" />API key dienkripsi dan disimpan di server. Nilai rahasia tidak dapat dilihat kembali melalui dashboard.</div>
          <div className="flex flex-col gap-2 border-t border-dark-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" disabled={busy !== '' || !form.apiKey} onClick={() => safeAction('test', 'Koneksi berhasil.')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dark-200 px-4 py-2 text-xs font-bold text-dark-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">{busy === 'test' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}Uji koneksi</button>
            <div className="flex gap-2"><button type="button" disabled={busy !== ''} onClick={() => setEditing(false)} className="min-h-10 rounded-lg border border-dark-200 px-4 py-2 text-xs font-bold text-dark-600 hover:bg-dark-50">Batal</button><button type="submit" disabled={busy !== ''} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-60">{busy === 'save' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Simpan</button></div>
          </div>
        </form>
      )}
    </article>
  );
}

export default function AiSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try { setSettings(await getAiSettings()); } catch { setError('Pengaturan AI gagal dimuat. Coba muat ulang halaman.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // Initial data load is an external synchronization, not render derivation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Panel Admin</p><h1 className="mt-2 font-heading text-2xl font-extrabold text-dark-900 sm:text-3xl">Pengaturan AI</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-dark-500">Kelola provider dan akses layanan AI sekolah. Seluruh API key tersimpan terenkripsi di server.</p></div>
        <button type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dark-200 px-4 py-2 text-xs font-bold text-dark-700 hover:border-primary hover:text-primary disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Muat ulang</button>
      </div>
      {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {loading ? <div role="status" className="col-span-full rounded-2xl border border-dark-100 bg-white p-10 text-center text-sm text-dark-500"><LoaderCircle className="mx-auto h-6 w-6 animate-spin text-primary" /><span className="mt-3 block">Memuat pengaturan AI...</span></div> : SERVICES.map((service) => <ServiceCard key={service.key} service={service} settings={settings} onChanged={load} />)}
      </div>
      <p className="mt-5 flex items-start gap-2 rounded-xl border border-dark-100 bg-white p-4 text-xs leading-relaxed text-dark-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />API key dienkripsi dan disimpan di server. Nilai rahasia tidak dapat dilihat kembali melalui dashboard.</p>
    </section>
  );
}
