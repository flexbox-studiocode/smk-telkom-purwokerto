import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, Bot, CheckCircle2, Eye, EyeOff, KeyRound, Layers, LoaderCircle, RefreshCw, Save, ShieldCheck, ShieldQuestion, Trash2, Wifi } from 'lucide-react';
import FormInput from '../../../components/dashboard/FormInput';
import Modal from '../../../components/dashboard/Modal';
import { getAiProviders, getAiSettings, listAiModels, removeAiApiKey, saveAiSettings, setAiServiceStatus, testAiConnection, verifyAiApiKey } from '../../../services/aiSettingsService';

// `key` adalah ID internal layanan (dipakai routing & backend) dan tidak pernah
// berubah. `name` hanya nama bawaan; admin dapat menggantinya lewat displayName.
const SERVICES = [
  { key: 'stela', name: 'NEXA AI', description: 'Asisten AI untuk menjawab pertanyaan seputar SMK Telkom Purwokerto.', enabledHint: 'Mengatur endpoint chat NEXA.' },
  { key: 'nexttel', name: 'NextTel', description: 'Asisten rekomendasi jurusan yang membantu siswa memahami hasil pemetaan minat dan bakat.', enabledHint: 'Hanya mengatur penjelasan hasil. Scoring lokal tetap berjalan saat layanan AI nonaktif.' },
];

