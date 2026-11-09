export function toDateKey(value) {
  if (!value) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  const text = String(value);
  const key = /^\d{4}-\d{2}-\d{2}/.exec(text)?.[0] || '';
  if (!key) return '';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? key : '';
}

export function formatDateOnly(value, options = { dateStyle: 'medium' }) {
  const key = toDateKey(value);
  if (!key) return '-';
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}
