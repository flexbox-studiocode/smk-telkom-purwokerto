import { useLanguage } from '../../context/LanguageContext';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Send } from 'lucide-react';
import { PESAN_STELA_GAGAL, tanyaStela, cekSesiNexa, kategorikanGalat, KATEGORI_GALAT, formatStelaPublicText } from '../../services/stela';
import NexaPrechatForm from './NexaPrechatForm';
import { stelaData } from '../../data/dummyData';
import { canonicalAdmissionsPath, formatAdmissionsText, isHiddenAdmissionsPath, OFFICIAL_ADMISSIONS_URL } from '../../utils/admissions';

// STELA menyebut alamat halaman, dan menulis **tebal** serta `kode` karena
// model bahasa memang terbiasa memakai Markdown. Tanpa penanganan di sini,
// bintang dan backtick-nya muncul mentah di gelembung chat.
//
// Sengaja bukan pustaka Markdown: yang perlu ditangani cuma tiga bentuk, dan
// menambah dependensi untuk itu jauh lebih mahal daripada satu regex.
//
// Pola pemisah dan pola pencocok dipisah karena regex global menyimpan
// lastIndex, sehingga .test() yang dipanggil berulang pada regex yang sama
// akan meleset selang-seling.
const BAGIAN_PATH = '/(?:jurusan|prestasi|berita|pengumuman|bkk|tentang|galeri|ppdb|spmb|ketentuan-spmb|ketentuan-ppdb)(?:/[a-z0-9-]+)*';
// Urutan alternasi penting: **tebal** harus diuji sebelum *miring*, kalau
// tidak pola satu-bintang akan memakan bintang pertama dari pasangan ganda.
const PEMISAH = new RegExp(
  `(\\*\\*[^*\\n]+\\*\\*|\\*[^*\\n]+\\*|\`[^\`\\n]+\`|${BAGIAN_PATH})`,
  'g',
);
const COCOK_PATH = new RegExp(`^${BAGIAN_PATH}$`);

const TautanPath = ({ path }) => {
  const { t } = useLanguage();
  const admissions = isHiddenAdmissionsPath(path);
  return <Link to={admissions ? OFFICIAL_ADMISSIONS_URL : canonicalAdmissionsPath(path)} className="font-semibold text-primary underline">
    {admissions ? t('Masuk SPMB') : canonicalAdmissionsPath(path)}
  </Link>;
};

const IsiPesan = ({ teks }) =>
  formatAdmissionsText(formatStelaPublicText(teks)).split(PEMISAH).map((bagian, i) => {
    if (!bagian) return null;

    if (bagian.startsWith('**') && bagian.endsWith('**')) {
      return <strong key={i}>{bagian.slice(2, -2)}</strong>;
    }

    if (bagian.startsWith('*') && bagian.endsWith('*')) {
      return <em key={i}>{bagian.slice(1, -1)}</em>;
    }

    // Model sering membungkus path dengan backtick (`/jurusan`). Isinya
    // diperiksa dulu supaya tetap menjadi tautan, bukan sekadar teks kode.
    if (bagian.startsWith('`') && bagian.endsWith('`')) {
      const isi = bagian.slice(1, -1);
      return COCOK_PATH.test(isi) ? (
        <TautanPath key={i} path={isi} />
      ) : (
        <code key={i} className="rounded bg-dark-100 px-1 py-0.5 text-[0.9em]">
          {isi}
        </code>
      );
    }

    return COCOK_PATH.test(bagian) ? <TautanPath key={i} path={bagian} /> : bagian;
  });

