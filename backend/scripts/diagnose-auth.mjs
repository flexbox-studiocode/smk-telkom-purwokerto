#!/usr/bin/env node
// Diagnostik auth read-only untuk database lokal.
//
// Tujuan: menjelaskan mengapa login admin tidak mungkin tanpa membuat admin,
// mis. saat tabel `users` kosong padahal ada data konten published.
//
// Jaminan:
// - Hanya SELECT (count/findUnique). Tidak ada INSERT/UPDATE/DELETE.
// - Tidak pernah mencetak password, hash, token, atau isi DATABASE_URL.
// - Email, jika diminta, ditampilkan tersamarkan.
//
// Pemakaian:
//   node scripts/diagnose-auth.mjs
//   node scripts/diagnose-auth.mjs --email admin@example.com
//   node scripts/diagnose-auth.mjs --email admin@example.com --json
//
// Email juga dapat diberikan lewat env DIAGNOSE_EMAIL atau ADMIN_RECOVERY_EMAIL.
import 'dotenv/config';
import argon2 from 'argon2';
import { prisma, closeDatabase } from '../src/db.js';

const args = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const asJson = args.includes('--json');
const requestedEmail = String(
  valueAfter('--email') || process.env.DIAGNOSE_EMAIL || process.env.ADMIN_RECOVERY_EMAIL || '',
).trim().toLowerCase();
// Password opsional hanya untuk memverifikasi Argon2. Sengaja dibaca dari env
// (bukan argumen CLI) agar tidak muncul pada riwayat perintah. Tidak pernah dicetak.
const providedPassword = String(process.env.DIAGNOSE_PASSWORD || process.env.ADMIN_RECOVERY_PASSWORD || '');

function describeTarget() {
  try {
    const url = new URL(process.env.DATABASE_URL || '');
    return {
      configured: true,
      protocol: url.protocol.replace(/:$/, ''),
      host: url.hostname,
      port: url.port || '3306',
      database: url.pathname.replace(/^\//, ''),
      credentials: url.username || url.password ? 'configured (not printed)' : 'absent',
    };
  } catch {
    return { configured: false };
  }
}

function maskEmail(email) {
  const [local, domain] = String(email || '').split('@');
  if (!domain) return '***';
  const shown = local.length <= 1 ? '*' : `${local[0]}***`;
  return `${shown}@${domain}`;
}

// Hanya mengklasifikasikan prefix format; hash itu sendiri tidak pernah dicetak.
function classifyHash(hash) {
  if (!hash) return 'empty';
  if (hash.startsWith('$argon2id$')) return 'argon2id';
  if (hash.startsWith('$argon2i$')) return 'argon2i';
  if (hash.startsWith('$argon2d$')) return 'argon2d';
  if (/^\$2[aby]\$/.test(hash)) return 'bcrypt';
  return 'unknown';
}

async function collect() {
  const [users, admins, sessions, authTokens, events, publishedEvents] = await Promise.all([
    prisma.user.count(),
    prisma.admin.count(),
    prisma.session.count(),
    prisma.authToken.count(),
    prisma.event.count(),
    prisma.event.count({ where: { status: 'published' } }),
  ]);

  let email = null;
  if (requestedEmail) {
    const user = await prisma.user.findUnique({
      where: { email: requestedEmail },
      include: { admin: true },
    });
    let passwordHashValid = null;
    if (user && providedPassword) {
      passwordHashValid = await argon2.verify(user.passwordHash, providedPassword).catch(() => false);
    }
    email = user
      ? {
          value: maskEmail(user.email),
          found: true,
          role: user.role,
          adminRelation: Boolean(user.admin),
          emailVerified: Boolean(user.emailVerified),
          passwordHashFormat: classifyHash(user.passwordHash),
          passwordHashValid,
        }
      : { value: maskEmail(requestedEmail), found: false, adminRelation: false, passwordHashValid: null };
  }

  // Status ringkas untuk konsumsi otomasi. Tidak memuat hash/token/credential.
  const status = {
    DATABASE_CONNECTED: true,
    USER_FOUND: Boolean(email?.found),
    ADMIN_PROFILE_FOUND: Boolean(email?.found && email.adminRelation),
    PASSWORD_HASH_VALID: email?.found ? email.passwordHashValid : null,
    ACCOUNT_RECOVERY_REQUIRED: requestedEmail ? !(email?.found && email.adminRelation) : admins === 0,
  };

  return {
    readOnly: true,
    database: describeTarget(),
    counts: { users, admins, sessions, authTokens, events, publishedEvents },
    login: {
      adminProfiles: admins,
      adminLoginAvailable: admins > 0,
    },
    status,
    email,
  };
}

try {
  const report = await collect();
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const target = report.database;
    console.log(`Database : ${target.host}:${target.port}/${target.database} (${target.protocol})`);
    console.log(`Kredensial: ${target.credentials}`);
    console.log(`Users     : ${report.counts.users}`);
    console.log(`Admins    : ${report.counts.admins}`);
    console.log(`Sessions  : ${report.counts.sessions}`);
    console.log(`Auth token: ${report.counts.authTokens}`);
    console.log(`Events    : ${report.counts.events} total, ${report.counts.publishedEvents} published`);
    console.log(`Login admin tersedia: ${report.login.adminLoginAvailable ? 'ya' : 'tidak (tidak ada profil admin)'}`);
    if (report.email) {
      const entry = report.email;
      if (entry.found) {
        console.log(`Email ${entry.value}: ditemukan; role=${entry.role}; relasi admin=${entry.adminRelation ? 'ada' : 'tidak ada'}; verified=${entry.emailVerified ? 'ya' : 'tidak'}; format hash=${entry.passwordHashFormat}`);
      } else {
        console.log(`Email ${entry.value}: tidak ditemukan`);
      }
      if (entry.passwordHashValid === true) console.log('Verifikasi password: cocok (Argon2)');
      else if (entry.passwordHashValid === false) console.log('Verifikasi password: TIDAK cocok');
      else console.log('Verifikasi password: tidak diuji (set DIAGNOSE_PASSWORD untuk memeriksa)');
    } else {
      console.log('Email    : tidak diminta (pakai --email untuk memeriksa satu akun)');
    }
    console.log('Status   : ' + Object.entries(report.status).map(([key, value]) => `${key}=${value === null ? 'null' : value}`).join(' '));
  }
} catch (error) {
  console.error(`Diagnostik gagal: ${error?.message || 'kesalahan tidak diketahui'}`);
  console.error('Status   : DATABASE_CONNECTED=false ACCOUNT_RECOVERY_REQUIRED=unknown');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}