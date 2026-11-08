import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import PrestasiForm from '../src/pages/admin/prestasi/PrestasiForm';
import BkkForm from '../src/pages/admin/bkk/BkkForm';
import BeritaForm from '../src/pages/admin/berita/BeritaForm';
import PengumumanForm from '../src/pages/admin/pengumuman/PengumumanForm';

const forms = { Prestasi: PrestasiForm, BKK: BkkForm, Berita: BeritaForm, Pengumuman: PengumumanForm };

// Contoh lokal memakai form asli tanpa login atau menulis data produksi.
// Di dashboard, onSubmit sudah dihubungkan ke API backend (MySQL) masing-masing.
export default function Example() {
  const [tab, setTab] = useState('Prestasi');
  const [result, setResult] = useState('');
  const [fail, setFail] = useState(false);
  const Form = forms[tab];
  const save = async (payload) => {
    if (fail) return 'Gambar gagal diunggah. Periksa koneksi, lalu coba lagi.';
    setResult(`Form diterima: ${payload.image_file?.name || payload.gambar_url || payload.logo_url || 'tanpa gambar'}`);
    return undefined;
  };

  return (
    <main className="min-h-screen bg-dark-50 px-4 py-8 text-dark-900">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-heading text-2xl font-extrabold">Contoh unggah gambar admin</h1>
        <p className="mt-2 text-sm text-dark-500">Pratinjau lokal · Penyimpanan pada halaman ini disimulasikan.</p>
        <div className="my-5 flex flex-wrap gap-2">
          {Object.keys(forms).map((name) => <button key={name} type="button" onClick={() => { setTab(name); setResult(''); }} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === name ? 'bg-primary text-white' : 'border border-dark-200 bg-white text-dark-700'}`}>{name}</button>)}
        </div>
        <label className="mb-4 flex items-center gap-2 text-xs text-dark-600"><input type="checkbox" checked={fail} onChange={(event) => setFail(event.target.checked)} />Simulasikan kegagalan unggah</label>
        <div className="rounded-2xl border border-dark-100 bg-white p-5 shadow-card sm:p-6">
          <Form key={tab} onSubmit={save} onCancel={() => setResult('Dibatalkan.')} submitting={false} />
        </div>
        {result && <p role="status" className="mt-4 break-all rounded-lg bg-green-50 p-3 text-sm text-green-700">{result}</p>}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<Example />);
