# Start dan Stop MySQL

## Melalui Laragon

1. Buka Laragon.
2. Klik `Start All` atau start MySQL saja.
3. Pastikan indikator MySQL hijau.
4. Klik `Stop` untuk menghentikan service dengan aman.

## Melalui PowerShell administrator

```powershell
Get-Service *mysql*
Start-Service MySQL84
Stop-Service MySQL84
```

Nama service bisa berbeda. Jangan mematikan proses `mysqld.exe` secara paksa kecuali service macet.

## Verifikasi

```powershell
mysqladmin -h 127.0.0.1 -P 3306 -u root -p ping
cd backend
npm run db:status
```
