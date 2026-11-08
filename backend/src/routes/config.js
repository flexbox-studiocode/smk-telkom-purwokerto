import express from 'express';
import { OFFICIAL_ADMISSIONS_URL, isSpmbInternalEnabled } from '../config/features.js';

export const configRouter = express.Router();

// Konfigurasi publik runtime. Hanya nilai non-rahasia; tidak pernah memuat
// credential, secret, atau koneksi database.
configRouter.get('/', (_req, res) => {
  res.json({
    spmbInternalEnabled: isSpmbInternalEnabled(),
    officialAdmissionsUrl: OFFICIAL_ADMISSIONS_URL,
  });
});
