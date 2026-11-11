import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Baby, BookOpen, Briefcase, Check, GraduationCap, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { mulaiSesiNexa } from '../../services/stela';
import { KATEGORI, USIA_MAKS, USIA_MIN, telepon as bersihkanTelepon, usiaValid, validasiPrechat } from '../../utils/nexaPrechat';

const KOSONG = { nama: '', telepon: '', usia: '', kategori: '', organisasi: '' };
const gayaInput = (galat) => `w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs text-dark-700 outline-none transition-[border-color,box-shadow] placeholder:text-dark-400 focus:border-primary focus:ring-2 focus:ring-primary/20 ${galat ? 'border-red-500' : 'border-dark-200'}`;
const PESAN_TELEPON = 'Nomor HP tidak valid. Contoh: 081234567890 atau +6281234567890.';
const PESAN_USIA = 'Usia harus berupa bilangan bulat antara 5 dan 100.';
const LANGKAH_TOTAL = 5; // nama, telepon, usia, kategori, persetujuan (organisasi opsional)

// Kelompok usia hanya informasi: kategori tetap dipilih pengguna sendiri.
const kelompokUsia = (usia) => {
  const n = Number(usia);
  if (n <= 12) return { label: 'Anak-anak · 5–12 tahun', Ikon: Baby };
  if (n <= 17) return { label: 'Remaja · 13–17 tahun', Ikon: BookOpen };
  if (n <= 24) return { label: 'Dewasa muda · 18–24 tahun', Ikon: GraduationCap };
  return { label: 'Dewasa · 25 tahun ke atas', Ikon: Briefcase };
};

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