const StelaChat = ({ className = '', tampilkanSaran = true, focusInput = false }) => {
  const { t, language } = useLanguage();
  const [riwayat, setRiwayat] = useState([{ role: 'assistant', content: stelaData.sapaan }]);
  const [masukan, setMasukan] = useState('');
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState(null);
  const [jenisGalat, setJenisGalat] = useState(KATEGORI_GALAT.UNKNOWN);
  const [pertanyaanGagal, setPertanyaanGagal] = useState('');
  const pesanRef = useRef(null);
  const inputRef = useRef(null);
  const controllerRef = useRef(null);
  const aktifRef = useRef(true);
  // 'memeriksa' -> 'perlu' (tampilkan form) -> 'siap' (chat). Server tetap menolak
  // /api/ai/stela tanpa sesi; status ini hanya menentukan apa yang ditampilkan.
  const [sesi, setSesi] = useState('memeriksa');
  const [sesiBerakhir, setSesiBerakhir] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    cekSesiNexa({ signal: controller.signal })
      .then((aktif) => setSesi(aktif ? 'siap' : 'perlu'))
      .catch((error) => { if (error?.name !== 'AbortError') setSesi('perlu'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (focusInput && sesi === 'siap') inputRef.current?.focus({ preventScroll: true });
  }, [focusInput, sesi]);

  // Penanda "komponen masih terpasang", dipakai agar setState tidak dipanggil
  // setelah unmount. Nilainya WAJIB dikembalikan ke true di badan efek: di
  // StrictMode React menjalankan mount -> cleanup -> mount, dan tanpa baris
  // pertama ini penanda tersangkut di false selamanya, sehingga setiap jawaban
  // dan setiap galat ditelan tanpa jejak.
  useEffect(() => {
    aktifRef.current = true;
    return () => {
      aktifRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const viewport = pesanRef.current;
    viewport?.scrollTo({ top: viewport.scrollHeight, behavior: 'instant' });
  }, [riwayat, memuat]);

  const kirim = async (teks, ulang = false) => {
    const pertanyaan = teks.trim();
    if (!pertanyaan || memuat || sesi !== 'siap') return;
    if (ulang && pertanyaan !== pertanyaanGagal) return;

    // Sapaan pembuka tidak ikut dikirim ke API (Claude/Gemini/OpenAI menolak riwayat yang diawali assistant tanpa user)
    let basis = riwayat.slice(1);

    // Jika pertanyaan sebelumnya gagal dan pengguna mengetik pertanyaan BARU (bukan retry),
    // hapus pertanyaan gagal yang menggantung dari basis dan riwayat UI agar tidak terjadi penumpukan giliran user.
    if (!ulang && pertanyaanGagal) {
      const pesanTerakhir = basis[basis.length - 1];
      // Hapus failed question dari basis jika masih ada (regardless of content match)
      if (pesanTerakhir?.role === 'user') {
        basis = basis.slice(0, -1);
        setRiwayat((lama) => {
          // Remove last user message if it was the failed one
          const lastMsg = lama[lama.length - 1];
          if (lastMsg?.role === 'user') {
            return [...lama.slice(0, -1), { role: 'user', content: pertanyaan }];
          }
          return [...lama, { role: 'user', content: pertanyaan }];
        });
      } else {
        setRiwayat((lama) => [...lama, { role: 'user', content: pertanyaan }]);
      }
    } else if (!ulang) {
      setRiwayat((lama) => [...lama, { role: 'user', content: pertanyaan }]);
    }

    const percakapan = ulang
      ? basis
      : [...basis, { role: 'user', content: pertanyaan }];

    setMasukan('');
    setGalat(null);
    setJenisGalat(KATEGORI_GALAT.UNKNOWN);
    setMemuat(true);
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const jawaban = await tanyaStela(percakapan, { signal: controller.signal, language });
      if (!aktifRef.current) return;
      setRiwayat((lama) => [...lama, { role: 'assistant', content: jawaban, language }]);
      setPertanyaanGagal('');
    } catch (error) {
      if (!aktifRef.current || error?.name === 'AbortError') return;
      if (error?.category === KATEGORI_GALAT.SESSION) {
        // Sesi habis di tengah percakapan: riwayat dipertahankan, form tampil lagi.
        setPertanyaanGagal(pertanyaan);
        setSesiBerakhir(true);
        setSesi('perlu');
        return;
      }
      const pesanGalat = error?.message || PESAN_STELA_GAGAL;
      setGalat(pesanGalat);
      // Use error category if already set (e.g., from scope rejection)
      setJenisGalat(error?.category || kategorikanGalat(pesanGalat));
      setPertanyaanGagal(pertanyaan);
    } finally {
      if (aktifRef.current) setMemuat(false);
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  const belumBertanya = riwayat.length === 1;

  if (sesi !== 'siap') {
    return (
      <div className={`flex min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-dark-100 bg-white ${className}`}>
        {sesi === 'memeriksa' ? (
          <div role="status" className="flex min-h-0 flex-1 items-center justify-center px-4 py-8 text-xs text-dark-600">{t('Memeriksa sesi...')}</div>
        ) : (
          <>
            {sesiBerakhir && <p role="status" className="shrink-0 bg-primary-50 px-4 py-2.5 text-[11px] leading-relaxed text-primary-900">{t('Sesi chat berakhir. Isi kembali informasi Anda untuk melanjutkan.')}</p>}
            <NexaPrechatForm onSelesai={() => { setSesiBerakhir(false); setSesi('siap'); }} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-dark-100 bg-white ${className}`}>
      <div ref={pesanRef} data-lenis-prevent className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite" aria-atomic="false">
        {riwayat.map((pesan, i) => (
          <div
            key={i}
            className={`flex min-w-0 ${pesan.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Allow flex shrinking and wrap URLs/code without spaces, preserving paragraphs. */}
            <p
              className={`min-w-0 max-w-[85%] whitespace-pre-line [overflow-wrap:anywhere] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                pesan.role === 'user'
                  ? 'rounded-br-sm bg-primary text-white'
                  : 'rounded-bl-sm bg-dark-50 text-dark-700'
              }`}
            >
              {pesan.role === 'assistant' ? <IsiPesan teks={i === 0 ? t(formatStelaPublicText(pesan.content)) : pesan.language === language ? t(formatStelaPublicText(pesan.content)) : t('Tanyakan kembali untuk mendapatkan jawaban dalam bahasa yang dipilih.')} /> : pesan.content}
            </p>
          </div>
        ))}

        {memuat && (
          <div className="flex justify-start">
            <p className="rounded-2xl rounded-bl-sm bg-dark-50 px-4 py-3">
              <span className="sr-only">{t("NEXA sedang mengetik")}</span>
              <span className="flex gap-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-dark-400" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-dark-400 delay-100" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-dark-400 delay-200" />
              </span>
            </p>
          </div>
        )}

        {galat && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3 text-[11px] leading-relaxed text-primary-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />

            <div className="min-w-0 flex-1">
              <p className="[overflow-wrap:anywhere] font-medium">{formatStelaPublicText(t(formatStelaPublicText(galat)))}</p>
            </div>

            {/* Tombol 'Coba lagi' hanya muncul untuk error transient/koneksi, bukan untuk ditolak/scope */}
            {(jenisGalat === KATEGORI_GALAT.TRANSIENT || jenisGalat === KATEGORI_GALAT.UNKNOWN || jenisGalat === KATEGORI_GALAT.RATE_LIMIT) && (
              <button
                type="button"
                onClick={() => kirim(pertanyaanGagal, true)}
                disabled={memuat || !pertanyaanGagal}
                className="flex-shrink-0 font-semibold text-primary underline disabled:opacity-50"
              >
                {t("Coba lagi")}
              </button>
            )}
          </div>
        )}

        {tampilkanSaran && belumBertanya && !memuat && (
          <div className="flex flex-wrap gap-2 pt-1">
            {stelaData.saran.map((saran) => (
              <button
                key={saran}
                type="button"
                onClick={() => kirim(t(saran))}
                className="min-w-0 max-w-full [overflow-wrap:anywhere] rounded-full border border-dark-200 px-3 py-1.5 text-left text-[10px] font-medium text-dark-600 transition-colors hover:border-primary hover:text-primary"
              >
                {t(saran)}
              </button>
            ))}
          </div>
        )}

      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          kirim(masukan);
        }}
        className="flex min-w-0 shrink-0 items-end gap-2 border-t border-dark-100 bg-white px-3 py-3"
      >
        <label htmlFor="stela-masukan" className="sr-only">{t("Tulis pertanyaan untuk NEXA")} </label>
        <textarea
          ref={inputRef}
          id="stela-masukan"
          rows={1}
          wrap="soft"
          value={masukan}
          onChange={(e) => setMasukan(e.target.value)}
          onKeyDown={(e) => {
            // Enter mengirim, Shift+Enter membuat baris baru — kebiasaan umum
            // aplikasi chat.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              kirim(masukan);
            }
          }}
          maxLength={1000}
          placeholder={t(stelaData.placeholder)}
          className="max-h-28 min-h-[2.5rem] min-w-0 flex-1 resize-none [overflow-wrap:anywhere] rounded-xl border border-dark-200 px-3.5 py-2.5 text-xs text-dark-700 outline-none transition-colors placeholder:text-dark-400 focus:border-primary"
        />
        <button
          type="submit"
          disabled={memuat || !masukan.trim()}
          aria-label={t("Kirim pertanyaan")}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default StelaChat;
