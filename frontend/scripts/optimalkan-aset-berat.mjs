// Optimisasi aset bitmap berat (Phase 1).
//
// Menurunkan ukuran aset yang jauh melebihi ukuran tampilnya, atau yang
// memakai format keliru (foto disimpan sebagai PNG). Tidak mengubah rasio
// aspek, tidak mengubah desain, dan tidak menyentuh aset yang diuji
// pixel-identical oleh uji-performa (partners-bg, hero-calendar, stela-card-en).
//
// Berkas asal tetap ada di riwayat git, jadi penggantian bisa dibalik.
//
// Jalankan: npm run aset:optimum

import { stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const file = (rel) => path.join(root, rel);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const results = [];
const record = (label, before, after) =>
  results.push({ aset: label, sebelum: kb(before), sesudah: kb(after), hemat: `${Math.round((1 - after / before) * 100)}%` });

// PNG ber-alpha: kecilkan dimensi ke batas render, pertahankan transparansi.
const kecilkanPng = async (rel, width) => {
  const target = file(rel);
  const before = (await stat(target)).size;
  const buf = await sharp(target).resize({ width, withoutEnlargement: true }).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  if (buf.length < before) await writeFile(target, buf);
  record(rel, before, (await stat(target)).size);
};

// Foto (tanpa alpha) disimpan PNG -> konversi ke WebP, hapus sumber PNG.
const keWebp = async (rel, { width, quality }) => {
  const src = file(rel);
  const before = (await stat(src)).size;
  const out = src.replace(/\.png$/i, '.webp');
  await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 6, alphaQuality: 90 }).toFile(out);
  const after = (await stat(out)).size;
  await unlink(src);
  record(`${rel} -> ${path.basename(out)}`, before, after);
};

// WebP yang masih besar: rekompres lossy dengan dimensi tetap.
const rekompresWebp = async (rel, quality) => {
  const target = file(rel);
  const before = (await stat(target)).size;
  try {
    const buf = await sharp(target).webp({ quality, effort: 6, alphaQuality: 90 }).toBuffer();
    if (buf.length < before) await writeFile(target, buf);
  } catch (error) {
    // Berkas bisa terkunci proses lain (editor/antivirus) di Windows; jangan
    // batalkan seluruh optimisasi karena satu aset opsional.
    console.warn(`Lewati ${rel}: ${error.message}`);
    return;
  }
  record(rel, before, (await stat(target)).size);
};

// 1. Ikon branding: dimensi asli 1433x1098 / 501x498, tampil <= 200 CSS px.
await kecilkanPng('public/assets/branding/nexttel-mark.png', 640);
await kecilkanPng('public/assets/branding/nexa-mark.png', 384);

// 2. Latar About: foto 1847x1076 (punya alpha) -> WebP.
await keWebp('public/assets/branding/about-background.png', { width: 1600, quality: 78 });

// 3. Foto kelas: 4032x3024, file JPEG di dalam ekstensi .png.
await keWebp('src/assets/tentang/profile/mission-classroom.png', { width: 1600, quality: 80 });

// 4. Kartu mitra prestasi: PNG foto 786x506 (tanpa alpha) -> WebP.
await keWebp('src/assets/prestasi-remake/partnersCard.png', { width: 786, quality: 82 });
await keWebp('src/assets/prestasi-remake/partnersCard-en.png', { width: 786, quality: 82 });

// 5. Dekorasi laurel (alpha): tetap PNG, kompresi lebih kuat.
await kecilkanPng('src/assets/landing/laurel-branch.png', 273);

// 6. Peta kampus: WebP besar, ukuran dipertahankan (geometri panorama).
await rekompresWebp('src/assets/fasilitas/campus/campus-map.webp', 80);

console.table(results);
const totalBefore = results.reduce((s, r) => s + parseFloat(r.sebelum), 0);
const totalAfter = results.reduce((s, r) => s + parseFloat(r.sesudah), 0);
console.log(
  `\nTotal: ${totalBefore.toFixed(1)} KiB -> ${totalAfter.toFixed(1)} KiB ` +
    `(hemat ${(totalBefore - totalAfter).toFixed(1)} KiB, ${Math.round((1 - totalAfter / totalBefore) * 100)}%).`
);

const diganti = results.filter((r) => r.aset.includes('->'));
if (diganti.length) {
  console.log('\nAset berganti ekstensi — perbarui referensinya:');
  for (const { aset } of diganti) {
    const [dari, ke] = aset.split(' -> ');
    console.log(`  ${dari} -> ${ke}`);
  }
}
