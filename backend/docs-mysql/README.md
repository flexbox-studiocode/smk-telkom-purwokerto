# Panduan MySQL SMK Telkom Purwokerto

Panduan ini untuk developer baru yang menjalankan project dengan MySQL 8.4, Prisma 7, Node.js, Express, dan backup terenkripsi ke Supabase Storage.

Database lokal default: `smk_telkom_purwokerto`. MySQL adalah database operasional tunggal. Frontend tidak boleh mengakses MySQL langsung; semua akses melalui backend Express.

## Urutan belajar

1. [Instalasi Laragon](01-INSTALLATION-LARAGON.md)
2. [Start/stop MySQL](02-MYSQL-START-STOP.md)
3. [CLI dasar](03-MYSQL-CLI-BASIC.md)
4. [Database](04-DATABASE-MANAGEMENT.md)
5. [Tabel dan struktur](05-TABLE-AND-STRUCTURE.md)
6. [CRUD](06-CRUD-DATA.md)
7. [Query SQL](07-SQL-QUERY-REFERENCE.md)
8. [JOIN dan relasi](08-RELATIONSHIP-JOIN.md)
9. [User dan privilege](09-DATABASE-USER-PRIVILEGES.md)
10. [Prisma Studio](10-PRISMA-STUDIO.md)
11. [Migration dan seed](11-MIGRATION-AND-SEED.md)
12. [Backup manual](12-BACKUP-MANUAL.md)
13. [Backup otomatis](13-BACKUP-AUTOMATIC.md)
14. [Restore](14-RESTORE-DATABASE.md)
15. [Troubleshooting](15-MYSQL-TROUBLESHOOTING.md)
16. [VPS production](16-MYSQL-VPS-PRODUCTION.md)
17. [Security](17-DATABASE-SECURITY.md)

## Shortcut penting

```powershell
cd backend
npm run db:status
npm run db:migrate
npm test
npm run db:backup -- --no-upload
npm run db:backup:verify
```

Jangan menjalankan `DROP`, `TRUNCATE`, atau `DELETE` tanpa `WHERE` pada production. Backup encryption key harus disimpan di secret manager atau media terenkripsi di luar repository.