// Bar hanya terisi oleh isian yang benar-benar valid; langkah 2 (konfirmasi) = penuh.
const Kemajuan = ({ langkah, persen }) => {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 text-[11px] font-semibold text-dark-500">
        {t(langkah === 1 ? 'Informasi Pengguna' : 'Konfirmasi dan Mulai Chat')}{' '}
        <b className="whitespace-nowrap text-primary">· {t(`Langkah ${langkah} dari 2`)}</b>
      </p>
      <div role="progressbar" aria-label={t(`Langkah ${langkah} dari 2`)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={persen} className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-dark-100">
        <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${persen}%` }} />
      </div>
    </div>
  );
};

// Form identitas sebelum chat. State form hidup di komponen ini saja, sehingga
// pergantian bahasa tidak menghapus isian dan kegagalan jaringan tidak membuang data.
// Sesi dibuat server saat submit; chat baru terbuka lewat onSelesai, yaitu saat
// pengguna menekan "Mulai Percakapan" di layar konfirmasi.
const NexaPrechatForm = ({ onSelesai }) => {
  const { t, language } = useLanguage();
  const uid = useId();
  const [nilai, setNilai] = useState(KOSONG);
  const [setuju, setSetuju] = useState(false);
  const [galat, setGalat] = useState({});
  const [galatUmum, setGalatUmum] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [terkonfirmasi, setTerkonfirmasi] = useState(false);
  const id = (nama) => `${uid}-${nama}`;
  const kategoriTampil = usiaValid(nilai.usia);

  const galatSemua = validasiPrechat(nilai);
  const selesai = [!galatSemua.nama, !galatSemua.telepon, kategoriTampil, KATEGORI.includes(nilai.kategori), setuju].filter(Boolean).length;
  const formValid = selesai === LANGKAH_TOTAL;

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
    if (mengirim || !setuju) return;
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
      setTerkonfirmasi(true);
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

  if (terkonfirmasi) {
    const namaDepan = nilai.nama.trim().split(/\s+/)[0];
    return (
      <div data-lenis-prevent className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <Kemajuan langkah={2} persen={100} />
        <div role="status" className="px-2 pb-4 pt-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary"><Check className="h-7 w-7" aria-hidden="true" /></div>
          <h2 className="font-heading text-lg font-bold text-dark-900 [overflow-wrap:anywhere]">{t('Siap ngobrol,')} {namaDepan}!</h2>
          <p className="mx-auto mb-5 mt-2 max-w-[18rem] text-xs leading-relaxed text-dark-600">{t('Informasi Anda sudah tercatat. NEXA siap membantu menjawab pertanyaan Anda.')}</p>
          <button type="button" autoFocus onClick={onSelesai} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-white transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] motion-reduce:transition-none">
            {t('Mulai Percakapan')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  const labelOrganisasi = nilai.kategori === 'instansi' ? 'Nama Instansi' : 'Nama Sekolah';
  const aria = (bidang) => (galat[bidang] ? { 'aria-invalid': true, 'aria-describedby': `${id(bidang)}-galat` } : {});
  const kelompok = kategoriTampil ? kelompokUsia(nilai.usia) : null;

  return (
    <form onSubmit={kirim} noValidate className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div data-lenis-prevent className="min-h-0 min-w-0 flex-1 space-y-3.5 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-3 pt-4">
        <Kemajuan langkah={1} persen={(selesai / LANGKAH_TOTAL) * 50} />

        <p className="max-w-[20rem] rounded-2xl rounded-tl-sm bg-dark-50 px-3.5 py-3 text-xs leading-relaxed text-dark-600">
          {t('Halo! Sebelum mulai, boleh kenalan sebentar? Isi informasi berikut agar NEXA bisa membantu dengan lebih tepat.')}
        </p>

        <Bidang id={id('nama')} label="Nama Lengkap" galat={galat.nama}>
          <input id={id('nama')} type="text" autoComplete="name" maxLength={100} placeholder={t('Contoh: Nadia Putri')} value={nilai.nama} onChange={ubah('nama')} onBlur={periksa('nama')} className={gayaInput(galat.nama)} {...aria('nama')} />
        </Bidang>

        <Bidang id={id('telepon')} label="Nomor HP" galat={galat.telepon} petunjuk="Contoh: 081234567890">
          <input id={id('telepon')} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="08xx xxxx xxxx" value={nilai.telepon} onChange={ubah('telepon')} onBlur={periksa('telepon')} className={gayaInput(galat.telepon)} {...aria('telepon')} />
        </Bidang>

        <Bidang id={id('usia')} label="Usia" galat={galat.usia}>
          <div className="flex items-stretch gap-2.5">
            <input id={id('usia')} type="number" inputMode="numeric" min={USIA_MIN} max={USIA_MAKS} step={1} placeholder="17" value={nilai.usia} onChange={ubah('usia')} onBlur={periksa('usia')} className={`${gayaInput(galat.usia)} !w-24 shrink-0`} {...aria('usia')} />
            {kelompok && (
              <p className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 px-2.5 text-[11px] font-semibold leading-tight text-primary">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white"><kelompok.Ikon className="h-3.5 w-3.5" aria-hidden="true" /></span>
                <span className="min-w-0 [overflow-wrap:anywhere]">{t(kelompok.label)}</span>
              </p>
            )}
          </div>
        </Bidang>

        {kategoriTampil && (
          <fieldset className="min-w-0 space-y-3 rounded-2xl border border-dark-100 bg-dark-50/60 p-3" aria-describedby={galat.kategori ? id('kategori-galat') : undefined}>
            <legend className="sr-only">{t('Kategori')}</legend>
            <p aria-hidden="true" className="text-xs font-semibold text-dark-700">{t('Kategori')}<span className="ml-0.5 text-primary">*</span></p>
            <div className="grid grid-cols-2 gap-2">
              {// 'Sekolah' sudah dipakai kalender dengan arti "at School", jadi label ini tidak lewat kamus.
              [['sekolah', language === 'en' ? 'School' : 'Sekolah'], ['instansi', t('Instansi')]].map(([nilaiKategori, label], i) => (
                <label key={nilaiKategori} className={`flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-xs font-medium text-dark-700 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${galat.kategori ? 'border-red-500' : 'border-dark-200'}`}>
                  <input id={i === 0 ? id('kategori') : undefined} type="radio" name={id('kategori')} value={nilaiKategori} checked={nilai.kategori === nilaiKategori} onChange={ubah('kategori')} className="h-4 w-4 accent-primary" />
                  {label}
                </label>
              ))}
            </div>
            {galat.kategori && <p id={id('kategori-galat')} className="text-[11px] text-red-700">{t(galat.kategori)}</p>}
            {nilai.kategori && (
              <Bidang id={id('organisasi')} label={labelOrganisasi} wajib={false} galat={galat.organisasi}>
                <input id={id('organisasi')} type="text" autoComplete="organization" maxLength={100} value={nilai.organisasi} onChange={ubah('organisasi')} className={gayaInput(galat.organisasi)} {...aria('organisasi')} />
              </Bidang>
            )}
          </fieldset>
        )}

        <label className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-relaxed text-dark-600">
          <input type="checkbox" checked={setuju} onChange={(event) => { setSetuju(event.target.checked); setGalatUmum(''); }} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
          <span className="min-w-0">
            {t('Saya setuju nama, nomor HP, dan usia saya dipakai untuk menyesuaikan jawaban NEXA. Data tidak dipakai untuk pemasaran, tidak dibagikan ke pihak lain, dan dihapus otomatis setelah sesi berakhir.')}{' '}
            <Link to="/kebijakan-privasi" className="font-semibold text-primary underline">{t('Kebijakan Privasi')}</Link>
          </span>
        </label>
      </div>

      <div className="shrink-0 space-y-2.5 border-t border-dark-100 bg-white px-4 py-3">
        {galatUmum && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-[11px] leading-relaxed text-primary-900">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
            <p className="min-w-0 flex-1 font-medium [overflow-wrap:anywhere]">{t(galatUmum)}</p>
          </div>
        )}
        <button type="submit" disabled={mengirim || !formValid} aria-busy={mengirim} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 disabled:active:scale-100 motion-reduce:transition-none">
          {mengirim ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {t(mengirim ? 'Memproses...' : 'Lanjut ke Chat')}
          {!mengirim && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
};

export default NexaPrechatForm;
