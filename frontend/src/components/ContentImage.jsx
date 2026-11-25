import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

// `placeholder` (opsional): isi kustom untuk kotak 'foto belum tersedia'; tanpa itu tampilan lama dipakai.
const ImageContent = ({ src, alt, className = '', placeholder, ...props }) => {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    if (placeholder) {
      return (
        <div role="img" aria-label={t('Foto belum tersedia')} className={`${className} flex flex-col items-center justify-center gap-2 bg-primary-50/50 px-3 text-center`}>
          {placeholder}
        </div>
      );
    }
    return (
      <div role="img" aria-label={t('Foto belum tersedia')} className={`${className} flex items-center justify-center bg-dark-50 px-3 text-center text-xs text-dark-500`}>
        {t('Foto belum tersedia')}
      </div>
    );
  }

  return <img {...props} src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
};

const ContentImage = (props) => <ImageContent key={props.src || ''} {...props} />;

export default ContentImage;
