import { useState } from 'react';
import { Building2, CalendarDays, Image as ImageIcon, Megaphone, Newspaper, Trophy, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Satu komponen untuk semua gambar konten. Gambar asli selalu diutamakan; placeholder
// bermerek hanya muncul bila src kosong/tidak valid atau gambar gagal dimuat. Ukuran,
// rasio, dan radius ikut `className` pemanggil, jadi pertukaran gambar <-> placeholder
// tidak menggeser layout.
//
// `variant` memilih ikon + label: berita | pengumuman | prestasi | agenda | fasilitas |
// orang (avatar, hanya ikon) | umum (default).
const VARIANTS = {
  berita: { Icon: Newspaper, label: 'Berita' },
  pengumuman: { Icon: Megaphone, label: 'Pengumuman' },
  prestasi: { Icon: Trophy, label: 'Prestasi' },
  agenda: { Icon: CalendarDays, label: 'Kegiatan' },
  fasilitas: { Icon: Building2, label: 'Fasilitas' },
  orang: { Icon: User, label: '' },
  umum: { Icon: ImageIcon, label: '' },
};

// Menolak nilai yang jelas bukan URL gambar (kosong, "null", skema berbahaya); sisanya
// diserahkan ke onError agar URL putus tetap jatuh ke placeholder.
const isUsableSrc = (src) => {
  if (typeof src !== 'string') return false;
  const value = src.trim();
  return Boolean(value) && !/^(null|undefined|about:blank)$/i.test(value) && !/^javascript:/i.test(value);
};

const Placeholder = ({ className, variant }) => {
  const { t } = useLanguage();
  const { Icon, label } = VARIANTS[variant] ?? VARIANTS.umum;
  const unavailable = t('Foto belum tersedia');
  return (
    <div
      role="img"
      aria-label={label ? `${t(label)} - ${unavailable}` : unavailable}
      className={`${className} @container relative isolate overflow-hidden bg-dark-50`}
    >
      {/* Aksen geometris sekolah (subtle): busur merah di pojok, kotak abu-abu miring, garis merah pendek.
          Diukur dengan cqw agar proporsional di semua rasio tanpa terpotong aneh. */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-[14cqw] -top-[22cqw] -z-10 size-[56cqw] rounded-full bg-primary/[0.06] ring-1 ring-primary/10 ring-offset-0" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-[12cqw] -left-[9cqw] -z-10 size-[28cqw] rotate-[18deg] rounded-[3cqw] border border-dark-300/60" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[max(2px,1.2cqw)] w-[22cqw] bg-primary/70" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3cqw] px-2 text-center">
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-dark-200"
        style={{ width: 'clamp(1.75rem, 12cqw, 3.25rem)', height: 'clamp(1.75rem, 12cqw, 3.25rem)' }}
      >
        <Icon className="h-[55%] w-[55%]" strokeWidth={1.75} aria-hidden="true" />
      </span>

      <span className="hidden flex-col gap-0.5 @[9rem]:flex">
        <span className="text-xs font-semibold text-dark-600">{label ? t(label) : unavailable}</span>
        {label && <span className="hidden text-[11px] text-dark-400 @[14rem]:block">{unavailable}</span>}
      </span>
      </div>
    </div>
  );
};

const ImageContent = ({ src, alt, className = '', variant = 'umum', ...props }) => {
  const [failed, setFailed] = useState(false);

  if (!isUsableSrc(src) || failed) return <Placeholder className={className} variant={variant} />;

  return <img {...props} src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
};

// `key` mengatur ulang status gagal setiap src berganti.
const ContentImage = (props) => <ImageContent key={props.src || ''} {...props} />;

export default ContentImage;
