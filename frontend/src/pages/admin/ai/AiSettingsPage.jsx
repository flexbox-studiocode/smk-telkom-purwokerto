import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bot, CheckCircle2, Eye, EyeOff, KeyRound, Layers, LoaderCircle, RefreshCw, Save, ShieldCheck, ShieldQuestion, Wifi } from 'lucide-react';
import FormInput from '../../../components/dashboard/FormInput';
import { getAiProviders, getAiSettings, listAiModels, removeAiApiKey, saveAiSettings, setAiServiceStatus, testAiConnection, verifyAiApiKey } from '../../../services/aiSettingsService';

const SERVICES = [
  { key: 'stela', name: 'NEXA AI', description: 'Asisten AI untuk menjawab pertanyaan seputar SMK Telkom Purwokerto.', enabledHint: 'Mengatur endpoint chat NEXA.' },
  { key: 'nexttel', name: 'NextTel', description: 'Asisten rekomendasi jurusan yang membantu siswa memahami hasil pemetaan minat dan bakat.', enabledHint: 'Hanya mengatur penjelasan hasil. Scoring lokal tetap berjalan saat layanan AI nonaktif.' },
];

// Cadangan bila metadata provider gagal dimuat. Server tetap menjadi sumber
// kebenaran: identifier di luar registry akan ditolak backend saat disimpan.
const FALLBACK_PROVIDERS = [
  { id: 'openai', label: 'OpenAI', requiresEndpoint: true, supportsModelList: true, defaultEndpoint: 'https://api.openai.com/v1' },
  { id: 'gemini', label: 'Google Gemini', requiresEndpoint: false, supportsModelList: true, defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models' },
  { id: 'anthropic', label: 'Anthropic', requiresEndpoint: false, supportsModelList: false, defaultEndpoint: 'https://api.anthropic.com/v1' },
  { id: 'deepseek', label: 'DeepSeek', requiresEndpoint: false, supportsModelList: true, defaultEndpoint: 'https://api.deepseek.com' },
  { id: 'qwen', label: 'Qwen (Alibaba DashScope)', requiresEndpoint: false, supportsModelList: true, defaultEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { id: 'custom-openai', label: 'Custom OpenAI-compatible', requiresEndpoint: true, supportsModelList: true, defaultEndpoint: null },
];

const DEFAULT_FORM = { provider: 'gemini', endpoint: '', model: 'gemini-2.5-flash', apiKey: '', enabled: false };
const ERROR_SAFE = 'Gagal memproses konfigurasi AI. Periksa data, koneksi, dan pengaturan server.';

const formatDate = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Belum pernah diperbarui';

// Pesan galat backend sudah aman (tanpa header/API key). Petakan kode provider
// menjadi kalimat yang berguna, tanpa pernah menampilkan detail mentah provider.
const PROVIDER_ERROR_TEXT = {
  API_KEY_INVALID: 'API key tidak valid atau ditolak provider.',
  PERMISSION_DENIED: 'API key tidak memiliki izin untuk model atau layanan ini.',
  MODEL_NOT_FOUND: 'Model tidak ditemukan atau tidak tersedia untuk API key ini.',
  QUOTA_EXCEEDED: 'Kuota provider habis.',
  RATE_LIMITED: 'Permintaan terlalu sering ke provider. Coba beberapa saat lagi.',
  INVALID_ENDPOINT: 'Endpoint tidak valid atau tidak dapat dijangkau.',
  INVALID_REQUEST: 'Provider menolak permintaan. Periksa model dan parameter.',
  PROVIDER_TIMEOUT: 'Koneksi ke provider timeout. Periksa endpoint dan coba lagi.',
  PROVIDER_UNAVAILABLE: 'Layanan provider sedang mengalami gangguan.',
  INVALID_PROVIDER_RESPONSE: 'Respons provider tidak dapat dibaca.',
  DECRYPTION_FAILED: 'API key tersimpan tidak dapat didekripsi. Masukkan API key baru.',
  CREDENTIAL_MISSING: 'API key belum diisi.',
  CONFIG_DISABLED: 'Layanan sedang dinonaktifkan.',
};

const describeError = (error, fallback) => {
  if (error?.code && PROVIDER_ERROR_TEXT[error.code]) return PROVIDER_ERROR_TEXT[error.code];
  const aman = error?.status && typeof error?.message === 'string' && error.message.trim() ? error.message : '';
  return aman || fallback;
};

export function ServiceCard({ service, settings, onChanged, providers }) {
  // Backend mengembalikan null untuk layanan yang belum pernah dikonfigurasi.
  // Jangan biarkan respons kosong menjatuhkan seluruh route dashboard.
  const config = (Array.isArray(settings) ? settings : []).find((item) => item?.service === service.key);
  const providerList = Array.isArray(providers) && providers.length ? providers : FALLBACK_PROVIDERS;
  const [editing, setEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [models, setModels] = useState([]);

  const providerLabel = useCallback((id) => providerList.find((item) => item.id === id)?.label || id || 'Belum dikonfigurasi', [providerList]);
  const selectedProvider = useMemo(() => providerList.find((item) => item.id === form.provider) || null, [providerList, form.provider]);

  useEffect(() => {
    if (editing) {
      const activeProvider = providerList.find((item) => item.id === (config?.provider || DEFAULT_FORM.provider)) || null;
      // Form state must reset when admin opens editor for current config.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        provider: config?.provider || DEFAULT_FORM.provider,
        // Endpoint default provider tidak perlu ditampilkan: kosong = pakai default.
        endpoint: activeProvider?.defaultEndpoint && config?.endpoint === activeProvider.defaultEndpoint ? '' : config?.endpoint || '',
        model: config?.model || DEFAULT_FORM.model,
        apiKey: '',
        enabled: config?.enabled || false,
      });
      setShowKey(false);
      setModels([]);
    }
  }, [editing, config, providerList]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  // Field key sengaja kosong saat editor dibuka. Bila Admin tidak mengetik key baru,
  // jangan kirim string kosong: backend harus mempertahankan key lama.
  const payload = () => {
    const { apiKey, ...rest } = form;
    const body = { ...rest, endpoint: rest.endpoint?.trim() || '' };
    if (apiKey.trim()) body.apiKey = apiKey.trim();
    return body;
  };
  const safeAction = async (action, successText) => {
    setBusy(action);
    setMessage(null);
    try {
      if (action === 'save') await saveAiSettings(service.key, payload());
      else if (action === 'test') await testAiConnection(service.key, payload());
      else if (action === 'verify') await verifyAiApiKey(service.key, payload());
      else if (action === 'models') {
        const data = await listAiModels(service.key, payload());
        setModels(Array.isArray(data?.models) ? data.models : []);
        setMessage({ type: 'success', text: data?.models?.length ? `Ditemukan ${data.models.length} model.` : 'Provider tidak menyediakan daftar model. Isi model secara manual.' });
        return;
      } else if (action === 'toggle') await setAiServiceStatus(service.key, !config?.enabled);
      else if (action === 'remove') {
        if (!window.confirm('API key tersimpan akan dihapus dan layanan NEXA/NextTel dinonaktifkan. Simpan API key baru untuk mengaktifkan kembali. Lanjutkan?')) return;
        await removeAiApiKey(service.key);
      }
      setMessage({ type: 'success', text: successText });
      if (action === 'save') { setEditing(false); setForm((current) => ({ ...current, apiKey: '' })); }
      await onChanged();
    } catch (error) {
      const fallback = action === 'test' || action === 'verify' || action === 'models' ? 'Permintaan gagal. Periksa provider, model, endpoint, dan API key.' : ERROR_SAFE;
      setMessage({ type: 'error', text: describeError(error, fallback) });
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
            <div><p className="text-[11px] font-bold uppercase tracking-wide text-dark-400">Provider / Model</p><p className="mt-1.5 text-sm font-semibold text-dark-800">{config?.provider && config?.model ? `${providerLabel(config.provider)} · ${config.model}` : 'Belum dikonfigurasi'}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-wide text-dark-400">API key</p><p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-dark-700"><KeyRound className="h-4 w-4 text-dark-400" />{config?.configured ? 'Sudah dikonfigurasi' : 'Belum diatur'}</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-wide text-dark-400">Terakhir diperbarui</p><p className="mt-1.5 text-sm text-dark-700">{formatDate(config?.updatedAt)}</p></div>
            {config?.endpoint && <div className="sm:col-span-2"><p className="text-[11px] font-bold uppercase tracking-wide text-dark-400">Endpoint</p><p className="mt-1 break-all text-xs text-dark-600">{config.endpoint}</p></div>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-dark-100 pt-4">
            <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-800"><KeyRound className="h-4 w-4" />{config?.provider ? 'Konfigurasi / Ganti API key' : 'Konfigurasi'}</button>
            <button type="button" disabled={!config?.configured || busy !== ''} onClick={() => safeAction('toggle', config?.enabled ? 'Layanan berhasil dinonaktifkan.' : 'Layanan berhasil diaktifkan.')} title={config?.configured ? undefined : 'Simpan API key terlebih dahulu'} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-dark-200 px-4 py-2 text-xs font-bold text-dark-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">{busy === 'toggle' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{config?.enabled ? 'Nonaktifkan' : 'Aktifkan'}</button>
            {config?.configured && <button type="button" disabled={busy !== ''} onClick={() => safeAction('remove', 'API key dihapus; layanan dinonaktifkan.')} className="min-h-10 rounded-lg px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Hapus API key</button>}
          </div>
        </div>
      ) : (
        <form className="space-y-4 p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); void safeAction('save', 'Konfigurasi berhasil disimpan.'); }}>
          <FormInput label="Nama layanan" value={service.name} readOnly className="bg-dark-50" />
          <FormInput label="Provider" as="select" options={providerList.map((item) => ({ value: item.id, label: item.label }))} value={form.provider} onChange={(event) => { update('provider', event.target.value); setModels([]); }} />
          <FormInput label={`API endpoint${selectedProvider?.requiresEndpoint ? '' : ' (opsional)'}`} type="url" value={form.endpoint} onChange={(event) => update('endpoint', event.target.value)} placeholder={selectedProvider?.defaultEndpoint ? `Kosongkan untuk memakai ${selectedProvider.defaultEndpoint}` : 'https://api.example.com/v1'} wajib={selectedProvider?.requiresEndpoint} />
          <div>
            <FormInput label="Model" value={form.model} onChange={(event) => update('model', event.target.value)} placeholder={selectedProvider?.defaultEndpoint ? 'Nama model provider' : 'gpt-4o-mini'} wajib list={`${service.key}-model-options`} />
            {models.length > 0 && <datalist id={`${service.key}-model-options`}>{models.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</datalist>}
            {selectedProvider?.supportsModelList && <button type="button" disabled={busy !== '' || (!form.apiKey.trim() && !config?.configured)} onClick={() => safeAction('models', '')} className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg border border-dark-200 px-3 py-1.5 text-xs font-bold text-dark-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">{busy === 'models' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}Muat daftar model</button>}
            {!selectedProvider?.supportsModelList && selectedProvider && <p className="mt-1.5 text-xs text-dark-500">Provider ini belum menyediakan penemuan model otomatis. Isi nama model secara manual.</p>}
          </div>
          <div>
            <label htmlFor={`${service.key}-api-key`} className="mb-1.5 block text-xs font-semibold text-dark-700">API key {config?.configured ? '(kosongkan jika tidak diganti)' : '*'}</label>
            <div className="relative"><input id={`${service.key}-api-key`} type={showKey ? 'text' : 'password'} autoComplete="new-password" value={form.apiKey} onChange={(event) => update('apiKey', event.target.value)} placeholder={config?.configured ? 'Masukkan key baru untuk mengganti' : 'Masukkan API key'} required={!config?.configured} className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2.5 pr-12 text-sm text-dark-900 outline-none focus:border-primary" /><button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? 'Sembunyikan API key' : 'Tampilkan API key yang diketik'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-dark-500 hover:text-primary">{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            <p className="mt-1.5 text-xs text-dark-500">{config?.configured ? 'API key sudah tersimpan. Nilai lama tidak ditampilkan.' : 'API key disimpan secara rahasia di server dan tidak ditampilkan kembali.'}</p>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dark-100 p-3"><input type="checkbox" checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" /><span><span className="block text-sm font-bold text-dark-800">Aktifkan layanan</span><span className="mt-0.5 block text-xs leading-relaxed text-dark-500">{service.enabledHint}</span></span></label>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><ShieldCheck className="mr-1.5 inline h-4 w-4 align-text-bottom" />API key dienkripsi dan disimpan di server. Nilai rahasia tidak dapat dilihat kembali melalui dashboard.</div>
          <div className="flex flex-col gap-2 border-t border-dark-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy !== '' || (!form.apiKey.trim() && !config?.configured)} title={!form.apiKey.trim() && !config?.configured ? 'Masukkan API key untuk menguji koneksi' : undefined} onClick={() => safeAction('test', 'Koneksi berhasil.')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dark-200 px-4 py-2 text-xs font-bold text-dark-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">{busy === 'test' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}Uji koneksi</button>
              <button type="button" disabled={busy !== '' || (!form.apiKey.trim() && !config?.configured)} title={!form.apiKey.trim() && !config?.configured ? 'Masukkan API key untuk verifikasi' : undefined} onClick={() => safeAction('verify', 'API key berhasil diverifikasi.')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dark-200 px-4 py-2 text-xs font-bold text-dark-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50">{busy === 'verify' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldQuestion className="h-4 w-4" />}Verifikasi API key</button>
            </div>
            <div className="flex gap-2"><button type="button" disabled={busy !== ''} onClick={() => setEditing(false)} className="min-h-10 rounded-lg border border-dark-200 px-4 py-2 text-xs font-bold text-dark-600 hover:bg-dark-50">Batal</button><button type="submit" disabled={busy !== ''} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-60">{busy === 'save' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Simpan</button></div>
          </div>
        </form>
      )}
    </article>
  );
}

export default function AiSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const [list, providerMeta] = await Promise.all([getAiSettings(), getAiProviders().catch(() => [])]);
      setSettings(list);
      setProviders(Array.isArray(providerMeta) ? providerMeta : []);
    } catch { setError('Pengaturan AI gagal dimuat. Coba muat ulang halaman.'); }
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
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Panel Admin</p><h1 className="mt-2 font-heading text-2xl font-extrabold text-dark-900 sm:text-3xl">Pengaturan AI</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-dark-500">Kelola provider dan akses layanan AI sekolah. Pilih dari beberapa penyedia, temukan model secara otomatis, dan verifikasi API key. Seluruh API key tersimpan terenkripsi di server.</p></div>
        <button type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dark-200 px-4 py-2 text-xs font-bold text-dark-700 hover:border-primary hover:text-primary disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Muat ulang</button>
      </div>
      {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {loading ? <div role="status" className="col-span-full rounded-2xl border border-dark-100 bg-white p-10 text-center text-sm text-dark-500"><LoaderCircle className="mx-auto h-6 w-6 animate-spin text-primary" /><span className="mt-3 block">Memuat pengaturan AI...</span></div> : SERVICES.map((service) => <ServiceCard key={service.key} service={service} settings={settings} providers={providers} onChanged={load} />)}
      </div>
      <p className="mt-5 flex items-start gap-2 rounded-xl border border-dark-100 bg-white p-4 text-xs leading-relaxed text-dark-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />API key dienkripsi dan disimpan di server. Nilai rahasia tidak dapat dilihat kembali melalui dashboard.</p>
    </section>
  );
}
