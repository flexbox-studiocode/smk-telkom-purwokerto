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
});

export const env = schema.parse(process.env);