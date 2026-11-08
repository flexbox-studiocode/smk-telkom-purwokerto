export const dateKey = date => date.toISOString().split('T')[0];
export const dateFromKey = key => new Date(`${key}T00:00:00Z`);

// API mengembalikan DateTime ISO ("2026-11-08T00:00:00.000Z"), sedangkan
// kalender membandingkan string "YYYY-MM-DD". Ambil bagian tanggalnya agar
// perbandingan dan pencocokan sel tidak meleset.
export const normalizeDateKey = (value) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : dateKey(value);
  const key = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : '';
};

export function shiftDate(key, days) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

export function monthCells(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    const date = new Date(Date.UTC(year, month, index - offset + 1));
    return { key: dateKey(date), day: date.getUTCDate(), inMonth: date.getUTCMonth() === month };
  });
}

export function eventsForMonth(events, year, month) {
  const prefix = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-`;
  const first = `${prefix}01`;
  const last = `${prefix}${String(new Date(Date.UTC(year, month + 1, 0)).getUTCDate()).padStart(2, '0')}`;
  return events.filter(event => event.date <= last && (event.endDate || event.date) >= first).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}
