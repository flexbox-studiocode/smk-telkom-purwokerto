# Referensi Query SQL

```sql
SELECT * FROM users WHERE email = 'user@example.com';
SELECT * FROM berita WHERE judul LIKE '%sekolah%';
SELECT status, COUNT(*) AS total FROM berita GROUP BY status;
SELECT DISTINCT kategori FROM events;
SELECT * FROM berita ORDER BY created_at DESC LIMIT 20 OFFSET 20;
```

`WHERE` menyaring, `ORDER BY` mengurutkan, `LIMIT/OFFSET` membatasi halaman, `LIKE` mencari pola, `GROUP BY` mengelompokkan, `COUNT` menghitung, dan `DISTINCT` menghapus hasil duplikat.

Gunakan parameterized query dari Prisma/mysql2 pada aplikasi. Jangan merangkai input user ke SQL string.
