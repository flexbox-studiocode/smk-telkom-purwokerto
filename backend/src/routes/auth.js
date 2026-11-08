import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { loginSchema, registerSchema } from '../validators/auth.js';
import { asyncHandler, conflict } from '../utils/http.js';
import { login, logout, publicUser, register } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';
import argon2 from 'argon2';
import { hashToken, randomToken } from '../utils/crypto.js';
import { sendResetEmail, sendVerificationEmail } from '../services/emailService.js';

export const authRouter = express.Router();
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };

function verificationData(user) {
  const token = randomToken();
  return {
    token,
    data: { userId: user.id, tokenHash: hashToken(token), purpose: 'verify_email', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  };
}

authRouter.post('/register', loginLimit, asyncHandler(async (req, res) => {
  const user = await register(registerSchema.parse(req.body));
  res.status(201).json({ user: publicUser(user), message: 'Registrasi berhasil. Verifikasi email diperlukan.' });
}));

authRouter.post('/login', loginLimit, asyncHandler(async (req, res) => {
  const result = await login(loginSchema.parse(req.body));
  res.cookie('session_token', result.token, { ...cookieOptions, expires: result.expiresAt });
  res.json({ user: publicUser(result.user), expiresAt: result.expiresAt });
}));

authRouter.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await logout(req.cookies.session_token);
  res.clearCookie('session_token', cookieOptions);
  res.status(204).end();
}));

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

authRouter.post('/verify-email', asyncHandler(async (req, res) => {
  const token = String(req.body?.token || '');
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.purpose !== 'verify_email' || record.expiresAt < new Date()) return res.status(400).json({ error: 'Token verifikasi tidak valid atau kedaluwarsa.' });
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    prisma.authToken.delete({ where: { id: record.id } }),
  ]);
  res.json({ message: 'Email berhasil diverifikasi.' });
}));

authRouter.post('/verify-email/resend', loginLimit, requireAuth, asyncHandler(async (req, res) => {
  if (req.user.emailVerified) return res.json({ message: 'Email sudah terverifikasi.', delivered: false });
  const { token, data } = verificationData(req.user);
  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId: req.user.id, purpose: 'verify_email' } }),
    prisma.authToken.create({ data }),
  ]);
  const result = await sendVerificationEmail(req.user, token);
  res.json({ message: 'Email verifikasi telah dikirim ulang.', delivered: result.delivered });
}));

authRouter.post('/password-reset/request', loginLimit, asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = randomToken();
    await prisma.authToken.create({ data: { userId: user.id, tokenHash: hashToken(token), purpose: 'password_reset', expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    await sendResetEmail(user, token);
  }
  res.json({ message: 'Jika email terdaftar, instruksi reset telah dikirim.' });
}));

authRouter.post('/password-reset/confirm', asyncHandler(async (req, res) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  if (password.length < 8) return res.status(400).json({ error: 'Password minimal 8 karakter.' });
  const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.purpose !== 'password_reset' || record.expiresAt < new Date()) return res.status(400).json({ error: 'Token reset tidak valid atau kedaluwarsa.' });
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } }),
    prisma.authToken.delete({ where: { id: record.id } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  res.json({ message: 'Password berhasil diubah.' });
}));

const accountSchema = z.object({
  full_name: z.string().trim().min(1).max(150).optional(),
  email: z.string().email().max(254).optional(),
});

authRouter.post('/account', requireAuth, asyncHandler(async (req, res) => {
  const input = accountSchema.parse(req.body);
  const admin = await prisma.admin.findUnique({ where: { userId: req.user.id } });
  if (!admin) return res.status(403).json({ error: 'Hanya administrator yang dapat mengubah profil ini.' });

  const nextEmail = input.email?.toLowerCase().trim();
  const emailChanged = nextEmail && nextEmail !== req.user.email;
  if (emailChanged) {
    const existing = await prisma.user.findUnique({ where: { email: nextEmail } });
    if (existing && existing.id !== req.user.id) throw conflict('Email sudah digunakan akun lain.', 'email_exists');
  }

  const { token, data } = verificationData(req.user);
  const updated = await prisma.$transaction(async (tx) => {
    if (input.full_name) await tx.admin.update({ where: { userId: req.user.id }, data: { nama: input.full_name } });
    if (emailChanged) {
      await tx.user.update({ where: { id: req.user.id }, data: { email: nextEmail, emailVerified: null } });
      await tx.authToken.deleteMany({ where: { userId: req.user.id, purpose: 'verify_email' } });
      await tx.authToken.create({ data });
    }
    return tx.user.findUnique({ where: { id: req.user.id }, include: { admin: true } });
  });

  let delivered = false;
  if (emailChanged) delivered = (await sendVerificationEmail(updated, token)).delivered;
  res.json({ user: publicUser(updated), emailPending: Boolean(emailChanged), delivered });
}));