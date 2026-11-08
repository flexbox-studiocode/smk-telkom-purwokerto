import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/apiClient';

const TURNSTILE_ENABLED = import.meta.env.VITE_TURNSTILE_ENABLED === 'true';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';


export async function verifyTurnstileToken(token) {
  // Lewat apiClient agar header CSRF (x-csrf-token) ikut terkirim; endpoint
  // /api/turnstile/verify berada di belakang requireCsrf.
  const result = await api.post('/api/turnstile/verify', { token });
  if (!result?.success) throw new Error('Verifikasi keamanan gagal. Silakan coba lagi.');
}

export function useTurnstile() {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState((TURNSTILE_ENABLED && SITE_KEY) ? 'loading' : 'disabled');

  const reset = useCallback(() => {
    if (widgetIdRef.current != null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setToken('');
      setStatus('loading');
    }
  }, []);

  const renderWidget = useCallback(() => {
    if (!TURNSTILE_ENABLED || !SITE_KEY || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current != null) window.turnstile.remove(widgetIdRef.current);
    setToken('');
    setStatus('loading');
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme: 'light',
      callback: (nextToken) => { setToken(nextToken); setStatus('success'); },
      'error-callback': () => { setToken(''); setStatus('error'); },
      'expired-callback': () => { setToken(''); setStatus('expired'); },
    });
  }, []);

  useEffect(() => {
    if (!TURNSTILE_ENABLED || !SITE_KEY) return undefined;
    if (window.turnstile) {
      renderWidget();
      return undefined;
    }
    const existingScript = document.querySelector('script[data-turnstile-api]');
    if (existingScript) {
      existingScript.addEventListener('load', renderWidget, { once: true });
      return () => {
        if (widgetIdRef.current != null && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }
    const script = document.createElement('script');
    script.dataset.turnstileApi = 'true';
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = renderWidget;
    script.onerror = () => setStatus('error');
    document.head.appendChild(script);
    return () => {
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  return { containerRef, token, status, reset, enabled: Boolean(TURNSTILE_ENABLED && SITE_KEY) };
}
