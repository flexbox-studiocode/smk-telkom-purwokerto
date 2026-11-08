import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  adminBerita,
  adminAkun,
  adminJurusan,
  adminLowongan,
  adminPendaftar,
  adminPengaturanUmum,
  adminPrestasi,
  adminProfilSekolah,
} from '../data/dummyData';

// Panel admin masih memakai data dummy, tetapi tombolnya harus benar-benar
// bekerja. Kalau setiap halaman menyimpan salinannya sendiri lewat useState,
// hasil edit hilang begitu pengguna berpindah halaman — form edit akan terasa
// rusak. Karena itu salinan yang bisa diubah disimpan sekali di sini.
//
// ponytail: perubahan hanya bertahan selama tab dibuka. Untuk penyimpanan
// sungguhan, ganti isi setiap fungsi di bawah dengan pemanggilan service
// backend MySQL melalui API. Tidak ada koneksi langsung dari frontend ke Supabase.
const AdminDataContext = createContext(null);

const berikutnya = (daftar) => Math.max(0, ...daftar.map((d) => d.id)) + 1;

export const AdminDataProvider = ({ children }) => {
  const [berita, setBerita] = useState(adminBerita);
  const [pendaftar, setPendaftar] = useState(adminPendaftar);
  const [jurusan, setJurusan] = useState(adminJurusan);
  const [prestasi, setPrestasi] = useState(adminPrestasi);
  const [lowongan, setLowongan] = useState(adminLowongan);
  const [profilSekolah, setProfilSekolah] = useState(adminProfilSekolah);
  const [akun, setAkun] = useState(adminAkun);
  const [pengaturanUmum, setPengaturanUmum] = useState(adminPengaturanUmum);

  const simpanBerita = useCallback((data) => {
    setBerita((lama) =>
      data.id
        ? lama.map((b) => (b.id === data.id ? { ...b, ...data } : b))
        : [{ ...data, id: berikutnya(lama) }, ...lama]
    );
  }, []);

  const hapusBerita = useCallback((id) => {
    setBerita((lama) => lama.filter((b) => b.id !== id));
  }, []);

  const ubahStatusPendaftar = useCallback((id, status) => {
    setPendaftar((lama) => lama.map((p) => (p.id === id ? { ...p, status } : p)));
  }, []);

  const tambahJurusan = useCallback((data) => {
    setJurusan((lama) => [...lama, { ...data, id: berikutnya(lama) }]);
  }, []);

  const ubahJurusan = useCallback((id, data) => {
    setJurusan((lama) => lama.map((j) => (j.id === id ? { ...j, ...data, id } : j)));
  }, []);

  const hapusJurusan = useCallback((id) => {
    setJurusan((lama) => lama.filter((j) => j.id !== id));
  }, []);

  const tambahPrestasi = useCallback((data) => {
    setPrestasi((lama) => [{ ...data, id: berikutnya(lama) }, ...lama]);
  }, []);

  const hapusPrestasi = useCallback((id) => {
    setPrestasi((lama) => lama.filter((p) => p.id !== id));
  }, []);

  const tambahLowongan = useCallback((data) => {
    setLowongan((lama) => [{ ...data, id: berikutnya(lama) }, ...lama]);
  }, []);

  const hapusLowongan = useCallback((id) => {
    setLowongan((lama) => lama.filter((l) => l.id !== id));
  }, []);

  const nilai = useMemo(
    () => ({
      berita,
      pendaftar,
      jurusan,
      prestasi,
      lowongan,
      profilSekolah,
      akun,
      setAkun,
      pengaturanUmum,
      setPengaturanUmum,
      simpanBerita,
      hapusBerita,
      ubahStatusPendaftar,
      tambahJurusan,
      ubahJurusan,
      hapusJurusan,
      tambahPrestasi,
      hapusPrestasi,
      tambahLowongan,
      hapusLowongan,
      setProfilSekolah,
    }),
    [
      berita,
      pendaftar,
      jurusan,
      prestasi,
      lowongan,
      profilSekolah,
      akun,
      setAkun,
      pengaturanUmum,
      setPengaturanUmum,
      simpanBerita,
      hapusBerita,
      ubahStatusPendaftar,
      tambahJurusan,
      ubahJurusan,
      hapusJurusan,
      tambahPrestasi,
      hapusPrestasi,
      tambahLowongan,
      hapusLowongan,
    ]
  );

  return <AdminDataContext.Provider value={nilai}>{children}</AdminDataContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAdminData = () => {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData harus dipakai di dalam AdminDataProvider.');
  return ctx;
};
