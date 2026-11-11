import { z } from 'zod';

// Aturan form pra-chat NEXA. Salinan sisi klien: frontend/src/utils/nexaPrechat.js
// (dua paket terpisah, jadi aturannya harus diubah di dua tempat).
export const KATEGORI = ['sekolah', 'instansi'];
export const USIA_MIN = 5;
export const USIA_MAKS = 100;

// Nomor Indonesia: +62 / 62 / 0 diikuti 8-13 digit tanpa nol di depan.
// Disimpan sebagai string kanonik +62... agar nol di depan tidak hilang.
export function normalisasiTelepon(raw) {
  const bersih = String(raw ?? '').replace(/[\s\-().]/g, '');
  const cocok = /^(?:\+62|62|0)([1-9]\d{7,12})$/.exec(bersih);
  return cocok ? `+62${cocok[1]}` : null;
}

const teksOpsional = z.string().trim().max(100).nullish()
  .transform((v) => (v ? v.replace(/\s+/g, ' ') : null));

export const prechatSchema = z.object({
  nama: z.string().trim().min(2).max(100).regex(/^[\p{L}\p{M}][\p{L}\p{M} .,'’-]*$/u).transform((v) => v.replace(/\s+/g, ' ')),
  telepon: z.string().max(40).transform((v, ctx) => {
    const normal = normalisasiTelepon(v);
    if (!normal) ctx.addIssue({ code: 'custom', message: 'Nomor HP tidak valid.' });
    return normal;
  }),
  usia: z.number().int().min(USIA_MIN).max(USIA_MAKS),
  kategori: z.enum(KATEGORI),
  organisasi: teksOpsional,
}).strict();
