# CRUD Data

## Membaca

```sql
SELECT * FROM berita;
SELECT id, judul, status FROM berita ORDER BY created_at DESC LIMIT 20;
SELECT COUNT(*) AS total FROM berita;
```

## Menambah

```sql
INSERT INTO berita (id, judul, slug, konten, status, created_at, updated_at)
VALUES (UUID(), 'Judul contoh', 'judul-contoh', 'Isi contoh', 'draft', NOW(), NOW());
```

Gunakan data contoh hanya pada database development.

## Mengubah dengan transaksi

```sql
START TRANSACTION;
UPDATE berita SET status = 'published' WHERE id = 'ID_DATA';
SELECT id, status FROM berita WHERE id = 'ID_DATA';
COMMIT;
-- gunakan ROLLBACK sebelum COMMIT jika hasil salah
```

## Menghapus

```sql
DELETE FROM berita WHERE id = 'ID_DATA';
```

`UPDATE` atau `DELETE` tanpa `WHERE` dapat mengubah/menghapus seluruh tabel. `TRUNCATE` menghapus semua baris. `DROP TABLE` menghapus struktur dan data. Jangan gunakan operasi tersebut langsung di production.
