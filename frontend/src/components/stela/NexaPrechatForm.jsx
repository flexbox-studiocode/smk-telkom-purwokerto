import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { mulaiSesiNexa } from '../../services/stela';
import { USIA_MAKS, USIA_MIN, telepon as bersihkanTelepon, usiaValid, validasiPrechat } from '../../utils/nexaPrechat';

const KOSONG = { nama: '', telepon: '', usia: '', kategori: '', organisasi: '' };
const gayaInput = (galat) => `w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-dark-700 outline-none transition-colors placeholder:text-dark-400 focus:border-primary ${galat ? 'border-red-500' : 'border-dark-200'}`;
const PESAN_TELEPON = 'Nomor HP tidak valid. Contoh: 081234567890 atau +6281234567890.';
const PESAN_USIA = 'Usia harus berupa bilangan bulat antara 5 dan 100.';

const Bidang = ({ id, label, wajib = true, galat, petunjuk, children }) => {
  const { t } = useLanguage();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-dark-700">
        {t(label)}
        {wajib ? <span className="ml-0.5 text-primary" aria-hidden="true">*</span> : <span className="ml-1 font-normal text-dark-500">({t('opsional')})</span>}
      </label>
      {children}
      {petunjuk && !galat && <p className="mt-1 text-[11px] text-dark-500">{t(petunjuk)}</p>}
      {galat && <p id={`${id}-galat`} className="mt-1 text-[11px] leading-snug text-red-700 [overflow-wrap:anywhere]">{t(galat)}</p>}
    </div>
  );
};

