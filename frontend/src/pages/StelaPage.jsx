import { useLanguage } from '../context/LanguageContext';
import MainLayout from '../layouts/MainLayout';
import StelaChat from '../components/stela/StelaChat';
import { stelaData } from '../data/dummyData';

const maskot = '/assets/branding/nexa-mark.png';

// Halaman penuh untuk NEXA. Tombol "Tanya NEXA Sekarang" di beranda sudah
// mengarah ke /stela sejak awal — sebelumnya mendarat di Segera Hadir.
const StelaPage = () => {
  const { t } = useLanguage();
  return (
  <MainLayout>
    <section className="bg-white py-8 lg:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <img src={maskot} alt="" aria-hidden="true" className="h-16 w-16 shrink-0 rounded-2xl bg-primary object-contain p-3" />
          <div>
            {/* NEXA dan NextTel dipanggil dari kartu yang sama di beranda, tapi
                halaman ini dulu tampil tanpa label dan dengan judul lebih kecil
                dari halaman mana pun -- terbaca setengah jadi di sebelah NextTel.
                Label dan ukuran judulnya kini mengikuti halaman lain. */}
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">NEXA AI</p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold leading-tight text-dark-900 sm:text-4xl">
              {t(stelaData.title).replace('\n', ' ')}
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-dark-500 sm:text-sm">
              {t(stelaData.description)}
            </p>
          </div>
        </div>

        <StelaChat className="mt-7 h-[32rem] shadow-card" kelasPraChat="mt-7 max-h-[min(44rem,calc(100dvh-6rem))] shadow-card" />

        <p className="mt-4 text-[11px] leading-relaxed text-dark-400">{t("NEXA menjawab berdasarkan informasi yang ada di situs ini. Untuk hal yang memerlukan kepastian — biaya, kuota, atau berkas pendaftaran — mohon konfirmasi ke Tata Usaha sekolah.")} </p>
      </div>
    </section>
  </MainLayout>
);
};

export default StelaPage;
