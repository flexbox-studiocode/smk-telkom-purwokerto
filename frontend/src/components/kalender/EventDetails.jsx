import RichContent from '../RichContent';
import ContentImage from '../ContentImage';
import { useLanguage } from '../../context/LanguageContext';
import { eventTimeLabel } from '../../utils/events';
import EventCategoryLabel from './EventCategoryLabel';
import { dateFromKey } from '../../utils/calendar';

export default function EventDetails({ event, showStatus = false }) {
  const { t, locale } = useLanguage();
  const date = key => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(dateFromKey(key));
  const safeLink = value => /^https?:\/\/\S+$/i.test(value || '');
  return <div className="space-y-4 text-sm text-dark-600">
    {safeLink(event.image) && <ContentImage variant="agenda" src={event.image} alt={event.title} className="max-h-72 min-h-40 w-full rounded-xl object-contain" />}
    {showStatus && <span className="inline-flex rounded-full bg-dark-100 px-3 py-1 text-xs font-semibold">{event.status === 'published' ? 'Published' : 'Draft'}</span>}
    {event.summary && <p className="rounded-lg bg-dark-50 p-3 leading-relaxed">{event.summary}</p>}
    <dl className="grid gap-3 sm:grid-cols-2">
      {[[t('Tanggal kegiatan'), `${date(event.date)}${event.endDate !== event.date ? ` – ${date(event.endDate)}` : ''}`], [t('Waktu'), t(eventTimeLabel(event))], [t('Lokasi'), event.location || t('Belum ditentukan')], [t('Kategori'), <EventCategoryLabel key="category" category={event.category} badge />], [t('Penyelenggara'), event.organizer || t('Belum ditentukan')]].map(([label, value]) => <div key={label}><dt className="font-semibold text-dark-900">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}
    </dl>
    {event.description && <RichContent className="break-words leading-relaxed" value={event.description} />}
    {safeLink(event.link) && <a href={event.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">{t('Informasi / Pendaftaran')}</a>}
  </div>;
}
