import { richTextToPlain } from '../../utils/richText';
import { useState } from 'react';
import { ArrowRight, CalendarDays, ImageOff } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { dateFromKey } from '../../utils/calendar';
import { selectSchoolAgenda } from '../../utils/events';
import Reveal from '../Reveal';
import Modal from '../dashboard/Modal';
import EventCategoryLabel from './EventCategoryLabel';
import EventDetails from './EventDetails';

function AgendaImage({ event }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  const hasImage = /^https?:\/\/\S+$/i.test(event.image || '') && !failed;
  return <span className="block rounded-t-2xl bg-primary/50 px-2.5 pt-2.5">
    <span data-agenda-image className="flex aspect-[477/346] items-center justify-center overflow-hidden rounded-t-xl bg-primary-50">
      {hasImage ? <img src={event.image} alt="" loading="lazy" width="477" height="346" onError={() => setFailed(true)} className="h-full w-full object-cover" /> :
        <span data-agenda-fallback className="flex flex-col items-center gap-3 px-4 text-center text-sm text-primary"><ImageOff className="size-10" aria-hidden="true" /><span>{t('Foto kegiatan belum tersedia')}</span></span>}
    </span>
  </span>;
}

export default function SchoolAgendaSection({ events = [] }) {
  const { t, locale } = useLanguage();
  const agenda = selectSchoolAgenda(events);
  const [detailId, setDetail] = useState(null);
  const detail = events.find(event => event.id === detailId && event.status === 'published') || null;
  const date = key => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(dateFromKey(key));
  return <section id="agenda-sekolah" aria-labelledby="school-agenda-title" className="bg-white py-10 lg:py-14">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Reveal className="mb-8 text-center"><h2 id="school-agenda-title" className="font-[family-name:var(--font-poppins)] text-2xl font-bold leading-[normal] tracking-[.05em] text-dark-900 sm:text-[38.12px]"><span className="text-primary">{t('Agenda')}</span> {t('Sekolah')}</h2></Reveal>
      {agenda.length ? <div className="grid auto-rows-fr items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {agenda.map((event, index) => <Reveal key={event.id} as="article" className={`min-w-0 ${['motion-safe:delay-0', 'motion-safe:delay-100', 'motion-safe:delay-200'][index]}`}>
          <button type="button" data-school-agenda-event={event.id} onClick={() => setDetail(event.id)} aria-label={t('Lihat detail {title}', { title: t(event.title) })} className="flex h-full w-full flex-col rounded-2xl text-left hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-safe:transition-[transform,box-shadow] motion-safe:duration-200 motion-safe:hover:-translate-y-1">
            <AgendaImage key={event.image || 'no-image'} event={event} />
            <span className="flex min-h-64 flex-1 flex-col rounded-b-2xl border border-t-0 border-dark-200 bg-white p-4 sm:p-5">
              <span className="line-clamp-2 min-h-14 break-words font-heading text-lg font-bold leading-7 text-dark-900">{t(event.title)}</span>
              <span className="mt-2 line-clamp-3 min-h-[4.5rem] break-words text-sm leading-6 text-dark-500">{t(richTextToPlain(event.summary || event.description) || 'Informasi kegiatan selengkapnya tersedia pada detail.')}</span>
              <span className="mt-4 flex items-start gap-2 text-xs text-dark-600"><CalendarDays aria-hidden="true" className="size-4 shrink-0" /><span>{date(event.date)}{event.endDate !== event.date ? ` – ${date(event.endDate)}` : ''}</span></span>
              <span className="mt-2"><EventCategoryLabel category={event.category} /></span>
              <span className="mt-auto flex items-center gap-1 pt-4 text-xs font-semibold text-primary">{t('Lihat Detail')}<ArrowRight aria-hidden="true" className="size-4" /></span>
            </span>
          </button>
        </Reveal>)}
      </div> : <p role="status" className="rounded-2xl border border-dark-200 bg-dark-50 px-6 py-10 text-center text-sm text-dark-500">{t('Belum ada agenda sekolah yang dipublikasikan.')}</p>}
    </div>
    <Modal terbuka={Boolean(detail)} onTutup={() => setDetail(null)} judul={detail ? t(detail.title) : t('Detail kegiatan')} labelTutup={t('Tutup')}>
      {detail && <div className="max-h-[65dvh] overflow-y-auto pr-1" data-lenis-prevent><EventDetails event={detail} /></div>}
    </Modal>
  </section>;
}
