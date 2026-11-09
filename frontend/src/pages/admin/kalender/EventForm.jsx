import RichTextEditor from '../../../components/dashboard/RichTextEditor';
import { useRef, useState } from 'react';
import FormInput from '../../../components/dashboard/FormInput';
import ImageUploadField from '../../../components/dashboard/ImageUploadField';
import { emptyEvent, getEventCategory, validateEvent } from '../../../utils/events';
import EventCategorySelect from './EventCategorySelect';
import { toDateKey } from '../../../utils/date';

export default function EventForm({ initialData, initialDate = '', onSave, onCancel, submitting }) {
  const [form, setForm] = useState(() => Object.fromEntries(Object.keys(emptyEvent).map(key => [key, ['tanggal_mulai', 'tanggal_selesai'].includes(key) ? toDateKey(initialData?.[key] ?? (key === 'tanggal_mulai' ? initialDate : '')) : initialData?.[key] ?? emptyEvent[key]])));
  const [id] = useState(() => crypto.randomUUID());
  const [errors, setErrors] = useState({}), [file, setFile] = useState(null), [imageReady, setImageReady] = useState(true);
  const locked = useRef(false);
  const update = (field, value) => { setForm(current => ({ ...current, [field]: value })); setErrors(current => ({ ...current, [field]: '', submit: '' })); };
  const submit = async event => {
    event.preventDefault();
    if (locked.current || submitting || !imageReady) return;
    const data = { ...form, waktu_mulai: form.waktu_mulai?.slice(0, 5) || '', waktu_selesai: form.waktu_selesai?.slice(0, 5) || '' };
    const next = validateEvent(data); setErrors(next);
    if (Object.keys(next).length) return;
    locked.current = true;
    try { const error = await onSave({ ...data, image_file: file }, id); if (error) setErrors({ submit: error }); }
    finally { locked.current = false; }
  };
  const field = (key, label, props = {}) => <FormInput key={key} label={label} value={form[key] || ''} onChange={event => update(key, event.target.value)} error={errors[key]} {...props} />;
  return <form onSubmit={submit} noValidate className="space-y-4">
    <fieldset disabled={submitting} className="space-y-4">
      {field('judul', 'Judul kegiatan (wajib)', { required: true, maxLength: 180, autoFocus: true })}
      {field('ringkasan', 'Deskripsi singkat', { as: 'textarea', rows: 2, maxLength: 500 })}
      {field('deskripsi', 'Deskripsi lengkap', { as: RichTextEditor, disabled: submitting, maxLength: 20000 })}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          {field('kategori', 'Kategori Kegiatan', { as: EventCategorySelect, onChange: value => update('kategori', value) })}
          {form.kategori && getEventCategory(form.kategori).legacy && <p className="mt-1.5 text-xs leading-relaxed text-dark-500">Kategori lama dipertahankan. Pilih kategori resmi yang sesuai untuk memperbarui indikator warna.</p>}
        </div>
        {field('status', 'Status publikasi', { as: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }] })}
        {field('tanggal_mulai', 'Tanggal mulai (wajib)', { type: 'date', required: true, min: '0100-01-01', max: '9999-12-31' })}
        {field('waktu_mulai', 'Waktu mulai (WIB)', { type: 'time', value: form.waktu_mulai?.slice(0, 5) || '' })}
        {field('tanggal_selesai', 'Tanggal selesai', { type: 'date', min: form.tanggal_mulai || '0100-01-01', max: '9999-12-31' })}
        {field('waktu_selesai', 'Waktu selesai (WIB)', { type: 'time', value: form.waktu_selesai?.slice(0, 5) || '' })}
        {field('lokasi', 'Lokasi', { maxLength: 240 })}
        {field('penyelenggara', 'Penyelenggara / Penanggung jawab', { maxLength: 160 })}
      </div>
      {field('link_informasi', 'Tautan informasi / pendaftaran', { type: 'url', maxLength: 2048, placeholder: 'https://...' })}
      <ImageUploadField label="Poster kegiatan" value={form.gambar_url} file={file} onUrlChange={value => update('gambar_url', value)} onFileChange={setFile} onValidityChange={setImageReady} disabled={submitting} />
      {errors.gambar_url && <p className="text-xs text-primary" role="alert">{errors.gambar_url}</p>}
    </fieldset>
    {errors.submit && <p role="alert" className="rounded-lg bg-primary-50 p-3 text-sm text-primary-800">{errors.submit}</p>}
    <div className="flex flex-col-reverse gap-2 border-t border-dark-100 pt-4 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} disabled={submitting} className="rounded-lg border border-dark-200 px-4 py-2.5 text-xs font-bold text-dark-600 disabled:opacity-50">Batal</button>
      <button type="submit" disabled={submitting || !imageReady} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-50">{submitting ? 'Menyimpan...' : 'Simpan Event'}</button>
    </div>
  </form>;
}
