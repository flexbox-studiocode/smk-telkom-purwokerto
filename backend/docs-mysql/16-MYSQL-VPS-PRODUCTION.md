# MySQL VPS Production

## Instalasi Linux

```bash
sudo apt update
sudo apt install mysql-server mysql-client
sudo mysql_secure_installation
```

## Service

```bash
sudo systemctl enable --now mysql
sudo systemctl status mysql
```

## Koneksi

Produksi prioritaskan koneksi `localhost`/`127.0.0.1`. Jangan ekspos port 3306 ke internet.

```text
DATABASE_URL=mysql://smk_app:PASSWORD@127.0.0.1:3306/smk_telkom_purwokerto
```

## Firewall

```bash
sudo ufw deny 3306
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
```

## User dan permission

Buat user aplikasi dengan privilege terbatas. Backup user terpisah dengan `SELECT, LOCK TABLES, PROCESS, RELOAD`.

## Backup

Scheduler systemd timer menjalankan backup harian 02:00 WIB. Pastikan `.env` production memiliki `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `SUPABASE_BACKUP_BUCKET`.

## Monitoring

```bash
journalctl -u linux-backup-daily.service --since today
mysqladmin -h 127.0.0.1 -u smk_app -p status
```

## Restart policy

Backend dijalankan melalui PM2 atau systemd dengan restart otomatis. Pastikan `UPLOAD_ROOT` mengarah ke direktori persistent yang tidak hilang saat redeploy.
