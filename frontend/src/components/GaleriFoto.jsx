import { useLanguage } from '../context/LanguageContext';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Reveal from './Reveal';
import ContentImage from './ContentImage';

// Jeda bertingkat untuk kartu foto. Ditulis sebagai kelas utuh (bukan dirakit
// dari potongan string) supaya Tailwind ikut memindainya saat build.
const JEDA = ['', 'delay-100', 'delay-200', 'delay-300', 'delay-100', 'delay-200'];

// Galeri foto dengan penampil layar penuh. Memakai elemen <dialog> bawaan
// browser, bukan div buatan sendiri: tombol Esc, penguncian fokus, dan lapisan
// latar sudah ditangani browser, jadi tidak perlu menulis ulang semuanya.
const GaleriFoto = ({ items, title, description, variant = 'umum' }) => {
  const { t } = useLanguage();

  const [aktif, setAktif] = useState(null);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (aktif !== null && !dialog.open) {
      triggerRef.current = document.activeElement;
      dialog.showModal();
    }
    if (aktif === null && dialog.open) dialog.close();
  }, [aktif]);

  if (!items?.length) return null;

  const geser = (langkah) =>
    setAktif((kini) => (kini + langkah + items.length) % items.length);

  return (
    <section className="mt-10">
      <h2 className="font-heading text-lg font-extrabold text-dark-900 sm:text-xl">{t(title)}</h2>
      {description && <p className="mt-1.5 text-xs text-dark-500">{t(description)}</p>}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((foto, i) => (
          <Reveal key={foto.image + i} className={JEDA[i % JEDA.length]}>
            <button
              type="button"
              onClick={(event) => { triggerRef.current = event.currentTarget; setAktif(i); }}
              aria-label={t('Perbesar foto: {alt}', { alt: t(foto.alt) })}
              className="group block w-full overflow-hidden rounded-xl border border-dark-100 bg-dark-50"
            >
              <ContentImage
                variant={variant}
                src={foto.image}
                alt={t(foto.alt)}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
              />
            </button>
          </Reveal>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        aria-label={t('Galeri foto')}
        onClose={() => {
          setAktif(null);
          if (triggerRef.current?.isConnected) triggerRef.current.focus();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') geser(-1);
          if (event.key === 'ArrowRight') geser(1);
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) setAktif(null);
        }}
        className="max-h-none max-w-none bg-transparent p-4 backdrop:bg-dark-950/85 open:fixed open:inset-0 open:m-auto open:flex open:h-full open:w-full open:items-center open:justify-center"
      >
        {aktif !== null && (
          <figure className="relative w-full max-w-3xl">
            <img
              src={items[aktif].image}
              alt={t(items[aktif].alt)}
              className="max-h-[70vh] w-full rounded-xl object-contain"
            />
            <figcaption className="mt-3 text-center text-xs font-medium text-white">
              {t(items[aktif].alt)}
              <span className="ml-2 text-white/60">
                {aktif + 1}/{items.length}
              </span>
            </figcaption>

            <button
              type="button"
              onClick={() => setAktif(null)}
              aria-label={t("Tutup foto")}
              className="absolute -top-3 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-dark-900 transition-colors hover:bg-white"
            >
              <X className="h-5 w-5" />
            </button>

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => geser(-1)}
                  aria-label={t("Foto sebelumnya")}
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-dark-900 transition-colors hover:bg-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => geser(1)}
                  aria-label={t("Foto berikutnya")}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-dark-900 transition-colors hover:bg-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </figure>
        )}
      </dialog>
    </section>
  );
};

export default GaleriFoto;
