# JOIN dan Relasi

Relasi inti project:

```text
users 1—1 admins
users 1—n sessions
users 1—n auth_tokens
users 1—1 ppdb_drafts
users 1—n ppdb
```

## INNER JOIN — admin dan user

```sql
SELECT a.nama, u.email, u.role
FROM admins a
INNER JOIN users u ON u.id = a.user_id;
```

## LEFT JOIN — pendaftar tanpa user

```sql
SELECT p.nama_lengkap, u.email
FROM ppdb p
LEFT JOIN users u ON u.id = p.auth_user_id;
```

## Relasi one-to-one

`ppdb.auth_user_id` memiliki unique index dan foreign key ke `users.id`, sehingga satu user hanya boleh memiliki satu pendaftaran PPDB.

## Relasi one-to-many

Satu user dapat memiliki banyak session dan banyak auth_token. Hapus user akan cascade menghapus session dan auth_token.
