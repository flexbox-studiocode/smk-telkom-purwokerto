import { api } from './apiClient';

const SESSION_KEY = 'smk-visitor-recorded';
const STATS_CACHE_KEY = 'smk-visitor-stats';
const STATS_CACHE_TTL = 60_000;

function getVisitorHash() {
  const nav = globalThis.navigator || {};
  const raw = [
    nav.userAgent || '',
    nav.language || '',
    screen?.width || 0,
    screen?.height || 0,
    screen?.colorDepth || 0,
    Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || '',
  ].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).padStart(8, '0');
}

function isRecordedToday() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return false;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    return stored === today;
  } catch {
    return false;
  }
}

function markRecorded() {
  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    sessionStorage.setItem(SESSION_KEY, today);
  } catch { /* noop */ }
}

export async function recordVisit() {
  if (isRecordedToday()) return { ok: false, reason: 'not-configured-or-recorded' };
  try {
    const hash = getVisitorHash();
    await api.post('/api/stats/visitors', { visitor_hash: hash });
    markRecorded();
    return { ok: true };
  } catch {
    console.warn('Visitor counter record request failed.');
    return { ok: false, reason: 'request-failed' };
  }
}

function getCachedStats() {
  try {
    const raw = sessionStorage.getItem(STATS_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < STATS_CACHE_TTL) return data;
  } catch { /* noop */ }
  return null;
}

function setCachedStats(data) {
  try {
    sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* noop */ }
}

export async function getVisitorStats() {
  const cached = getCachedStats();
  if (cached) return cached;
  try {
    const { data } = await api.get('/api/stats/visitors');
    const stats = { daily: Number(data.today), monthly: Number(data.month), yearly: Number(data.year) };
    setCachedStats(stats);
    return stats;
  } catch {
    console.warn('Visitor counter stats request failed. Pastikan backend /api/stats/visitors tersedia.');
    return null;
  }
}