// Form identitas sebelum chat. State form hidup di komponen ini saja, sehingga
// pergantian bahasa tidak menghapus isian dan kegagalan jaringan tidak membuang data.
// Chat baru terbuka lewat onSelesai, yaitu setelah server benar-benar membuat sesi.
const NexaPrechatForm = ({ onSelesai }) => {
  const { t, language } = useLanguage();
  const uid = useId();
  const [nilai, setNilai] = useState(KOSONG);
  const [galat, setGalat] = useState({});
  const [galatUmum, setGalatUmum] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const id = (nama) => `${uid}-${nama}`;
  const kategoriTampil = usiaValid(nilai.usia);

  // Galat hanya dihitung ulang untuk bidang yang sedang bergalat: pengguna tidak
  // ditegur sebelum selesai mengetik, dan pesan hilang begitu isian benar.
  const ubah = (bidang) => (event) => {
    const baru = { ...nilai, [bidang]: event.target.value };
    setNilai(baru);
    setGalatUmum('');
    const semua = validasiPrechat(baru);
    setGalat((lama) => Object.fromEntries(Object.keys(lama).filter((kunci) => semua[kunci]).map((kunci) => [kunci, semua[kunci]])));
  };
  const periksa = (bidang) => () => {
    const pesan = validasiPrechat(nilai)[bidang];
    setGalat((lama) => {
      const berikut = { ...lama };
      if (pesan) berikut[bidang] = pesan; else delete berikut[bidang];
      return berikut;
    });
  };

  const kirim = async (event) => {
    event.preventDefault();
    if (mengirim) return;
    const hasil = validasiPrechat(nilai);
    setGalat(hasil);
    if (Object.keys(hasil).length) {
      const pertama = ['nama', 'telepon', 'usia', 'kategori'].find((k) => hasil[k]);
      document.getElementById(id(pertama))?.focus();
      return;
    }
    setGalatUmum('');
    setMengirim(true);
    try {
      await mulaiSesiNexa({ ...nilai, telepon: bersihkanTelepon(nilai.telepon) });
      onSelesai();
    } catch (error) {
      // Isian dibiarkan utuh agar pengguna cukup menekan tombol lagi.
      const bidangServer = new Set(Array.isArray(error?.details) ? error.details.map((d) => d.path) : []);
      if (error?.code === 'validation_error' && bidangServer.size) {
        const pesan = { nama: 'Nama tidak valid.', telepon: PESAN_TELEPON, usia: PESAN_USIA, kategori: 'Pilih salah satu kategori.', organisasi: 'Maksimal 100 karakter.' };
        setGalat(Object.fromEntries([...bidangServer].filter((k) => pesan[k]).map((k) => [k, pesan[k]])));
      } else if (error?.code === 'network_error') setGalatUmum('Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.');
      else if (error?.status === 429) setGalatUmum('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.');
      else setGalatUmum('Gagal memulai chat. Silakan coba lagi.');
    } finally {
      setMengirim(false);
    }
  };

  const labelOrganisasi = nilai.kategori === 'instansi' ? 'Nama Instansi' : 'Nama Sekolah';
  const aria = (bidang) => (galat[bidang] ? { 'aria-invalid': true, 'aria-describedby': `${id(bidang)}-galat` } : {});

  return (
    <form onSubmit={kirim} noValidate data-lenis-prevent className="min-h-0 min-w-0 flex-1 space-y-3.5 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4">
      <h2 className="font-heading text-sm font-bold text-dark-900">{t('Sebelum mulai, isi informasi berikut')}</h2>

      <Bidang id={id('nama')} label="Nama Lengkap" galat={galat.nama}>
        <input id={id('nama')} type="text" autoComplete="name" maxLength={100} value={nilai.nama} onChange={ubah('nama')} onBlur={periksa('nama')} className={gayaInput(galat.nama)} {...aria('nama')} />
      </Bidang>

      <Bidang id={id('telepon')} label="Nomor HP" galat={galat.telepon} petunjuk="Contoh: 081234567890">
        <input id={id('telepon')} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={nilai.telepon} onChange={ubah('telepon')} onBlur={periksa('telepon')} className={gayaInput(galat.telepon)} {...aria('telepon')} />
      </Bidang>

      <Bidang id={id('usia')} label="Usia" galat={galat.usia}>
        <input id={id('usia')} type="number" inputMode="numeric" min={USIA_MIN} max={USIA_MAKS} step={1} value={nilai.usia} onChange={ubah('usia')} onBlur={periksa('usia')} className={gayaInput(galat.usia)} {...aria('usia')} />
      </Bidang>

      {kategoriTampil && (
        <fieldset className="min-w-0" aria-describedby={galat.kategori ? id('kategori-galat') : undefined}>
          <legend className="mb-1.5 text-xs font-semibold text-dark-700">{t('Kategori')}<span className="ml-0.5 text-primary" aria-hidden="true">*</span></legend>
          <div className="grid grid-cols-2 gap-2">
            {// 'Sekolah' sudah dipakai kalender dengan arti "at School", jadi label ini tidak lewat kamus.
            [['sekolah', language === 'en' ? 'School' : 'Sekolah'], ['instansi', t('Instansi')]].map(([nilaiKategori, label], i) => (
              <label key={nilaiKategori} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium text-dark-700 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${galat.kategori ? 'border-red-500' : 'border-dark-200'}`}>
                <input id={i === 0 ? id('kategori') : undefined} type="radio" name={id('kategori')} value={nilaiKategori} checked={nilai.kategori === nilaiKategori} onChange={ubah('kategori')} className="h-4 w-4 accent-primary" />
                {label}
              </label>
            ))}
          </div>
          {galat.kategori && <p id={id('kategori-galat')} className="mt-1 text-[11px] text-red-700">{t(galat.kategori)}</p>}
        </fieldset>
      )}

      {kategoriTampil && nilai.kategori && (
        <Bidang id={id('organisasi')} label={labelOrganisasi} wajib={false} galat={galat.organisasi}>
          <input id={id('organisasi')} type="text" autoComplete="organization" maxLength={100} value={nilai.organisasi} onChange={ubah('organisasi')} className={gayaInput(galat.organisasi)} {...aria('organisasi')} />
        </Bidang>
      )}

      <p className="rounded-xl bg-dark-50 px-3.5 py-3 text-[11px] leading-relaxed text-dark-600">
        {t('Nama, nomor HP, dan usia hanya dipakai untuk mengenali kategori pengguna dan menyesuaikan jawaban NEXA. Data tidak dipakai untuk pemasaran, tidak dibagikan ke pihak lain, dan dihapus otomatis setelah sesi berakhir.')}{' '}
        <Link to="/kebijakan-privasi" className="font-semibold text-primary underline">{t('Kebijakan Privasi')}</Link>
      </p>

      {galatUmum && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-[11px] leading-relaxed text-primary-900">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1 font-medium [overflow-wrap:anywhere]">{t(galatUmum)}</p>
        </div>
      )}

      <button type="submit" disabled={mengirim} aria-busy={mengirim} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60">
        {mengirim && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {t(mengirim ? 'Memproses...' : 'Mulai Chat')}
      </button>
    </form>
  );
};

export default NexaPrechatForm;
