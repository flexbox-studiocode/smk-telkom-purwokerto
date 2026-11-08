import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { env } from './config/env.js';
import { createLogger, errorHandler, notFoundHandler } from './middleware/error.js';
import { requireCsrf, csrfToken } from './middleware/csrf.js';
import { HttpError } from './utils/http.js';
import { authRouter } from './routes/auth.js';
import { prisma } from './db.js';
import { createContentRouter } from './routes/content.js';
import { adminRouter } from './routes/admin.js';
import { ppdbRouter } from './routes/ppdb.js';
import { eventsRouter } from './routes/events.js';
import { spmbRouter } from './routes/spmb.js';
import { settingsRouter } from './routes/settings.js';
import { statsRouter } from './routes/stats.js';
import { aiRouter } from './routes/ai.js';
import { uploadsRouter } from './routes/uploads.js';
import { turnstileRouter } from './routes/turnstile.js';

export const app = express();
app.disable('x-powered-by');
// API JSON here is dynamic and partially session-dependent (admin vs guest).
// Disable automatic ETag validators so Express never answers API GETs with an
// empty 304, and let static upload routes keep their own cache validators.
app.set('etag', false);
app.use(helmet());
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'private, no-store, max-age=0');
  res.set('Pragma', 'no-cache');
  next();
});
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use(createLogger());
const isSameOrigin = (req) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  const origin = req.get('origin');
  if (!origin) return true;
  const allowed = env.FRONTEND_URL.replace(/\/$/, '');
  return origin === allowed || origin === `${req.protocol}://${req.get('host')}`;
};
app.use((req, _res, next) => (isSameOrigin(req) ? next() : next(new HttpError(403, 'Origin tidak diizinkan.', 'origin_rejected'))));
app.use(requireCsrf);

app.get('/health', async (_req, res) => {
  const payload = { ok: true, service: 'smk-backend', uptime: Math.round(process.uptime()) };
  try {
    await prisma.$queryRaw`SELECT 1`;
    payload.database = 'up';
  } catch {
    payload.database = 'down';
    payload.ok = false;
  }
  res.status(payload.ok ? 200 : 503).json(payload);
});
app.get('/api/auth/csrf', csrfToken);
app.use('/api/auth', authRouter);
app.use('/api/berita', createContentRouter('berita'));
app.use('/api/pengumuman', createContentRouter('pengumuman'));
app.use('/api/prestasi', createContentRouter('prestasi'));
app.use('/api/bkk', createContentRouter('bkk'));
app.use('/api/admin', adminRouter);
app.use('/api/ppdb', ppdbRouter);
app.use('/api/events', eventsRouter);
app.use('/api/spmb', spmbRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/turnstile', turnstileRouter);
app.use('/uploads/content-images', express.static(path.join(process.env.UPLOAD_ROOT || 'uploads', 'content-images'), { maxAge: '7d' }));

app.use(notFoundHandler);
app.use(errorHandler);
