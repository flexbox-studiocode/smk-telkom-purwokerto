# Migration dan Seed

## Status migrasi

```powershell
cd backend
npx prisma validate
npm run db:status
```

## Membuat migration baru (development)

```powershell
npx prisma migrate dev --name deskripsi_perubahan
```

Ini mengubah schema MySQL. Review file `migration.sql` sebelum commit.

## Deploy migrasi ke production

```powershell
npm run db:migrate
```

`prisma migrate deploy` hanya menjalankan migrasi yang belum diterapkan. Tidak menjalankan migrasi yang sudah selesai.

## Seed

```powershell
npm run db:seed
```

Seed membuat `site_settings` default bila belum ada. Admin recovery dibuat bila `ADMIN_RECOVERY_EMAIL` dan `ADMIN_RECOVERY_PASSWORD` tersedia di `.env`, lalu wajib dihapus dan diganti setelah login pertama.

## Prisma Client

```powershell
npm run db:generate
```

Jalankan setelah mengubah `schema.prisma` agar type Prisma Client sinkron.
