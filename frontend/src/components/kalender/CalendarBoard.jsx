import { useRef, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, List, MapPin, Megaphone } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import Modal from '../dashboard/Modal';
import EventDetails from './EventDetails';
import EventCategoryLegend from './EventCategoryLegend';
import EventCategoryLabel, { EventCategoryDot } from './EventCategoryLabel';
import { getEventCategory, eventColor, eventsOnDate, eventTimeLabel, upcomingEvents } from '../../utils/events';
import { dateFromKey, eventsForMonth, monthCells, shiftDate } from '../../utils/calendar';
import { getSchoolDateKey } from '../../utils/publicContent';
import decorationLeft from '../../assets/kalender/decoration-left.png';
import decorationRight from '../../assets/kalender/decoration-right.png';

const eventColors = eventColor;

export default function CalendarBoard({ events = [] }) {
  const { t, locale } = useLanguage();
  const today = getSchoolDateKey(new Date());
  const [view, setView] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1, selected: null }));
  const [mode, setMode] = useState('calendar');
  const [detailId, setDetail] = useState(null);
  const detail = events.find(event => event.id === detailId) || null;
  const pickerRef = useRef(null);
  const month = `${String(view.year).padStart(4, '0')}-${String(view.month + 1).padStart(2, '0')}`;
  const formatDate = (key, options = { day: 'numeric', month: 'long', year: 'numeric' }) => new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(dateFromKey(key));
  const monthLabel = formatDate(`${month}-01`, { month: 'long', year: 'numeric' });
  const cells = monthCells(view.year, view.month);
  const monthEvents = eventsForMonth(events, view.year, view.month);
  const agenda = view.selected ? eventsOnDate(events, view.selected) : upcomingEvents(events).slice(0, 4);
  const focusKey = view.selected ?? (today.startsWith(month) ? today : `${month}-01`);

  const chooseDate = key => {
    const date = dateFromKey(key), year = date.getUTCFullYear();
    if (year >= 100 && year <= 9999) setView({ year, month: date.getUTCMonth(), selected: key });
  };
  const changeMonth = offset => {
    const date = new Date(Date.UTC(view.year, view.month + offset, 1));
    if (date.getUTCFullYear() < 100 || date.getUTCFullYear() > 9999) return;
    setView({ year: date.getUTCFullYear(), month: date.getUTCMonth(), selected: null });
  };
  const chooseMonth = value => {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    const [year, number] = value.split('-').map(Number);
    if (year >= 100 && year <= 9999 && number >= 1 && number <= 12) setView({ year, month: number - 1, selected: null });
  };
  const allEvents = () => { setMode('list'); setView(current => ({ ...current, selected: null })); };
  const onDateKey = (event, key) => {
    const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -(dateFromKey(key).getUTCDay() + 6) % 7, End: 6 - (dateFromKey(key).getUTCDay() + 6) % 7 };
    if (!Object.hasOwn(offsets, event.key)) return;
    const next = shiftDate(key, offsets[event.key]);
    const year = dateFromKey(next).getUTCFullYear();
    if (year < 100 || year > 9999) return;
    event.preventDefault(); chooseDate(next);
    requestAnimationFrame(() => document.querySelector(`[data-calendar-date="${next}"]`)?.focus());
  };

  const eventCard = event => (
    <button type="button" key={event.id} data-calendar-event={event.id} onClick={() => setDetail(event.id)} className="flex w-full items-start gap-3 rounded-xl p-2 text-left transition-colors hover:bg-dark-50 focus-visible:outline-2 focus-visible:outline-primary">
      <span className={`flex size-10 shrink-0 flex-col items-center justify-center rounded-lg font-sans text-xs font-normal leading-[normal] tracking-[.12em] ${eventColors(event)}`}><span>{event.date.slice(-2)}</span><span className="text-[9px] font-medium leading-[normal] tracking-[.12em]">{formatDate(event.date, { month: 'short' })}</span></span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold leading-[normal] tracking-[.12em] text-dark-900">{t(event.title)}</span>
        <span className="mt-1 block"><EventCategoryLabel category={event.category} /></span>
        <span className="mt-1 flex items-center gap-1 text-[10px] font-bold leading-[normal] tracking-[.12em] text-dark-500"><Clock className="size-3 shrink-0" />{t(eventTimeLabel(event))}</span>
        <span className="mt-1 flex items-start gap-1 text-[10px] font-bold leading-[normal] tracking-[.12em] text-dark-500"><MapPin className="size-3 shrink-0" />{event.location || t('Belum ditentukan')}</span>
      </span>
      <ChevronRight className="mt-2 size-4 shrink-0 text-dark-400" />
    </button>
  );

  return (
    <section id="kalender" aria-labelledby="calendar-title" className="relative overflow-hidden bg-white py-10 lg:py-14">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
        <img src={decorationRight} alt="" width="386" height="452" className="absolute right-0 top-2 w-[21%] max-w-72" />
        <img src={decorationLeft} alt="" width="178" height="452" className="absolute bottom-8 left-0 w-[10%] max-w-32" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 text-center">
          <h2 id="calendar-title" className="font-[family-name:var(--font-poppins)] text-2xl font-bold leading-[normal] tracking-[.05em] text-dark-900 sm:text-[38.12px]"><span className="text-primary">Calendar</span> of Events</h2>
          <p className="mt-1 text-sm font-bold leading-[normal] text-primary sm:text-[22.18px]">SMK Telkom Purwokerto</p>
        </div>
        <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <div className="min-w-0 rounded-2xl border border-dark-300 bg-white p-3 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label={t('Tampilan agenda')} className="inline-flex rounded-lg border border-dark-300">
                {[['calendar', CalendarDays, 'Kalender'], ['list', List, 'Daftar']].map(([value, Icon, label]) => (
                  <button key={value} id={`calendar-tab-${value}`} role="tab" type="button"
                    tabIndex={mode === value ? 0 : -1} aria-selected={mode === value} aria-controls="calendar-panel"
                    onClick={() => setMode(value)} onKeyDown={event => {
                      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                      event.preventDefault();
                      const next = event.key === 'Home' ? 'calendar' : event.key === 'End' ? 'list' : mode === 'calendar' ? 'list' : 'calendar';
                      setMode(next); document.getElementById(`calendar-tab-${next}`)?.focus();
                    }}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-[13.86px] font-bold leading-[normal] tracking-[.12em] transition-colors focus-visible:outline-2 focus-visible:outline-primary ${mode === value ? 'bg-primary text-white' : 'text-dark-500 hover:bg-dark-50'}`}>
                    <Icon className="size-4" />{t(label)}
                  </button>
                ))}
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="flex items-center rounded-lg border border-dark-300">
                  <button type="button" onClick={() => changeMonth(-1)} aria-label={t('Bulan sebelumnya')} className="grid size-10 place-items-center rounded-lg text-dark-600 hover:bg-dark-50 focus-visible:outline-2 focus-visible:outline-primary"><ChevronLeft className="size-4" /></button>
                  <label className="relative flex min-h-10 cursor-pointer items-center gap-1 px-1 text-xs font-bold leading-[normal] tracking-[.12em] text-dark-900 focus-within:rounded focus-within:outline-2 focus-within:outline-primary">
                    <span aria-live="polite" data-calendar-month>{monthLabel}</span><ChevronDown className="size-3" />
                    <input ref={pickerRef} type="month" min="0100-01" max="9999-12" value={month} onChange={event => chooseMonth(event.target.value)} aria-label={t('Pilih bulan dan tahun')} className="absolute inset-0 w-full cursor-pointer opacity-0" />
                  </label>
                  <button type="button" onClick={() => changeMonth(1)} aria-label={t('Bulan berikutnya')} className="grid size-10 place-items-center rounded-lg text-dark-600 hover:bg-dark-50 focus-visible:outline-2 focus-visible:outline-primary"><ChevronRight className="size-4" /></button>
                </div>
                <button type="button" onClick={() => { try { pickerRef.current.showPicker(); } catch { pickerRef.current.focus(); } }} aria-label={t('Pilih bulan dan tahun')} className="hidden size-10 place-items-center rounded-lg border border-dark-300 text-dark-700 sm:grid"><CalendarDays className="size-5" /></button>
                <button type="button" onClick={() => chooseDate(today)} className="min-h-10 rounded-lg border border-dark-300 px-3 text-[13.86px] font-bold leading-[normal] tracking-[.12em] text-dark-900 hover:bg-dark-50 focus-visible:outline-2 focus-visible:outline-primary">{t('Hari ini')}</button>
              </div>
            </div>
            <div id="calendar-panel" role="tabpanel" aria-labelledby={`calendar-tab-${mode}`}>
              {mode === 'calendar' ? <div key={month} className="overflow-hidden rounded-xl border-4 border-dark-50 p-1 motion-safe:animate-masuk-halaman">
                <table className="h-96 w-full table-fixed border-collapse sm:h-[26rem]" aria-label={monthLabel}>
                  <thead><tr>{Array.from({ length: 7 }, (_, i) => <th key={i} scope="col" className="h-9 text-[10px] font-bold text-dark-700 sm:text-xs">{formatDate(shiftDate('2026-10-12', i), { weekday: 'short' })}</th>)}</tr></thead>
                  <tbody>{Array.from({ length: cells.length / 7 }, (_, row) => <tr key={row}>{cells.slice(row * 7, row * 7 + 7).map(cell => {
                    const dayEvents = eventsOnDate(events, cell.key);
                    return <td key={cell.key} className="border border-dark-100 p-0 align-top">
                      <button type="button" data-calendar-date={cell.key} tabIndex={cell.key === focusKey ? 0 : -1} aria-pressed={cell.key === view.selected} aria-current={cell.key === today ? 'date' : undefined} aria-label={`${formatDate(cell.key, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${t('{count} kegiatan', { count: dayEvents.length })}`} aria-description={dayEvents.map(event => `${t(event.title)}: ${t(getEventCategory(event.category).label)}`).join('; ') || undefined} onClick={() => chooseDate(cell.key)} onKeyDown={event => onDateKey(event, cell.key)} className={`flex h-full min-h-14 w-full flex-col gap-1 p-1 text-left transition-colors duration-200 hover:bg-primary-50 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary sm:p-2 ${cell.key === view.selected ? 'bg-primary-50' : 'bg-white'} ${cell.inMonth ? 'text-dark-900' : 'text-dark-400'}`}>
                        <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-normal leading-[normal] tracking-[.12em] transition-colors sm:text-xs ${cell.key === view.selected ? 'bg-primary text-white' : cell.key === today ? 'bg-primary-100 text-primary' : ''}`}>{cell.day}</span>
                        {dayEvents.slice(0, 1).map(event => <span key={event.id} title={`${t(event.title)} · ${t(getEventCategory(event.category).label)}`} className={`block w-full min-w-0 rounded py-1 text-[9px] leading-[normal] tracking-[.12em] sm:px-1 sm:text-[10px] ${eventColors(event)}`}><span className="flex items-start gap-0.5 sm:gap-1"><EventCategoryDot category={event.category} /><span className="font-semibold sm:hidden">{dayEvents.length}</span><span className="hidden min-w-0 break-words font-semibold sm:line-clamp-2">{t(event.title)}</span></span><span className="mt-1 hidden text-[8px] font-semibold leading-[normal] tracking-[.12em] sm:block">{t(eventTimeLabel(event))}</span></span>)}
                        {dayEvents.length > 1 && <span className="hidden text-[9px] text-primary sm:block">+{dayEvents.length - 1}</span>}
                      </button>
                    </td>;
                  })}</tr>)}</tbody>
                </table>
              </div> : <div className="h-96 overflow-y-auto rounded-xl border border-dark-100 p-3 sm:h-[26rem]">
                {monthEvents.length ? <ul className="divide-y divide-dark-100">{monthEvents.map(event => <li key={event.id}>{eventCard(event)}</li>)}</ul> : <p role="status" className="grid h-full place-items-center text-center text-sm text-dark-500">{t('Belum ada kegiatan pada bulan ini.')}</p>}
              </div>}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-50 p-3">
              <div className="flex min-w-0 flex-1 items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-primary"><Megaphone className="size-4" /></span><div><h3 className="text-xs font-bold leading-[normal] tracking-[.12em] text-dark-600">{t('Jangan lewatkan setiap kesempatan!')}</h3><p className="mt-1 text-[10px] font-bold leading-[normal] tracking-[.12em] text-dark-500">{t('Ikuti berbagai kegiatan menarik yang bisa menambah pengalaman dan prestasimu di SMK Telkom Purwokerto.')}</p></div></div>
              <button type="button" onClick={allEvents} className="min-h-9 text-[10px] font-bold leading-[normal] tracking-[.12em] text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">{t('Lihat Semua Agenda')}</button>
            </div>
            <EventCategoryLegend />
          </div>
          <aside className="flex min-w-0 flex-col gap-3" aria-label={t('Agenda Terdekat')}>
            <div className="flex-1 rounded-2xl border border-dark-300 bg-white p-3">
              <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-xs font-bold leading-[normal] tracking-[.12em] text-dark-900"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-white"><CalendarDays className="size-4" /></span>{view.selected ? t('Agenda pada {date}', { date: formatDate(view.selected, { day: 'numeric', month: 'short' }) }) : t('Agenda Terdekat')}</h3><button type="button" onClick={allEvents} className="min-h-9 shrink-0 text-[9px] font-bold leading-[normal] tracking-[.12em] text-primary hover:underline">{t('Lihat Semua')}<ArrowRight className="ml-1 inline size-3" /></button></div>
              {agenda.length ? <ul className="mt-4 space-y-3">{agenda.map(event => <li key={event.id}>{eventCard(event)}</li>)}</ul> : <p role="status" className="py-10 text-center text-xs leading-relaxed text-dark-500">{t(view.selected ? 'Belum ada kegiatan pada tanggal ini.' : 'Belum ada agenda mendatang.')}</p>}
            </div>
          </aside>
        </div>
      </div>
      <Modal terbuka={Boolean(detail)} onTutup={() => setDetail(null)} judul={detail ? t(detail.title) : t('Detail kegiatan')} labelTutup={t('Tutup')}>
        {detail && <div className="max-h-[65dvh] overflow-y-auto pr-1" data-lenis-prevent><EventDetails event={detail} /></div>}
      </Modal>
    </section>
  );
}
