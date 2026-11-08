import { apiRequest } from './apiClient';

export const PESAN_NEXTTEL_GAGAL = 'NextTel sedang mengalami kendala. Silakan coba lagi.';

const LABELS = {
  RPL: { id: 'Rekayasa Perangkat Lunak (RPL)', en: 'Software Engineering (RPL)' },
  PG: { id: 'Pengembangan Game (PG)', en: 'Game Development (PG)' },
  TKJ: { id: 'Teknik Komputer dan Jaringan (TKJ)', en: 'Computer and Network Engineering (TKJ)' },
  TJAT: { id: 'Teknik Jaringan Akses Telekomunikasi (TJAT)', en: 'Telecommunication Access Network Engineering (TJAT)' },
};

const CONTENT = {
  RPL: { id: ['Membuat solusi digital dan aplikasi.', 'Memahami logika pemrograman serta pengembangan software.'], en: ['Creating digital solutions and applications.', 'Building programming logic and software development skills.'] },
  PG: { id: ['Menciptakan pengalaman interaktif dan game.', 'Menggabungkan logika, desain, dan kreativitas.'], en: ['Creating interactive experiences and games.', 'Combining logic, design, and creativity.'] },
  TKJ: { id: ['Mengelola jaringan, perangkat, dan server.', 'Membangun koneksi yang aman dan stabil.'], en: ['Managing networks, devices, and servers.', 'Building secure and reliable connections.'] },
  TJAT: { id: ['Mempelajari infrastruktur telekomunikasi.', 'Memahami koneksi fiber dan perangkat akses.'], en: ['Learning telecommunications infrastructure.', 'Understanding fiber connections and access equipment.'] },
};

export const hasilFallbackNextTel = (result, language = 'id') => {
  const bahasa = language === 'en' ? 'en' : 'id';
  const major = result?.topRecommendation;
  if (!major) {
    return bahasa === 'en'
      ? { explanation: 'Your interests are not clear enough yet. Try describing the activities or field you enjoy most.', strengths: ['Your answers do not point clearly to one program yet.'], learningSuggestions: ['Try a small activity in software, games, networking, or telecommunications and see what you enjoy.'] }
      : { explanation: 'Minatmu belum bisa disimpulkan. Coba ceritakan aktivitas atau bidang yang paling kamu sukai.', strengths: ['Jawabanmu belum menunjukkan satu jurusan yang paling jelas.'], learningSuggestions: ['Coba kegiatan kecil di bidang software, game, jaringan, atau telekomunikasi untuk menemukan minatmu.'] };
  }
  const label = LABELS[major]?.[bahasa] ?? LABELS.RPL[bahasa];
  const content = CONTENT[major] ?? CONTENT.RPL;
  return bahasa === 'en'
    ? { explanation: `Based on your answers, your highest score is ${label}. This result reflects your interests and is a learning guide, not an official admission decision.`, strengths: content.en, learningSuggestions: [`Explore beginner projects related to ${label}.`, 'Practice consistently and discuss your interests with teachers.'] }
    : { explanation: `Berdasarkan jawabanmu, skor tertinggi adalah ${label}. Hasil ini mencerminkan minatmu dan menjadi panduan belajar, bukan keputusan resmi penerimaan siswa.`, strengths: content.id, learningSuggestions: [`Coba proyek pemula yang berkaitan dengan ${label}.`, 'Berlatih secara konsisten dan diskusikan minatmu dengan guru.'] };
};

const validasiHasil = (data) => data && typeof data.explanation === 'string' && Array.isArray(data.strengths) && data.strengths.every((item) => typeof item === 'string') && Array.isArray(data.learningSuggestions) && data.learningSuggestions.every((item) => typeof item === 'string');

// Backend /api/ai/nexttel adalah satu-satunya jalur penilaian NextTel.
// Provider AI dan kredensial hanya ada di server, bukan di browser.
const alamatNextTel = '/api/ai/nexttel';

// import.meta.env.DEV dilipat saat build, jadi cabang lokal hilang dari bundel
// produksi -- bukan sekadar tidak terpanggil.
export const nextTelSiap = true;

export async function jelaskanRekomendasiNextTel(payload, { signal } = {}) {
  if (!nextTelSiap) throw new Error(PESAN_NEXTTEL_GAGAL);

  try {
    const data = await apiRequest(alamatNextTel, {
      method: 'POST',
      signal,
      body: payload,
    });
    if (!validasiHasil(data)) throw new Error(PESAN_NEXTTEL_GAGAL);
    return {
      explanation: data.explanation.trim(),
      strengths: data.strengths.map((item) => item.trim()).filter(Boolean),
      learningSuggestions: data.learningSuggestions.map((item) => item.trim()).filter(Boolean),
    };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error(PESAN_NEXTTEL_GAGAL, { cause: error });
  }
}
