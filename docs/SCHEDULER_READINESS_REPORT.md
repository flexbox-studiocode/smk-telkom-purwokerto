# Laporan Kesiapan Scheduler Backup

Diperbarui: 2026-11-05. Pengujian dilakukan pada host Windows lokal; tidak ada
perubahan pada server/VPS sekolah.

## 1. Artefak

| Berkas | Fungsi |
|---|---|
| `backend/schedulers/windows-backup-daily.xml` | Template Task Scheduler (placeholder `__CMD_EXE__`, `__NODE_EXE__`, `__BACKEND_DIR__`, `__TIME__`) |
| `backend/schedulers/install-windows-task.ps1` | Mendaftar/menghapus task, mengisi path otomatis |
| `backend/schedulers/run-backup.cmd` | Wrapper: menjalankan backup, menulis log, meneruskan exit code |
| `backend/schedulers/linux-backup-daily.service` | Unit systemd (oneshot) |
| `backend/schedulers/linux-backup-daily.timer` | Timer harian 19:00 UTC (= 02:00 WIB) |
| `backend/schedulers/README.md` | Instruksi singkat |

## 2. Windows — Hasil Pengujian Nyata

Perintah yang dijalankan:

```powershell
powershell -ExecutionPolicy Bypass -File schedulers\install-windows-task.ps1 -TaskName "SMK-Backup-Test-Probe" -RunNow
schtasks /Query /TN "SMK-Backup-Test-Probe" /FO LIST /V
```

Hasil:

| Aspek | Hasil |
|---|---|
| Task terdaftar | PASS (`SUCCESS: The scheduled task ... has successfully been created.`) |
| Jadwal | PASS — `Schedule Type: Daily`, `Start Time: 02:00`, `Next Run Time: 06/11/2026 02:00` |
| Eksekusi | PASS — `Status: Ready`, `Last Run Time: 05/11/2026 14:17:25`, `Last Result: 0` |
| Log | PASS — `backend\logs\backup.log` berisi `backup start`, JSON hasil, `backup exit 0` |
| Lock anti-ganda | PASS — instance kedua gagal: `Backup lain sedang berjalan: ...\.backup.lock`; lock tidak tertinggal setelah selesai |
| Exit code | PASS — 0 saat sukses; non-zero diteruskan |

Temuan saat pengujian: template awal memakai namespace XML yang salah
(`.../scheduler/2006/core`), elemen `<AllowStartIfOnBatteries>` yang tidak valid,
urutan `<Settings>` yang salah, dan `DisallowStartIfOnBatteries=true` yang
memblokir task pada laptop berjalan di baterai. Semua diperbaiki; namespace kini
`http://schemas.microsoft.com/windows/2004/02/mit/task` dan
`DisallowStartIfOnBatteries=false`.

Task uji `SMK-Backup-Test-Probe` **sudah dihapus** setelah pengujian. Tidak ada
task/jadwal yang ditinggalkan aktif.

## 3. Linux — Validasi Konfigurasi

Tidak ada host Linux pada environment ini, sehingga eksekusi systemd **belum
diuji** (NOT TESTED). Konfigurasi ditinjau:

| Aspek | Nilai | Status |
|---|---|---|
| Timer jadwal | `OnCalendar=*-*-* 19:00:00 UTC` = 02:00 WIB | REVIEWED |
| Zona | UTC eksplisit (tidak bergantung TZ host) | REVIEWED |
| Persistence | `Persistent=true` (menjalankan yang terlewat sekali) | REVIEWED |
| Service type | `Type=oneshot` | REVIEWED |
| Working dir | `/opt/smk-telkom-purwokerto/backend` (placeholder) | REVIEWED |
| Environment | `EnvironmentFile=.../.env` | REVIEWED |
| User/Group | `smk:smk` (placeholder, non-root) | REVIEWED |
| Logging | stdout -> journald; alternatif cron ke `/var/log/smk-backup.log` | REVIEWED |
| Failure | exit non-zero tercatat di journal; backup kedua dicegah lock | REVIEWED |

Saat deploy, sesuaikan `User`, `Group`, `WorkingDirectory`, `ExecStart`, dan
`EnvironmentFile`. Jalankan `systemctl start linux-backup-daily.service` untuk uji
manual di VPS (dilakukan administrator, bukan dalam sesi ini).

## 4. Kriteria Penerimaan

| Kriteria | Status |
|---|---|
| Script dapat dijalankan manual | PASS |
| Jadwal terdefinisi (02:00 WIB) | PASS |
| Environment terbaca (dotenv dari `backend/.env`) | PASS |
| Logging berfungsi | PASS |
| Error ditangani & exit code benar | PASS |
| Locking bekerja | PASS |
| Konfigurasi dapat dipindahkan tanpa hardcoded path komputer | PASS (installer mengisi path dinamis) |
| Eksekusi systemd pada Linux | NOT TESTED (tidak ada host Linux) |

## 5. Catatan Operasional

- `MYSQLDUMP_PATH` / `MYSQL_PATH` wajib absolut pada Windows (Laragon) dan VPS.
- `BACKUP_ENCRYPTION_KEY` harus tersedia pada environment scheduler; simpan di
  secret manager, jangan di dalam repo dan jangan di log.
- Task/gaya lama `schtasks /create ... /xml` tanpa penggantian placeholder tidak
  akan berjalan; gunakan installer.
