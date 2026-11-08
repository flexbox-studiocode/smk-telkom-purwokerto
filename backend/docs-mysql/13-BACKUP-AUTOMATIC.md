# Backup Otomatis

## Jadwal

| Platform | Waktu | Zona |
|---|---|---|
| Windows Task Scheduler | 02:00 harian | Asia/Jakarta |
| Linux systemd timer | 19:00 UTC harian | (02:00 WIB) |

## Windows

File template: `backend/schedulers/windows-backup-daily.xml`
Wrapper + logging: `backend/schedulers/run-backup.cmd`
Installer: `backend/schedulers/install-windows-task.ps1`

Install (mengisi path Node & backend otomatis):

```powershell
powershell -ExecutionPolicy Bypass -File schedulers\install-windows-task.ps1
# opsional:
#   -TaskName "SMK-Telkom-Backup-Daily" -Time "02:00" -RunNow
```

Jangan mengimpor XML langsung: ganti dulu placeholder `__CMD_EXE__`,
`__NODE_EXE__`, `__BACKEND_DIR__`, `__TIME__`, atau pakai installer di atas.

Status:

```powershell
schtasks /query /tn "SMK-Telkom-Backup-Daily" /v
```

Jalankan manual:

```powershell
schtasks /run /tn "SMK-Telkom-Backup-Daily"
```

Disable/hapus:

```powershell
powershell -ExecutionPolicy Bypass -File schedulers\install-windows-task.ps1 -Unregister
```

Log: `backend\logs\backup.log`.

## Linux

File: `backend/schedulers/linux-backup-daily.service` dan `.timer`.

Install:

```bash
sudo cp schedulers/linux-backup-daily.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now linux-backup-daily.timer
```

Sesuaikan `WorkingDirectory` dan path `node` pada file `.service`. User harus dapat membaca `.env` backend.

Status:

```bash
systemctl status linux-backup-daily.timer
systemctl list-timers linux-backup-daily.timer
journalctl -u linux-backup-daily.service -n 50
```

Jalankan manual:

```bash
sudo systemctl start linux-backup-daily.service
```

## Pencegahan backup bersamaan

Dua lapis: scheduler (`MultipleInstancesPolicy=IgnoreNew` pada Windows,
`Type=oneshot` pada systemd) dan lock eksklusif `.backup.lock` di `BACKUP_DIR`
yang dibuat dengan `fs.open(..., 'wx')`. Jika lock sudah ada, backup kedua
berhenti dengan pesan `Backup lain sedang berjalan` dan exit code != 0. Lock
selalu dirilis lewat blok `finally` dan handler event `exit`.

## Retensi

Backup berusia lebih dari `BACKUP_RETENTION_DAYS` (default 30) dihapus otomatis
setelah backup harian selesai, untuk file lokal dan objek Supabase Storage.
Penentuan usia memakai tanggal pada nama objek dengan zona `Asia/Jakarta`.
Objek tanpa tanggal backup tidak pernah dihapus otomatis, dan backup hari ini
selalu dipertahankan.

## Integritas unggahan remote

- Setiap objek diunggah hanya jika belum ada; jika sudah ada dengan isi yang
  sama, unggahan dilewati (idempoten). Jika sudah ada dengan isi berbeda,
  script menolak menimpa dan menandai backup gagal.
- Panggilan jaringan (upload, unduh/verifikasi, list, delete retensi) memakai
  retry dengan backoff; error 4xx tidak diulang, error jaringan/5xx diulang.
- Manifest boleh ditimpa (upsert) karena workflow menulisnya dua kali.
- Status akhir: `LOCAL_CREATED` -> `REMOTE_UPLOADED` -> `REMOTE_VERIFIED`.
  `REMOTE_UPLOADED` tidak sama dengan `REMOTE_VERIFIED`.
