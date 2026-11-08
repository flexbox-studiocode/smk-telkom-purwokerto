import { useEffect, useRef } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { useLenis } from 'lenis/react';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import circle from '../../assets/tentang/profile/certificate-circle.svg';
import school from '../../assets/tentang/profile/certificate-school.svg';
import identity from '../../assets/tentang/profile/certificate-id.svg';
import verticalDivider from '../../assets/tentang/profile/certificate-divider-vertical.svg';
import location from '../../assets/tentang/profile/certificate-location.svg';
import divider from '../../assets/tentang/profile/certificate-divider.svg';
import award from '../../assets/tentang/profile/certificate-award.svg';
import calendar from '../../assets/tentang/profile/certificate-calendar.svg';
import '../../styles/certificate.css';

export default function TentangCertificateModal({ certificate, onClose }) {
  const { t } = useLanguage();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const lenis = useLenis();
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lenis?.stop();
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      lenis?.start();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [lenis]);

  return (
    <motion.dialog
      ref={dialogRef}
      id="school-certificate"
      aria-modal="true"
      aria-labelledby="school-certificate-title"
      aria-describedby="school-certificate-validity"
      data-lenis-prevent
      data-closing={!isPresent}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: reducedMotion ? 0 : .18 }}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onKeyDown={event => {
        // This dialog has one control; keep Tab from moving into browser chrome.
        if (event.key === 'Tab') { event.preventDefault(); closeRef.current?.focus(); }
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
      className="certificate-modal"
    >
      <div className="certificate-controls">
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t('Tutup sertifikat')} className="certificate-close">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="certificate-content">
        <div className="certificate-info">
          <div className="certificate-heading">
            <span className="certificate-school-icon" aria-hidden="true"><img src={circle} alt="" /><img src={school} alt="" /></span>
            <span className="certificate-vertical-divider" aria-hidden="true"><img src={verticalDivider} alt="" /></span>
            <h2 id="school-certificate-title">{certificate.name}</h2>
          </div>
          <dl className="certificate-details">
            <div>
              <dt><img src={identity} alt="" aria-hidden="true" /><span className="sr-only">NPSN</span></dt>
              <dd className="certificate-number">{certificate.npsn}</dd>
            </div>
            <div>
              <dt><img src={location} alt="" aria-hidden="true" /><span className="sr-only">{t('Alamat')}</span></dt>
              <dd className="certificate-address">{certificate.address}</dd>
            </div>
          </dl>
          <img className="certificate-divider" src={divider} alt="" aria-hidden="true" />
          <div className="certificate-badge">
            <span className="certificate-award"><img src={award} alt="" aria-hidden="true" /></span>
            <p>{t('Terakreditasi A')}<span>{t('(Unggul)')}</span></p>
          </div>
          <p id="school-certificate-validity" className="certificate-validity">
            <span className="certificate-calendar"><img src={calendar} alt="" aria-hidden="true" /></span>
            <span>{t('Sertifikat ini berlaku sampai dengan tanggal ')}<time dateTime={certificate.expiresAt}>{t(certificate.expiryLabel)}</time></span>
          </p>
        </div>
        <figure className="certificate-preview">
          <img src={certificate.image} alt={t('Dokumen sertifikat akreditasi sekolah')} />
        </figure>
      </div>
    </motion.dialog>
  );
}
