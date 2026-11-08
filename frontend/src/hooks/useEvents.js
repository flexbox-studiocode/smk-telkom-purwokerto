import { useCallback, useEffect, useRef, useState } from 'react';
import { eventError, getEvents } from '../services/eventService';

export default function useEvents(published = false, initialItems) {
  const [items, setItems] = useState(initialItems || []), [loading, setLoading] = useState(!initialItems), [error, setError] = useState('');
  const request = useRef(null);
  const refresh = useCallback(async (quiet = false) => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    if (!quiet) setLoading(true);
    try {
      const rows = await getEvents(published, controller.signal);
      if (!controller.signal.aborted) { setItems(rows); setError(''); }
    } catch (cause) {
      if (!controller.signal.aborted) { setItems([]); setError(published && ['PGRST205', '42P01'].includes(cause?.code) ? 'Jadwal kegiatan belum tersedia. Silakan coba lagi nanti.' : eventError(cause)); }
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, [published]);
  useEffect(() => {
    // Initial fetch synchronizes this view with the backend store.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const update = () => { if (document.visibilityState === 'visible') void refresh(true); };
    const storage = event => { if (event.key === 'school-events-changed') update(); };
    const timer = setInterval(update, 30000);
    window.addEventListener('focus', update); window.addEventListener('school-events-changed', update);
    document.addEventListener('visibilitychange', update); window.addEventListener('storage', storage);
    return () => {
      request.current?.abort(); clearInterval(timer);
      window.removeEventListener('focus', update); window.removeEventListener('school-events-changed', update);
      document.removeEventListener('visibilitychange', update); window.removeEventListener('storage', storage);
    };
  }, [refresh]);
  return { items, loading, error, refresh };
}
