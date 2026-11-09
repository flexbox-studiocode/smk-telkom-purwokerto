import { ZodError } from 'zod';
import { HttpError } from '../utils/http.js';
import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.', path: req.path });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Data tidak valid.',
      code: 'validation_error',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code, details: err.details });
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'Data sudah ada.', code: 'duplicate' });
  }
  if (err?.code === 'P2003') {
    return res.status(409).json({ error: 'Data masih dipakai oleh data lain sehingga tidak dapat diubah.', code: 'conflict' });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'Data tidak ditemukan.', code: 'not_found' });
  }
  // Payload yang lolos Zod tetapi tidak sesuai tipe Prisma (mis. enum/relasi)
  // tetap kesalahan klien, bukan 500. Pesan mentah tidak dibocorkan.
  if (err?.name === 'PrismaClientValidationError') {
    return res.status(400).json({ error: 'Data yang dikirim tidak sesuai format yang diharapkan.', code: 'validation_error' });
  }
  console.error(JSON.stringify({ level: 'error', message: err?.message, path: req?.path }));
  res.status(500).json({ error: 'Terjadi kesalahan pada server.', code: 'internal_error' });
}

export function createLogger() {
  return (req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      console.log(
        JSON.stringify({
          level: 'info',
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          ms: Date.now() - started,
          env: env.NODE_ENV,
        }),
      );
    });
    next();
  };
}
