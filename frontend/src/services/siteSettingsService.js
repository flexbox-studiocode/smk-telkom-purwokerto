import { api } from './apiClient';
import { generalFields, schoolFields, validateSettings } from '../utils/siteSettings';

export const getSiteSettings = async () => {
  const { data } = await api.get('/api/settings');
  return { ...data, school_name: data.schoolName ?? data.school_name, academic_year: data.academicYear ?? data.academic_year, spmb_open: data.spmbOpen ?? data.spmb_open, news_page_size: data.newsPageSize ?? data.news_page_size, logo_url: data.logoUrl ?? data.logo_url ?? null };
};

export async function requireAdmin() {
  const { user } = await api.get('/api/auth/me');
  if (user?.role !== 'admin') throw new Error('Akses admin diperlukan.');
  return user;
}

export async function saveSiteSettings(data, group, revision, file) {
  await requireAdmin();
  if (!['school', 'general'].includes(group)) throw new Error('Kelompok pengaturan tidak valid.');
  const fields = group === 'school' ? schoolFields : generalFields;
  const payload = Object.fromEntries(Object.keys(fields).map((key) => [key, typeof data[key] === 'string' ? data[key].trim() : data[key]]));
  if (group === 'school' && file) payload.logoUrl = null;
  if (group === 'general') payload.newsPageSize = Number(payload.news_page_size ?? payload.newsPageSize);
  const camel = { schoolName: payload.school_name, npsn: payload.npsn, address: payload.address, phone: payload.phone, email: payload.email, website: payload.website, logoUrl: payload.logo_url ?? payload.logoUrl, academicYear: payload.academic_year, spmbOpen: payload.spmb_open ?? payload.spmbOpen, newsPageSize: payload.newsPageSize };
  const validation = validateSettings(Object.fromEntries(Object.entries(payload).filter(([k]) => Object.hasOwn(fields, k))), group);
  if (Object.keys(validation).length) throw new Error('Periksa kembali isian pengaturan.');
  if (group === 'school' && file) {
    const uploaded = await api.upload('/api/uploads/content', file);
    camel.logoUrl = uploaded.url;
  }
  const saved = await api.patch('/api/settings', { ...Object.fromEntries(Object.entries(camel).filter(([, v]) => v !== undefined)), revision: Number(revision) });
  const verified = await getSiteSettings();
  if (verified.revision !== saved.data.revision) throw new Error('Data berubah lagi setelah disimpan. Muat ulang untuk melihat versi terbaru.');
  window.dispatchEvent(new Event('site-settings-changed'));
  try { localStorage.setItem('site-settings-changed', String(Date.now())); } catch { /* focus refresh remains available */ }
  return verified;
}

export async function saveAdminAccount({ full_name, email }) {
  await requireAdmin();
  const trimmedName = (full_name || '').trim();
  const trimmedEmail = (email || '').trim();
  if (!trimmedName || trimmedName.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) throw new Error('Nama atau email akun tidak valid.');
  const saved = await api.post('/api/auth/account', { full_name: trimmedName, email: trimmedEmail });
  return { user: { ...saved.user, user_metadata: { full_name: trimmedName } }, emailPending: Boolean(saved.emailPending), delivered: Boolean(saved.delivered) };
}
