import argon2 from 'argon2';
import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { hashToken, randomToken } from '../utils/crypto.js';
import { conflict, unauthorized } from '../utils/http.js';
import { sendResetEmail, sendVerificationEmail } from './emailService.js';

const SESSION_DAYS = 7;

export async function register({ email, password }) {
  const normalized = email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email: normalized } });
  if (exists) throw conflict('Email sudah terdaftar.', 'email_exists');
  const user = await prisma.user.create({ data: { email: normalized, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
  const token = randomToken();
  await prisma.authToken.create({ data: { userId: user.id, tokenHash: hashToken(token), purpose: 'verify_email', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
  await sendVerificationEmail(user, token);
  return user;
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() }, include: { admin: true } });
  if (!user || !(await argon2.verify(user.passwordHash, password))) throw unauthorized('Email atau password salah.');
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await prisma.session.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt } });
  return { user, token, expiresAt };
}

export async function logout(token) {
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export function publicUser(user) {
  // Hak admin ditentukan oleh relasi `admins`, bukan oleh string role yang bisa
  // tertinggal dari migrasi/provisioning lama.
  const role = user.admin ? 'admin' : user.role === 'admin' ? 'applicant' : user.role;
  return { id: user.id, email: user.email, role, emailVerified: Boolean(user.emailVerified) };
}
