import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, badRequest } from '../utils/http.js';
import { hitungHasilNextTel } from '../modules/nexttel/scoring.mjs';
import { KONTEN_SEKOLAH } from '../modules/stela/konten-sekolah.mjs';

export const aiRouter = express.Router();

function hasilPenjelasan(result, language = 'id') {
  const en = language === 'en';
  const labels = { RPL: 'Rekayasa Perangkat Lunak (RPL)', PG: 'Pengembangan Game (PG)', TKJ: 'Teknik Komputer dan Jaringan (TKJ)', TJAT: 'Teknik Jaringan Akses Telekomunikasi (TJAT)' };
  const label = labels[result.topRecommendation];
  return label
    ? {
      explanation: en
        ? `Based on your answers, the highest score is ${label}. This is a learning guide, not an admission decision.`
        : `Berdasarkan jawabanmu, skor tertinggi adalah ${label}. Hasil ini adalah panduan belajar, bukan keputusan penerimaan.`,
      strengths: [en ? `Your strongest interest is ${label}.` : `Minatmu paling kuat pada ${label}.`],
      learningSuggestions: [en ? `Try a beginner project related to ${label}.` : `Coba proyek pemula yang berkaitan dengan ${label}.`],
    }
    : {
      explanation: en ? 'Your interests do not point to one program yet.' : 'Minatmu belum menunjukkan satu jurusan yang paling jelas.',
      strengths: [en ? 'Your answers are still balanced.' : 'Jawabanmu masih seimbang.'],
      learningSuggestions: [en ? 'Try software, game, networking, or telecommunications activities.' : 'Coba kegiatan di bidang software, game, jaringan, atau telekomunikasi.'],
    };
}

const DAILY_LIMITS = { stela: Number(process.env.STELA_MAKS_PER_HARI || 200), nexttel: Number(process.env.NEXTTEL_MAKS_PER_HARI || 200) };

// Kuota dihitung per feature+hari (UTC). Satu statement atomik: increment
// hanya terjadi bila masih di bawah limit, sehingga dua request bersamaan
// tidak dapat melampaui kuota (race-safe).
// affectedRows: 1 = insert baru, 2 = increment, 0 = limit tercapai (no-op).
export async function reserveQuota(feature, limit, dayOverride) {
  if (!Number.isFinite(limit) || limit <= 0) return false;
  const day = dayOverride ? new Date(dayOverride) : new Date(); if (!dayOverride) day.setUTCHours(0, 0, 0, 0);
  try {
    // Pastikan baris hari ini ada (idempoten, aman untuk request bersamaan).
    await prisma.$executeRaw`
      INSERT IGNORE INTO ai_daily_attempts (\`feature\`, \`day\`, \`attempts\`)
      VALUES (${feature}, ${day}, 0)
    `;
    // Serialisasi per (feature, day) dengan row lock, lalu increment kondisional.
    return await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`
        SELECT attempts FROM ai_daily_attempts
        WHERE \`feature\` = ${feature} AND \`day\` = ${day}
        FOR UPDATE
      `;
      const attempts = Number(rows[0]?.attempts ?? 0);
      if (attempts >= limit) return false;
      await tx.$executeRaw`
        UPDATE ai_daily_attempts SET attempts = attempts + 1
        WHERE \`feature\` = ${feature} AND \`day\` = ${day}
      `;
      return true;
    });
  } catch {
    return false;
  }
}

const stelaLimit = rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.STELA_MAKS_PER_IP || 5), standardHeaders: true, legacyHeaders: false });
const nexttelLimit = rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.NEXTTEL_MAKS_PER_IP || 10), standardHeaders: true, legacyHeaders: false });

function stelaConfig() {
  const providerUrl = process.env.STELA_PROVIDER_URL;
  const apiKey = process.env.STELA_API_KEY || process.env.GEMINI_API_KEY || process.env.NINEROUTER_KEY;
  if (!apiKey) return null;
  if (providerUrl) return { kind: 'openai', url: providerUrl, apiKey, model: process.env.STELA_MODEL || process.env.NINEROUTER_MODEL || 'default' };
  return { kind: 'gemini', url: 'https://generativelanguage.googleapis.com/v1beta/models', apiKey, model: process.env.STELA_MODEL || 'gemini-2.5-flash' };
}

function buildPrompt(history) {
  return [
    { role: 'system', content: `Anda adalah NEXA, asisten informasi SMK Telkom Purwokerto. Jawab hanya pertanyaan tentang sekolah menggunakan konteks berikut. Jika di luar topik, tolak dengan sopan. Jangan mengarang data.\n\nKONTEKS:\n${KONTEN_SEKOLAH}` },
    ...history,
  ];
}

async function callProvider(config, messages) {
  const signal = AbortSignal.timeout(25000);
  if (config.kind === 'gemini') {
    const contents = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const res = await fetch(`${config.url}/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
      method: 'POST', signal, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: messages.find((m) => m.role === 'system')?.content || '' }] }, contents, generationConfig: { temperature: 0.4, maxOutputTokens: 800 } }),
    });
    if (!res.ok) throw new Error(`provider_${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
    if (!text) throw new Error('provider_empty');
    return text;
  }
  const res = await fetch(config.url, {
    method: 'POST', signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, messages, temperature: 0.4, max_tokens: 800 }),
  });
  if (!res.ok) throw new Error(`provider_${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('provider_empty');
  return text;
}

aiRouter.post('/stela', stelaLimit, asyncHandler(async (req, res) => {
  const { pertanyaan } = z.object({ pertanyaan: z.string().trim().min(1).max(500) }).parse(req.body);
  if (process.env.STELA_AKTIF === 'false') return res.status(503).json({ error: 'NEXA sedang nonaktif.', code: 'config' });
  const config = stelaConfig();
  if (!config) return res.status(503).json({ error: 'NEXA belum dikonfigurasi oleh administrator.', code: 'config' });
  if (!(await reserveQuota('stela', DAILY_LIMITS.stela))) return res.status(429).json({ error: 'Kuota NEXA hari ini sudah habis.', code: 'quota_exhausted' });

  let history = [];
  try {
    history = JSON.parse(pertanyaan);
    if (!Array.isArray(history)) history = [{ role: 'user', content: pertanyaan }];
  } catch {
    history = [{ role: 'user', content: pertanyaan }];
  }
  history = history
    .filter((m) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  try {
    const reply = await callProvider(config, buildPrompt(history));
    res.json({ reply, sumber: 'provider' });
  } catch (error) {
    const timeout = error?.name === 'TimeoutError' || /timeout/i.test(error?.message || '');
    console.error(JSON.stringify({ level: 'error', event: 'stela_provider_failed', reason: timeout ? 'timeout' : error?.message }));
    res.status(timeout ? 504 : 502).json({ error: 'NEXA sedang mengalami kendala. Silakan coba lagi.', code: timeout ? 'provider_timeout' : 'provider_failed' });
  }
}));

aiRouter.post('/nexttel', nexttelLimit, asyncHandler(async (req, res) => {
  const { answers, language } = z.object({
    answers: z.array(z.object({ questionId: z.string(), optionId: z.string(), text: z.string().optional() })).length(8),
    language: z.enum(['id', 'en']).optional(),
  }).parse(req.body);
  if (!(await reserveQuota('nexttel', DAILY_LIMITS.nexttel))) return res.status(429).json({ error: 'Kuota NextTel hari ini sudah habis.', code: 'quota_exhausted' });
  const result = hitungHasilNextTel(answers);
  if (!result) throw badRequest('Jawaban tidak valid.');
  res.json({ ...hasilPenjelasan(result, language || 'id'), data: result });
}));