// Cadangan bila metadata provider gagal dimuat. Server tetap menjadi sumber
// kebenaran: identifier di luar registry akan ditolak backend saat disimpan.
const FALLBACK_PROVIDERS = [
  { id: 'openai', label: 'OpenAI', requiresEndpoint: false, supportsModelList: true, defaultEndpoint: 'https://api.openai.com/v1' },
  { id: 'gemini', label: 'Google Gemini', requiresEndpoint: false, supportsModelList: true, defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models' },
  { id: 'anthropic', label: 'Anthropic', requiresEndpoint: false, supportsModelList: true, defaultEndpoint: 'https://api.anthropic.com/v1' },
  { id: 'deepseek', label: 'DeepSeek', requiresEndpoint: false, supportsModelList: true, defaultEndpoint: 'https://api.deepseek.com' },
  { id: 'openrouter', label: 'OpenRouter', requiresEndpoint: false, supportsModelList: true, defaultEndpoint: 'https://openrouter.ai/api/v1' },
  { id: 'groq', label: 'Groq', requiresEndpoint: false, supportsModelList: true, defaultEndpoint: 'https://api.groq.com/openai/v1' },
  { id: 'qwen', label: 'Qwen (Alibaba DashScope)', requiresEndpoint: false, supportsModelList: true, defaultEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { id: 'custom-openai', label: 'Custom OpenAI-compatible', requiresEndpoint: true, supportsModelList: true, defaultEndpoint: null },
];

const DEFAULT_FORM = { displayName: '', provider: 'gemini', endpoint: '', model: '', apiKey: '', enabled: false };
const ERROR_SAFE = 'Gagal memproses konfigurasi AI. Periksa data, koneksi, dan pengaturan server.';

const formatDate = (value) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Belum pernah diperbarui';

// Pesan backend sudah aman (tanpa header/API key); `detail` adalah alasan
// provider yang sudah disensor server. Galat jaringan memakai pesan cadangan.
const describeError = (error, fallback) => {
  const base = error?.status && typeof error?.message === 'string' && error.message.trim() ? error.message : fallback;
  const detail = error?.body?.detail;
  return detail ? `${base} Detail provider: ${detail}` : base;
};

// Status sebenarnya: tersimpan ≠ terhubung. lastCheckCode diisi oleh
// Verifikasi API key dan oleh hasil chat/penjelasan terakhir di server.
const CHECK_LABELS = {
  API_KEY_INVALID: 'API key tidak valid',
  PERMISSION_DENIED: 'API key tidak memiliki izin',
  MODEL_NOT_FOUND: 'Model tidak tersedia',
  QUOTA_EXCEEDED: 'Kuota provider habis',
  DECRYPTION_FAILED: 'API key tersimpan rusak',
  INVALID_ENDPOINT: 'Endpoint tidak valid',
  INVALID_REQUEST: 'Provider menolak permintaan',
};
function serviceStatus(config) {
  if (!config?.configured) return { label: 'API key belum dikonfigurasi', tone: 'muted' };
  if (!config.enabled) return { label: 'Nonaktif', tone: 'muted' };
  if (config.lastCheckCode === 'OK') return { label: 'Aktif · terverifikasi', tone: 'ok' };
  if (!config.lastCheckCode) return { label: 'Aktif · belum terverifikasi', tone: 'warn' };
  return { label: `Aktif · ${CHECK_LABELS[config.lastCheckCode] || 'Gangguan koneksi provider'}`, tone: 'error' };
}
const TONE_DOT = { ok: 'bg-green-500', warn: 'bg-amber-500', error: 'bg-red-500', muted: 'bg-dark-300' };
const MESSAGE_STYLE = {
  success: ['border-green-200 bg-green-50 text-green-800', CheckCircle2],
  warning: ['border-amber-200 bg-amber-50 text-amber-900', AlertTriangle],
  error: ['border-red-200 bg-red-50 text-red-800', AlertCircle],
};

const secondaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dark-200 bg-white px-4 py-2 text-xs font-bold text-dark-700 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60';

export function ServiceCard({ service, settings, onChanged, providers }) {
  // Backend dapat mengembalikan null untuk layanan yang belum pernah dikonfigurasi.
  const config = (Array.isArray(settings) ? settings : []).find((item) => item?.service === service.key);
  const providerList = Array.isArray(providers) && providers.length ? providers : FALLBACK_PROVIDERS;
  const [editing, setEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [models, setModels] = useState([]);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const title = config?.displayName || service.name;
  const status = serviceStatus(config);
  const providerLabel = (id) => providerList.find((item) => item.id === id)?.label || id || 'Belum dikonfigurasi';
  const selectedProvider = useMemo(() => providerList.find((item) => item.id === form.provider) || null, [providerList, form.provider]);
  const hasKey = Boolean(form.apiKey.trim()) || Boolean(config?.configured);

  // Form diisi SEKALI saat editor dibuka. Sebelumnya form di-reset oleh efek
  // setiap kali daftar pengaturan dimuat ulang (mis. setelah Uji koneksi atau
  // aksi di kartu lain), sehingga API key yang sedang diketik hilang dan klik
  // berikutnya melaporkan "API key wajib diisi".
  const openEditor = () => {
    const activeProvider = providerList.find((item) => item.id === (config?.provider || DEFAULT_FORM.provider)) || null;
    setForm({
      displayName: config?.displayName || service.name,
      provider: config?.provider || DEFAULT_FORM.provider,
      // Endpoint default provider tidak perlu ditampilkan: kosong = pakai default.
      endpoint: activeProvider?.defaultEndpoint && config?.endpoint === activeProvider.defaultEndpoint ? '' : config?.endpoint || '',
      model: config?.model || '',
      apiKey: '',
      enabled: config?.enabled || false,
    });
    setShowKey(false);
    setModels([]);
    setMessage(null);
    setEditing(true);
  };

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  // Key kosong tidak pernah dikirim: backend memakai/mempertahankan key tersimpan.
  const draft = () => {
    const body = { provider: form.provider, endpoint: form.endpoint.trim(), model: form.model.trim() };
    if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();
    return body;
  };

  const run = async (action, task) => {
    setBusy(action);
    setMessage(null);
    try {
      setMessage(await task());
    } catch (error) {
      const fallback = ['test', 'verify', 'models'].includes(action) ? 'Permintaan gagal. Periksa provider, model, endpoint, dan API key.' : ERROR_SAFE;
      setMessage({ type: 'error', text: describeError(error, fallback) });
    } finally {
      setBusy('');
    }
  };

  // Uji/verifikasi/daftar model tidak menyimpan apa pun dan tidak mengubah form.
  const testConnection = () => run('test', async () => {
    const data = await testAiConnection(service.key, draft());
    if (data?.accepted) return { type: 'success', text: data.message || 'Endpoint provider terjangkau.' };
    return { type: 'warning', text: `${data?.message || 'Endpoint terjangkau, tetapi provider menolak permintaan.'}${data?.detail ? ` Detail provider: ${data.detail}` : ''}` };
  });
  const verifyKey = () => run('verify', async () => {
    try {
      const data = await verifyAiApiKey(service.key, draft());
      return { type: 'success', text: `API key valid dan model ${data?.model || form.model} dapat digunakan.${data?.recorded ? '' : ' Simpan konfigurasi agar perubahan dipakai layanan.'}` };
    } finally {
      // Verifikasi dengan key tersimpan merekam status di server (berhasil
      // maupun gagal); muat ulang agar kartu menampilkannya. Form tidak di-reset.
      if (!form.apiKey.trim()) await onChanged();
    }
  });
  const loadModels = () => run('models', async () => {
    const data = await listAiModels(service.key, draft());
    const list = Array.isArray(data?.models) ? data.models : [];
    setModels(list);
    if (data?.supported === false) return { type: 'warning', text: 'Provider ini tidak menyediakan daftar model. Isi model ID secara manual.' };
    if (!list.length) return { type: 'warning', text: 'Provider tidak mengembalikan model chat. Isi model ID secara manual.' };
    if (form.model && !list.some((item) => item.id === form.model.trim())) return { type: 'warning', text: `Ditemukan ${list.length} model, tetapi "${form.model}" tidak ada di daftar. Pilih model lain.` };
    return { type: 'success', text: `Ditemukan ${list.length} model. Ketik di kolom Model untuk mencari.` };
  });
  const save = () => run('save', async () => {
    await saveAiSettings(service.key, { ...draft(), displayName: form.displayName.trim(), enabled: form.enabled });
    setEditing(false);
    await onChanged();
    return { type: 'success', text: 'Konfigurasi disimpan. Jalankan Verifikasi API key untuk memastikan layanan AI benar-benar terhubung.' };
  });
  const toggle = () => run('toggle', async () => {
    await setAiServiceStatus(service.key, !config?.enabled);
    await onChanged();
    return { type: 'success', text: config?.enabled ? 'Layanan dinonaktifkan. API key tetap tersimpan.' : 'Layanan diaktifkan.' };
  });
  const remove = () => run('remove', async () => {
    await removeAiApiKey(service.key);
    setConfirmRemove(false);
    setEditing(false);
    await onChanged();
    return { type: 'success', text: `API key ${title} dihapus dan layanannya dinonaktifkan. Layanan lain tidak terpengaruh.` };
  });

  const [messageStyle, MessageIcon] = MESSAGE_STYLE[message?.type] || MESSAGE_STYLE.error;
  const spin = (action, Icon) => busy === action ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />;
  const fieldLabel = 'text-[11px] font-bold uppercase tracking-wide text-dark-400';

  return (
    // Subgrid: header kedua kartu berbagi tinggi baris yang sama sehingga isi kartu sejajar.
    <article className="row-span-2 grid grid-rows-subgrid gap-0 overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-card" aria-busy={busy !== ''}>
      <header className="flex items-start gap-4 border-b border-dark-100 bg-gradient-to-r from-primary-50/80 to-white p-5 sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-card"><Bot className="h-6 w-6" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-lg font-extrabold text-dark-900">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-dark-600">{service.description}</p>
          <p className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-800">{service.key === 'nexttel' ? `Scoring lokal selalu aktif. ${service.enabledHint}` : service.enabledHint}</p>
        </div>
      </header>

      <div className="flex flex-col">
      {message && <div role={message.type === 'error' ? 'alert' : 'status'} className={`mx-5 mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm leading-relaxed sm:mx-6 ${messageStyle}`}><MessageIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{message.text}</span></div>}

      {!editing ? (
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className={fieldLabel}>Status layanan</dt><dd className="mt-1.5 inline-flex items-center gap-2 text-sm font-bold text-dark-800"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[status.tone]}`} aria-hidden="true" />{status.label}</dd></div>
            <div><dt className={fieldLabel}>Provider / Model</dt><dd className="mt-1.5 break-words text-sm font-semibold text-dark-800">{config?.provider && config?.model ? `${providerLabel(config.provider)} · ${config.model}` : 'Belum dikonfigurasi'}</dd></div>
            <div><dt className={fieldLabel}>API key</dt><dd className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-dark-700"><KeyRound className="h-4 w-4 text-dark-400" aria-hidden="true" />{config?.configured ? 'Sudah dikonfigurasi' : 'Belum diatur'}</dd></div>
            <div><dt className={fieldLabel}>Terakhir diperbarui</dt><dd className="mt-1.5 text-sm text-dark-700">{formatDate(config?.updatedAt)}</dd></div>
            {config?.endpoint && <div className="sm:col-span-2"><dt className={fieldLabel}>Endpoint</dt><dd className="mt-1 break-all text-xs text-dark-600">{config.endpoint}</dd></div>}
            {config?.lastCheckedAt && <div className="sm:col-span-2"><dt className={fieldLabel}>Pemeriksaan terakhir</dt><dd className="mt-1 text-xs text-dark-600">{formatDate(config.lastCheckedAt)}</dd></div>}
          </dl>
          <div className="min-h-5 flex-1" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2 border-t border-dark-100 pt-4">
            <button type="button" disabled={busy !== ''} onClick={openEditor} className={primaryButton}><KeyRound className="h-4 w-4" aria-hidden="true" />{config?.provider ? 'Konfigurasi / Ganti API key' : 'Konfigurasi'}</button>
            <button type="button" disabled={!config?.configured || busy !== ''} onClick={toggle} title={config?.configured ? undefined : 'Simpan API key terlebih dahulu'} className={secondaryButton}>{busy === 'toggle' && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}{config?.enabled ? 'Nonaktifkan' : 'Aktifkan'}</button>
            {config?.configured && <button type="button" disabled={busy !== ''} onClick={() => setConfirmRemove(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-4 w-4" aria-hidden="true" />Hapus API key</button>}
          </div>
        </div>
      ) : (
        <form className="flex flex-1 flex-col gap-4 p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <FormInput label="Nama layanan" value={form.displayName} onChange={(event) => update('displayName', event.target.value)} maxLength={80} placeholder={service.name} />
          <FormInput label="Provider" as="select" options={providerList.map((item) => ({ value: item.id, label: item.label }))} value={form.provider} onChange={(event) => { update('provider', event.target.value); update('endpoint', ''); setModels([]); }} />
          <div>
            <FormInput label={`API endpoint${selectedProvider?.requiresEndpoint ? '' : ' (opsional)'}`} type="url" value={form.endpoint} onChange={(event) => update('endpoint', event.target.value)} placeholder={selectedProvider?.defaultEndpoint ? 'Kosongkan untuk endpoint default' : 'https://api.example.com/v1'} wajib={selectedProvider?.requiresEndpoint} />
            {selectedProvider?.defaultEndpoint && <p className="mt-1.5 break-all text-xs text-dark-500">Default: {selectedProvider.defaultEndpoint}</p>}
          </div>
          <div>
            <FormInput label="Model" value={form.model} onChange={(event) => update('model', event.target.value)} placeholder={models.length ? 'Ketik untuk mencari model' : 'Model ID, mis. gemini-2.5-flash'} wajib required autoComplete="off" spellCheck={false} list={`${service.key}-model-options`} />
            <datalist id={`${service.key}-model-options`}>{models.map((item) => <option key={item.id} value={item.id}>{item.label !== item.id ? item.label : undefined}</option>)}</datalist>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {selectedProvider?.supportsModelList !== false && <button type="button" disabled={busy !== '' || !hasKey} title={hasKey ? undefined : 'Masukkan API key terlebih dahulu'} onClick={loadModels} className={`${secondaryButton} min-h-9 px-3 py-1.5`}>{spin('models', Layers)}Muat daftar model</button>}
              <span className="text-xs text-dark-500">{models.length ? `${models.length} model tersedia. Model ID asli ditampilkan.` : 'Bisa diisi manual bila daftar model tidak tersedia.'}</span>
            </div>
          </div>
          <div>
            <label htmlFor={`${service.key}-api-key`} className="mb-1.5 block text-xs font-semibold text-dark-700">API key{config?.configured ? ' (kosongkan jika tidak diganti)' : <span className="ml-0.5 text-primary">*</span>}</label>
            <div className="relative"><input id={`${service.key}-api-key`} type={showKey ? 'text' : 'password'} autoComplete="new-password" spellCheck={false} value={form.apiKey} onChange={(event) => update('apiKey', event.target.value)} placeholder={config?.configured ? 'Masukkan key baru untuk mengganti' : 'Masukkan API key'} required={!config?.configured} className="w-full rounded-lg border border-dark-200 bg-white px-3 py-2.5 pr-12 text-sm text-dark-900 outline-none transition-colors placeholder:text-dark-400 focus:border-primary" /><button type="button" onClick={() => setShowKey((value) => !value)} disabled={!form.apiKey} aria-pressed={showKey} aria-label={showKey ? 'Sembunyikan API key yang diketik' : 'Tampilkan API key yang diketik'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-dark-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40">{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
            <p className="mt-1.5 text-xs text-dark-500">{config?.configured ? 'API key tersimpan dipakai untuk uji dan verifikasi bila kolom ini kosong. Nilainya tidak pernah ditampilkan.' : 'API key disimpan terenkripsi di server dan tidak ditampilkan kembali.'}</p>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dark-100 p-3"><input type="checkbox" checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" /><span><span className="block text-sm font-bold text-dark-800">Aktifkan layanan</span><span className="mt-0.5 block text-xs leading-relaxed text-dark-500">{service.enabledHint}</span></span></label>
          <div className="mt-auto flex flex-col gap-3 border-t border-dark-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy !== '' || !hasKey} title={hasKey ? undefined : 'Masukkan API key untuk menguji koneksi'} onClick={testConnection} className={secondaryButton}>{spin('test', Wifi)}Uji koneksi</button>
              <button type="button" disabled={busy !== '' || !hasKey || !form.model.trim()} title={hasKey ? undefined : 'Masukkan API key untuk verifikasi'} onClick={verifyKey} className={secondaryButton}>{spin('verify', ShieldQuestion)}Verifikasi API key</button>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={busy !== ''} onClick={() => { setEditing(false); setMessage(null); }} className={secondaryButton}>Batal</button>
              <button type="submit" disabled={busy !== ''} className={`${primaryButton} px-5`}>{spin('save', Save)}Simpan</button>
            </div>
          </div>
        </form>
      )}

      <Modal
        terbuka={confirmRemove}
        onTutup={() => { if (busy !== 'remove') setConfirmRemove(false); }}
        busy={busy === 'remove'}
        judul={`Hapus API key ${title}?`}
        deskripsi="Tindakan ini tidak dapat dibatalkan."
        footer={<>
          <button type="button" disabled={busy === 'remove'} onClick={() => setConfirmRemove(false)} className={secondaryButton}>Batal</button>
          <button type="button" disabled={busy === 'remove'} onClick={remove} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-60">{spin('remove', Trash2)}Hapus API key</button>
        </>}
      >
        <p className="text-sm leading-relaxed text-dark-600">API key tersimpan untuk <strong className="text-dark-900">{title}</strong> akan dihapus dan layanan ini dinonaktifkan. Layanan AI lain tidak terpengaruh. Simpan API key baru untuk mengaktifkannya kembali.</p>
      </Modal>
      </div>
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
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Panel Admin</p><h1 className="mt-2 font-heading text-2xl font-extrabold text-dark-900 sm:text-3xl">Pengaturan AI</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-dark-500">Kelola provider dan akses layanan AI sekolah. Pilih penyedia, muat daftar model, lalu verifikasi API key. Seluruh API key tersimpan terenkripsi di server.</p></div>
        <button type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading} className={secondaryButton}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />Muat ulang</button>
      </div>
      {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      <div className="mt-6 grid items-stretch gap-5 xl:grid-cols-2">
        {loading && !settings.length ? <div role="status" className="col-span-full rounded-2xl border border-dark-100 bg-white p-10 text-center text-sm text-dark-500"><LoaderCircle className="mx-auto h-6 w-6 animate-spin text-primary" /><span className="mt-3 block">Memuat pengaturan AI...</span></div> : SERVICES.map((service) => <ServiceCard key={service.key} service={service} settings={settings} providers={providers} onChanged={load} />)}
      </div>
      <p className="mt-5 flex items-start gap-2 rounded-xl border border-dark-100 bg-white p-4 text-xs leading-relaxed text-dark-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />API key dienkripsi dan disimpan di server. Nilai rahasia tidak dapat dilihat kembali melalui dashboard.</p>
    </section>
  );
}
