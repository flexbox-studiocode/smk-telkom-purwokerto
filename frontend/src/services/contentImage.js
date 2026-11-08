import { api } from './apiClient';

// Mengunggah `image_file` (bila ada) ke endpoint konten admin, lalu mengganti
// kolom URL gambar dengan hasil unggahan. `image_file` tidak pernah ikut ke
// payload JSON endpoint konten sehingga aman dari objek File yang tidak valid.
export async function withUploadedImage(data, field) {
  if (!data || typeof data !== 'object') return data;
  const { image_file: file, ...rest } = data;
  if (!file) return rest;
  const uploaded = await api.upload('/api/uploads/content', file);
  if (!uploaded?.url) throw new Error('Unggahan gambar tidak mengembalikan URL.');
  return { ...rest, [field]: uploaded.url };
}