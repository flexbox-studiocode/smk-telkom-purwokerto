import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  UPLOAD_ROOT: z.string().optional(),
  // Absolute public base URL of this backend, used to build media URLs.
  MEDIA_BASE_URL: z.preprocess((value) => value === '' ? undefined : value, z.string().url().optional()),
  PUBLIC_STORAGE_URL: z.preprocess((value) => value === '' ? undefined : value, z.string().url().optional()),
  // Portal SPMB internal. Default nonaktif; lihat src/config/features.js.
  SPMB_INTERNAL_ENABLED: z.preprocess((value) => String(value ?? 'false').toLowerCase(), z.enum(['true', 'false'])).default('false'),
  // WordPress archive import: batas ukuran dump (default 64 MiB) dan lokasi
  // temporary private storage. Tidak ada nilai default yang menunjuk ke folder publik.
  WORDPRESS_IMPORT_MAX_BYTES: z.coerce.number().int().min(1024).max(512 * 1024 * 1024).default(64 * 1024 * 1024),
  WORDPRESS_IMPORT_TMP_DIR: z.string().optional(),
  WORDPRESS_IMPORT_RETENTION_HOURS: z.coerce.number().int().min(1).max(720).default(24),
  WORDPRESS_MEDIA_MAX_BYTES: z.coerce.number().int().min(1024).max(50 * 1024 * 1024).default(8 * 1024 * 1024),
});

export const env = schema.parse(process.env);