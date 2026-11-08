# Progres Migrasi MySQL — SMK Telkom Purwokerto

Dokumen kerja internal. Terakhir diperbarui: 2026-11-04 (revisi 2).

## Status Ringkas

| Fase | Status |
|---|---|
| PHASE 0 — Audit Repository | DONE |
| PHASE 1 — MySQL Primary Architecture | DONE |
| PHASE 2 — Schema & Migration | DONE (4 migrasi applied) |
| PHASE 3 — Supabase ETL | DONE sebagian (131 record; `ai_daily_attempts` BLOCKED_RLS) |
| PHASE 4 — File & Storage Migration | DONE publik (26 file); privat BLOCKED (sumber kosong) |
| PHASE 5 — Backend/Frontend Refactor | DONE (0 referensi Supabase runtime) |
| PHASE 6 — Backup & Restore | Lokal PASS; remote BLOCKED (kredensial) |
| PHASE 7 — Laragon Local | DONE (MySQL 8.4.3) |
| PHASE 8 — VPS Prep | DOCUMENTED (deployment BLOCKED) |
| PHASE 9 — Documentation | DONE (17 dokumen `backend/docs-mysql/`) |
| PHASE 10 — Testing & Report | DONE (19/19 backend, lint, typecheck, build) |

## Perbaikan Revisi 2

1. `seed.mjs` admin recovery diperbaiki (User + Admin).
2. ETL `site_visitors.day` masuk kolom INSERT + zona Asia/Jakarta.
3. Inventaris kolom URL storage; dokumen privat tidak dijadikan URL publik.
4. Enum kategori events disamakan dengan DB (14 nilai).
5. Kuota AI dibuat atomik (`INSERT IGNORE` + `SELECT ... FOR UPDATE`).
6. Backup: status `LOCAL_CREATED → REMOTE_UPLOADED → REMOTE_VERIFIED`, verifikasi manifest, cleanup rekursif + paginasi.
7. Restore: lokal + remote, validasi manifest/checksum/count, guard production & tar traversal.
8. `storage.js` menolak path traversal.
9. Timezone tanggal disamakan (Asia/Jakarta).
10. Scheduler XML/systemd diperbaiki.
11. Dokumentasi `backend/docs-mysql/` dibuat lengkap.

## Bukti Kunci

- Backend tests: `npm test` → 19/19 PASS.
- Frontend: `npm run lint`, `npm run typecheck`, `CI=true npm run build:ci` → PASS (102 rute).
- Backup lokal: `backups/manifests/backup-2026-11-04.json` (status `LOCAL_CREATED`).
- Restore lokal: `smk_restore_test_v2` cocok manifest, lalu di-drop.
- Restore uploads: 26 file.
- ETL summary: `backend/docs/etl-summary-2026-11-04T14-58-05-376Z.json`.

## Blocker Tersisa

1. Upload/verifikasi/retensi backup remote (butuh `SUPABASE_SERVICE_ROLE_KEY` + bucket).
2. ETL `ai_daily_attempts` (RLS) dan dokumen PPDB privat (butuh service role key).
3. Migrasi hash password Supabase Auth → prosedur recovery admin.
4. NEXA/STELA live (butuh provider key).
5. Deployment VPS (tanpa akses).
6. Pengujian scheduler pada OS host belum dijalankan.

Lihat `MYSQL_MIGRATION_REPORT.md` untuk detail dan bukti.