import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Memakai elemen <dialog> bawaan browser, sama seperti GaleriFoto di sisi
// publik: tombol Esc, penguncian fokus, dan lapisan latar sudah ditangani
// browser, jadi tidak perlu ditulis ulang.
const Modal = ({ terbuka, onTutup, judul, deskripsi, children, footer, lebar = 'max-w-lg', labelTutup = 'Tutup', busy = false, contentClassName = '', headerClassName = '' }) => {
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const titleId = 'dashboard-modal-title';

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (terbuka && !dialog.open) {
      triggerRef.current = document.activeElement;
      dialog.showModal();
    }
    if (!terbuka && dialog.open) dialog.close();
  }, [terbuka]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={event => { if (busy) event.preventDefault(); }}
      onClose={() => {
        onTutup();
        if (triggerRef.current?.isConnected) triggerRef.current.focus();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onTutup();
      }}
      className="motion-dialog max-h-none max-w-none bg-transparent p-4 backdrop:bg-dark-950/60 open:fixed open:inset-0 open:m-auto open:flex open:h-full open:w-full open:items-center open:justify-center"
    >
      {terbuka && (
        <div className={`modal-scrollbar w-full min-w-0 ${lebar} max-h-[calc(100dvh-2rem)] overflow-x-hidden overflow-y-auto rounded-2xl bg-white p-4 shadow-card sm:p-6 ${contentClassName}`}>
          <div className={`flex min-w-0 items-start justify-between gap-4 ${headerClassName}`}>
            <div className="min-w-0">
              <h2 id={titleId} className="break-words font-heading text-base font-extrabold text-dark-900">{judul}</h2>
              {deskripsi && <p className="mt-1 text-xs leading-relaxed text-dark-500">{deskripsi}</p>}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onTutup}
              aria-label={labelTutup}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-dark-500 transition-colors hover:bg-dark-100 hover:text-dark-800 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {children && <div className="mt-5">{children}</div>}
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
};

export default Modal;
