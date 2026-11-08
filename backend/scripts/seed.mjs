#!/usr/bin/env node
import 'dotenv/config';
import { prisma, closeDatabase } from '../src/db.js';
import argon2 from 'argon2';

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

async function ensureAdmin() {
  const email = process.env.ADMIN_RECOVERY_EMAIL;
  const password = process.env.ADMIN_RECOVERY_PASSWORD;
  const name = process.env.ADMIN_RECOVERY_NAME || 'Administrator Pemulihan';
  if (!email || !password) {
    console.log('Admin recovery dilewati: ADMIN_RECOVERY_EMAIL/ADMIN_RECOVERY_PASSWORD tidak di-set di .env');
    return;
  }
  // Admin adalah profil dari User (relasi 1-1). Email dan password hidup di User.
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail }, include: { admin: true } });
  if (existingUser?.admin) {
    console.log(`Admin recovery dilewati: admin ${normalizedEmail} sudah ada.`);
    return;
  }
  await prisma.$transaction(async (tx) => {
    const user = existingUser
      ? await tx.user.update({ where: { id: existingUser.id }, data: { passwordHash, emailVerified: new Date(), role: 'admin' } })
      : await tx.user.create({ data: { email: normalizedEmail, passwordHash, emailVerified: new Date(), role: 'admin' } });
    await tx.admin.create({ data: { userId: user.id, nama: name } });
  });
  console.log(`Admin recovery dibuat: ${normalizedEmail}`);
  console.log('PENTING: Hapus ADMIN_RECOVERY_* dari .env dan ganti password segera setelah login pertama.');
}

try {
  await seedSiteSettings();
  await ensureAdmin();
} finally {
  await closeDatabase();
}
