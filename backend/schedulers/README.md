# Scheduler Backup

Backup harian pukul **02:00 WIB (Asia/Jakarta)** untuk MySQL + uploads, lalu
mengunggah hasil terenkripsi ke Supabase Storage (bucket privat `mysql-backups`).

## Windows (Task Scheduler)

Pendaftaran otomatis (mengisi path Node & backend secara dinamis, tidak
hardcoded ke komputer tertentu):

```powershell
powershell -ExecutionPolicy Bypass -File schedulers\install-windows-task.ps1
# opsional: -TaskName "SMK-Telkom-Backup-Daily" -Time "02:00" -RunNow
```

Installer membaca `windows-backup-daily.xml` (template) lalu mengganti
placeholder `__CMD_EXE__`, `__NODE_EXE__`, `__BACKEND_DIR__`, `__TIME__`.

- Action menjalankan `schedulers\run-backup.cmd <node.exe>`.
- Log ditulis ke `backend\logs\backup.log` (append).
- Exit code diteruskan ke Task Scheduler ("Last Result").
- `MultipleInstancesPolicy=IgnoreNew` + lock `.backup.lock` mencegah dua backup bersamaan.

Status / jalankan manual / hapus:

```powershell
schtasks /query /tn "SMK-Telkom-Backup-Daily" /v
schtasks /run   /tn "SMK-Telkom-Backup-Daily"
powershell -ExecutionPolicy Bypass -File schedulers\install-windows-task.ps1 -Unregister
```

Catatan: `DisallowStartIfOnBatteries=false` agar backup tetap berjalan pada
laptop yang memakai baterai. Untuk VPS yang selalu menyala ini tidak berpengaruh.

## Linux (systemd)

```bash
sudo cp schedulers/linux-backup-daily.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now linux-backup-daily.timer
```

Sesuaikan `WorkingDirectory`, `ExecStart`, `User`, `Group`, dan
`EnvironmentFile` pada `.service`. Timer memakai `OnCalendar=*-*-* 19:00:00 UTC`
(= 02:00 WIB) dan `Persistent=true`.

## Uji lokal yang sudah dijalankan

Lihat `docs/SCHEDULER_READINESS_REPORT.md`.
