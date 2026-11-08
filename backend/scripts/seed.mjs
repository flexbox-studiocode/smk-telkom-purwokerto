#!/usr/bin/env node
import 'dotenv/config';
import { prisma, closeDatabase } from '../src/db.js';
import argon2 from 'argon2';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_RECOVERY_PASSWORD = 12;

async function seedSiteSettings() {
  const existing = await prisma.siteSettings.findUnique({ where: { id: true } });
  if (!existing) {
    await prisma.siteSettings.create({
      data: {
        schoolName: 'SMK Telkom Purwokerto',
        npsn: '20303020',
        address: 'Jl. DI Panjaitan No.128, Purwokerto',
        phone: '(0281) 632138',
        email: 'info@smktelkom-pwt.sch.id',
        website: 'https://smk-telkom-purwokerto.vercel.app/',
        academicYear: '2027/2028',
        spmbOpen: true,
        newsPageSize: 5,
      },
    });
    console.log('Seed site_settings dibuat.');
  } else {
    console.log('Seed dilewati: site_settings sudah ada.');
  }
}

function readRecoveryInput() {
  const email = String(process.env.ADMIN_RECOVERY_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_RECOVERY_PASSWORD || '');
  const name = String(process.env.ADMIN_RECOVERY_NAME || 'Administrator Pemulihan').trim() || 'Administrator Pemulihan';
  if (!email && !password) return null;
  if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new Error('ADMIN_RECOVERY_EMAIL tidak valid (format email, maksimal 254 karakter).');
  if (password.length < MIN_RECOVERY_PASSWORD || password.length > 200) throw new Error(`ADMIN_RECOVERY_PASSWORD harus ${MIN_RECOVERY_PASSWORD}-200 karakter.`);
  return { email, password, name };
}

async function ensureAdmin() {
  const input = readRecoveryInput();
  if (!input) {
    console.log('Admin recovery dilewati: ADMIN_RECOVERY_EMAIL/ADMIN_RECOVERY_PASSWORD tidak di-set di .env');
    return;
  }
  const { email, password, name } = input;
  // Admin adalah profil dari User (relasi 1-1). Email dan password hidup di User.
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  // Idempotent: jangan menyentuh akun yang sudah menjadi admin.
  const existingUser = await prisma.user.findUnique({ where: { email }, include: { admin: true } });
  if (existingUser?.admin) {
    console.log(`Admin recovery dilewati: admin ${email} sudah ada. Tidak ada data yang diubah.`);
    return;
  }

  // Jangan diam-diam mengubah password atau menaikkan role akun yang sudah ada.
  // Akun existing hanya dipulihkan bila operator menyatakan maksudnya secara eksplisit.
  const allowExisting = process.env.ADMIN_RECOVERY_ALLOW_EXISTING === 'true';
  if (existingUser && !allowExisting) {
    throw new Error(
      `Email ${email} sudah terdaftar sebagai user tanpa profil admin. ` +
        'Tidak ada data yang diubah. Set ADMIN_RECOVERY_ALLOW_EXISTING=true hanya jika akun ini memang milik operator.',
    );
  }

  await prisma.$transaction(async (tx) => {
    const user = existingUser
      ? await tx.user.update({ where: { id: existingUser.id }, data: { passwordHash, emailVerified: new Date(), role: 'admin' } })
      : await tx.user.create({ data: { email, passwordHash, emailVerified: new Date(), role: 'admin' } });
    await tx.admin.create({ data: { userId: user.id, nama: name } });
  });
  console.log(`Admin recovery ${existingUser ? 'dipulihkan' : 'dibuat'}: ${email}`);
  console.log('PENTING: Hapus ADMIN_RECOVERY_* dari .env dan ganti password segera setelah login pertama.');
}

try {
  await seedSiteSettings();
  await ensureAdmin();
} finally {
  await closeDatabase();
}