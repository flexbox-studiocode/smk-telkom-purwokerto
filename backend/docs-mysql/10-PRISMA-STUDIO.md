# Prisma Studio

Prisma Studio adalah UI data berbasis browser untuk inspeksi cepat.

## Menjalankan

```powershell
cd backend
npx prisma generate
npx prisma studio
```

Buka `http://localhost:5555`.

## Yang bisa dilakukan

- Melihat seluruh tabel.
- Menambah, mengedit, menghapus record.
- Menavigasi relasi (mis. user → admin).

## Risiko

Prisma Studio menulis langsung ke database. Jangan mengedit data production tanpa backup. Tidak ada validasi bisnis seperti pada backend.

## Kapan memilih SQL

Gunakan SQL/CLI ketika:
- Perlu transaksi multi-tabel.
- Perlu query agregat kompleks.
- Ingin audit penuh terhadap perubahan.
- Prisma Studio tidak menampilkan kolom JSON dengan baik.
