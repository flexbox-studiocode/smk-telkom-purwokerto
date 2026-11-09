import RichTextEditor from '../../../components/dashboard/RichTextEditor';
import { useState } from 'react';
import ImageUploadField from '../../../components/dashboard/ImageUploadField';
import { toDateKey } from '../../../utils/date';

const emptyForm = { perusahaan: '', posisi: '', deskripsi: '', lokasi: '', tipe_pekerjaan: '', deadline: '', status: 'aktif', link_pendaftaran: '', logo_url: '' };
const inputClass = 'w-full rounded-lg border border-dark-200 px-3 py-2.5 text-sm text-dark-900 outline-none transition-colors placeholder:text-dark-400 focus:border-primary';
const labelClass = 'mb-1.5 block text-xs font-semibold text-dark-700';

const BkkForm = ({ initialData, onSubmit, onCancel, submitting }) => {
  const [form, setForm] = useState(() => ({ ...emptyForm, ...initialData, deadline: toDateKey(initialData?.deadline) }));
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imageReady, setImageReady] = useState(true);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.perusahaan.trim()) nextErrors.perusahaan = 'Perusahaan wajib diisi.';
    if (!form.posisi.trim()) nextErrors.posisi = 'Posisi wajib diisi.';
    if (!form.status || !['aktif', 'ditutup'].includes(form.status)) nextErrors.status = 'Status wajib dipilih.';
    if (form.link_pendaftaran.trim()) {
      try {
        const url = new URL(form.link_pendaftaran.trim());
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
      } catch {
        nextErrors.link_pendaftaran = 'Link pendaftaran harus berupa URL yang valid.';
      }
    }
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !imageReady) return;
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const submitError = await onSubmit({
      perusahaan: form.perusahaan.trim(),
      posisi: form.posisi.trim(),
      deskripsi: form.deskripsi.trim() || null,
      lokasi: form.lokasi.trim() || null,
      tipe_pekerjaan: form.tipe_pekerjaan.trim() || null,
      deadline: form.deadline || null,
      status: form.status,
      link_pendaftaran: form.link_pendaftaran.trim() || null,
      logo_url: form.logo_url?.trim() || null,
      image_file: imageFile,
    });
    if (submitError) setErrors({ submit: submitError });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bkk-perusahaan" className={labelClass}>Perusahaan *</label>
          <input id="bkk-perusahaan" value={form.perusahaan} onChange={(event) => updateField('perusahaan', event.target.value)} className={inputClass} autoFocus required />
          {errors.perusahaan && <p className="mt-1 text-xs text-primary-700">{errors.perusahaan}</p>}
        </div>
        <div>
          <label htmlFor="bkk-posisi" className={labelClass}>Posisi *</label>
          <input id="bkk-posisi" value={form.posisi} onChange={(event) => updateField('posisi', event.target.value)} className={inputClass} required />
          {errors.posisi && <p className="mt-1 text-xs text-primary-700">{errors.posisi}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="bkk-deskripsi" className={labelClass}>Deskripsi</label>
        <RichTextEditor disabled={submitting} aria-label="Isi konten" id="bkk-deskripsi" value={form.deskripsi} onChange={(event) => updateField('deskripsi', event.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bkk-lokasi" className={labelClass}>Lokasi</label>
          <input id="bkk-lokasi" value={form.lokasi} onChange={(event) => updateField('lokasi', event.target.value)} className={inputClass} placeholder="Contoh: Purwokerto" />
        </div>
        <div>
          <label htmlFor="bkk-tipe" className={labelClass}>Tipe Pekerjaan</label>
          <input id="bkk-tipe" value={form.tipe_pekerjaan} onChange={(event) => updateField('tipe_pekerjaan', event.target.value)} className={inputClass} placeholder="Contoh: Full-time" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bkk-deadline" className={labelClass}>Deadline</label>
          <input id="bkk-deadline" type="date" value={form.deadline} onChange={(event) => updateField('deadline', event.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="bkk-status" className={labelClass}>Status *</label>
          <select id="bkk-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} className={inputClass} required>
            <option value="aktif">Aktif</option>
            <option value="ditutup">Ditutup</option>
          </select>
          {errors.status && <p className="mt-1 text-xs text-primary-700">{errors.status}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bkk-link" className={labelClass}>Link Pendaftaran</label>
          <input id="bkk-link" type="url" value={form.link_pendaftaran} onChange={(event) => updateField('link_pendaftaran', event.target.value)} className={inputClass} placeholder="https://..." />
          {errors.link_pendaftaran && <p className="mt-1 text-xs text-primary-700">{errors.link_pendaftaran}</p>}
        </div>
        <ImageUploadField label="Logo perusahaan" coverAspect={1} value={form.logo_url} file={imageFile} onUrlChange={(value) => updateField('logo_url', value)} onFileChange={setImageFile} onValidityChange={setImageReady} disabled={submitting} />
      </div>

      {errors.submit && <p role="alert" className="text-xs text-primary-700">{errors.submit}</p>}
      <div className="flex flex-col-reverse gap-2 border-t border-dark-100 pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={submitting} className="rounded-lg border border-dark-200 px-4 py-2.5 text-xs font-bold text-dark-600 hover:border-dark-400 disabled:opacity-50">Batal</button>
        <button type="submit" disabled={submitting || !imageReady} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Menyimpan...' : 'Simpan BKK'}</button>
      </div>
    </form>
  );
};

export default BkkForm;

