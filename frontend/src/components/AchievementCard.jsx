import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import ContentImage from './ContentImage';

const AchievementCard = ({ title, category, image, imageAlt, slug, highlight = false, variant }) => {
  // variant="carousel": hanya merapikan ukuran teks/padding di mobile; tanpa variant tampilan tidak berubah.
  const carousel = variant === 'carousel';
  const { t } = useLanguage();
  return (
  <Link
    to={`/prestasi/${slug}`}
    aria-label={t('Lihat detail prestasi: {title}', { title: t(title) })}
    className={`group flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-white shadow-card transition-colors ${
      highlight ? 'border-primary' : 'border-dark-100 hover:border-primary'
    }`}
  >
    <article className="flex min-w-0 flex-1 flex-col">
      <div className="aspect-[16/9] shrink-0 overflow-hidden">
        <ContentImage
          src={image}
          alt={t(imageAlt || title)}
          loading="lazy"
          className="block h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <div className={`flex min-w-0 flex-1 flex-col px-4 py-2.5 ${carousel ? 'max-sm:gap-1.5 max-sm:py-3.5' : ''}`}>
        <h3 className={`min-h-[2lh] whitespace-pre-line font-heading text-sm font-bold leading-snug text-dark-900 [overflow-wrap:anywhere] ${carousel ? 'max-sm:min-h-0 max-sm:text-base' : ''}`}>
          {t(title)}
        </h3>
        <p className={`mt-auto pt-1 text-[10px] text-dark-500 [overflow-wrap:anywhere] ${carousel ? 'max-sm:mt-0 max-sm:text-xs' : ''}`}>{t(category)}</p>
      </div>
    </article>
  </Link>
  );
};

export default AchievementCard;
