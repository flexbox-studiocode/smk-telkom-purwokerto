-- Perluas enum events.kategori.
-- Sumber Supabase menyimpan kategori kalender akademik sebagai teks bebas
-- (awal-pkl, cuti-bersama, hari-pertama-sekolah, dst). Agar 50 record events
-- bermigrasi tanpa kehilangan makna, nilai tersebut ditambahkan ke enum,
-- bukan dipaksa menjadi 'lainnya'.
ALTER TABLE `events` MODIFY `kategori` ENUM(
  'kegiatan','akademik','lomba','karier','lainnya',
  'awal-pkl','penilaian-siswa','libur-akhir-semester','cuti-bersama',
  'libur-tahun-pelajaran','hari-pertama-sekolah','upacara-nasional',
  'hut-smk','libur-ramadhan','perkiraan-kelulusan'
) NOT NULL DEFAULT 'kegiatan';