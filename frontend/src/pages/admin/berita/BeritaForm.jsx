import RichTextEditor from '../../../components/dashboard/RichTextEditor';
import { richTextToPlain } from '../../../utils/richText';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { slugify } from '../../../utils/slug';
import ImageUploadField from '../../../components/dashboard/ImageUploadField';

const emptyForm = {
  judul: '',
  slug: '',
  ringkasan: '',
  konten: '',
  gambar_url: '',
  penulis: '',
  status: 'draft',
};

const inputClass = 'w-full rounded-lg border border-dark-200 px-3 py-2.5 text-sm text-dark-900 outline-none transition-colors placeholder:text-dark-400 focus:border-primary';
const labelClass = 'mb-1.5 block text-xs font-semibold text-dark-700';

const BeritaForm = ({ initialData, onSubmit, onCancel, submitting }) => {
  const [form, setForm] = useState(() => ({ ...emptyForm, ...initialData }));
  const [errors, setErrors] = useState({});
  const [regenerate, setRegenerate] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageReady, setImageReady] = useState(true);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleTitleChange = (value) => {
    setForm((current) => ({
      ...current,
      judul: value,
      slug: slugify(value),
    }));
    setErrors((current) => ({ ...current, judul: '', slug: '' }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.judul.trim()) nextErrors.judul = 'Judul wajib diisi.';
    // Slug final ditentukan backend; form hanya memeriksa slug yang sudah ada saat edit.
    if (initialData && !form.slug.trim()) nextErrors.slug = 'Slug wajib diisi.';
    if (!richTextToPlain(form.konten).trim()) nextErrors.konten = 'Konten wajib diisi.';
    if (!form.status) nextErrors.status = 'Status wajib dipilih.';
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
    // `slug` sengaja tidak dikirim: backend membuat slug judul + kode unik saat
    // create, dan mempertahankan slug lama saat edit kecuali regenerasi diminta.
    const submitError = await onSubmit({
      judul: form.judul.trim(),
      ringkasan: form.ringkasan.trim() || null,
      konten: form.konten.trim(),
      gambar_url: form.gambar_url?.trim() || null,
      image_file: imageFile,
      penulis: form.penulis.trim() || null,
      status: form.status,
      ...(regenerate ? { regenerateSlug: true } : {}),
    });
    if (submitError) setErrors({ submit: submitError });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="berita-judul" className={labelClass}>Judul *</label>
        <input id="berita-judul" value={form.judul} onChange={(event) => handleTitleChange(event.target.value)} className={inputClass} autoFocus required />
        {errors.judul && <p className="mt-1 text-xs text-primary-700">{errors.judul}</p>}
      </div>

      <div>
        <span className={labelClass}>Slug URL Berita</span>
        {initialData ? (
          <>
            <input id="berita-slug" value={form.slug} readOnly aria-readonly="true" className={`${inputClass} bg-dark-50 font-mono text-dark-700`} />
            <p className="mt-1 text-xs leading-relaxed text-dark-500">
              Slug ini adalah URL publik berita dan tidak berubah saat judul diedit. Perubahan judul tidak mengubah tautan lama.
              <Link to={`/berita/${form.slug}`} target="_blank" rel="noopener noreferrer" className="ml-1 font-semibold text-primary hover:underline">Lihat halaman</Link>
            </p>
            <button type="button" onClick={() => setRegenerate(true)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dark-200 px-3 py-2 text-xs font-bold text-dark-600 transition-colors hover:border-primary hover:text-primary">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Buat slug baru dari judul
            </button>
            {regenerate && <p role="status" className="mt-1 text-xs text-primary-700">Slug baru akan dibuat saat disimpan. Simpan pemetaan URL lama agar pengunjung tidak menemui 404.</p>}
          </>
        ) : (
          <>
            <div aria-live="polite">
              <input id="berita-slug" value={`${form.slug || 'judul-berita'}-xxxxx`} readOnly aria-readonly="true" className={`${inputClass} bg-dark-50 font-mono text-dark-700`} />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-dark-500">
              Slug dibuat otomatis dari judul oleh server. <code className="font-mono text-dark-700">xxxxx</code> adalah kode angka unik
              3–8 digit yang ditentukan saat berita disimpan agar setiap URL berita berbeda.
            </p>
          </>
        )}
      </div>

      <div>
        <label htmlFor="berita-ringkasan" className={labelClass}>Ringkasan</label>
        <textarea id="berita-ringkasan" value={form.ringkasan} onChange={(event) => updateField('ringkasan', event.target.value)} className={`${inputClass} min-h-20 resize-y`} rows="3" />
      </div>

      <div>
        <label htmlFor="berita-konten" className={labelClass}>Konten *</label>
        <RichTextEditor disabled={submitting} aria-label="Isi konten" id="berita-konten" value={form.konten} onChange={(event) => updateField('konten', event.target.value)} required />
        {errors.konten && <p className="mt-1 text-xs text-primary-700">{errors.konten}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ImageUploadField value={form.gambar_url} file={imageFile} onUrlChange={(value) => updateField('gambar_url', value)} onFileChange={setImageFile} onValidityChange={setImageReady} disabled={submitting} />
        <div>
          <label htmlFor="berita-penulis" className={labelClass}>Penulis</label>
          <input id="berita-penulis" value={form.penulis} onChange={(event) => updateField('penulis', event.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="berita-status" className={labelClass}>Status *</label>
        <select id="berita-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} className={inputClass} required>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        {errors.status && <p className="mt-1 text-xs text-primary-700">{errors.status}</p>}
      </div>

      {errors.submit && <p role="alert" className="text-xs text-primary-700">{errors.submit}</p>}
      <div className="flex flex-col-reverse gap-2 border-t border-dark-100 pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={submitting} className="rounded-lg border border-dark-200 px-4 py-2.5 text-xs font-bold text-dark-600 transition-colors hover:border-dark-400 disabled:opacity-50">Batal</button>
        <button type="submit" disabled={submitting || !imageReady} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? 'Menyimpan...' : 'Simpan Berita'}
        </button>
      </div>
    </form>
  );
};

export default BeritaForm;
