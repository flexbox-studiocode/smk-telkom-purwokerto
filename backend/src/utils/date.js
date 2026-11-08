// Util tanggal untuk zona bisnis sekolah (Asia/Jakarta).
// MySQL menyimpan kolom DATE; agar tanggal bisnis tidak bergeser karena
// timezone server, semua perhitungan "hari ini" memakai zona Asia/Jakarta dan
// direpresentasikan sebagai tengah malam UTC (YYYY-MM-DDT00:00:00.000Z).

export const TIMEZONE = 'Asia/Jakarta';

export function jakartaDateString(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Tanggal tidak valid: ${value}`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(d)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Mengembalikan Date pada tengah malam UTC untuk tanggal bisnis Asia/Jakarta.
export function jakartaToday(now = new Date()) {
  return new Date(`${jakartaDateString(now)}T00:00:00.000Z`);
}
