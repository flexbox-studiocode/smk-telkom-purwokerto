# User dan Privilege MySQL

## Membuat user aplikasi

```sql
CREATE USER 'smk_app'@'%' IDENTIFIED BY 'PASSWORD_KUAT';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, ALTER, REFERENCES
  ON smk_telkom_purwokerto.* TO 'smk_app'@'%';
FLUSH PRIVILEGES;
```

## Melihat grants

```sql
SHOW GRANTS FOR 'smk_app'@'%';
```

## Mencabut privilege

```sql
REVOKE CREATE, ALTER ON smk_telkom_purwokerto.* FROM 'smk_app'@'%';
FLUSH PRIVILEGES;
```

## Mengubah password

```sql
ALTER USER 'smk_app'@'%' IDENTIFIED BY 'PASSWORD_BARU';
```

## Prinsip least privilege

- Development boleh menggunakan `root` di Laragon.
- Production **tidak boleh** menjalankan aplikasi dengan `root`.
- User aplikasi hanya boleh mengakses database project.
- Backup script memerlukan `SELECT` + `LOCK TABLES` + `PROCESS` + `RELOAD` (untuk mysqldump) pada database yang dibackup.
