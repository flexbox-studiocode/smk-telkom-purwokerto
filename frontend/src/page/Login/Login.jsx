import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';
import { useTurnstile, verifyTurnstileToken } from '../../components/TurnstileWidget';

const TURNSTILE_STATUS = { idle: 'idle', loading: 'loading', success: 'success', error: 'error', expired: 'expired' };

const Login = () => {
  const { signIn, loading, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { containerRef, token, status, reset, enabled } = useTurnstile();
  const turnstileEnabled = enabled;
  const turnstileToken = token;
  const turnstileStatus = status;
  const resetTurnstile = reset;

  useEffect(() => {
    if (!loading && user && isAdmin) navigate('/dashboard', { replace: true });
  }, [loading, user, isAdmin, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (turnstileEnabled && !turnstileToken) {
      setError('Selesaikan verifikasi keamanan terlebih dahulu.');
      return;
    }

    setSubmitting(true);

    try {
      if (turnstileEnabled) await verifyTurnstileToken(turnstileToken);
      await signIn(email.trim(), password);
      const destination = location.state?.from?.startsWith('/dashboard') ? location.state.from : '/dashboard';
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(loginError.message || 'Login gagal. Periksa email dan password Anda.');
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && !loading && (!turnstileEnabled || turnstileStatus === TURNSTILE_STATUS.success);

  return (
    <main className="public-site relative flex min-h-screen flex-col items-center justify-center bg-dark-50 px-3 py-6 sm:px-4 sm:py-8">
      <Link
        to="/"
        className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white sm:right-8 sm:top-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Beranda
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-dark-100 bg-white p-5 shadow-card sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Link to="/" aria-label="Kembali ke homepage" className="rounded-xl p-1 transition-transform hover:scale-105">
            <Logo className="h-16 w-16 sm:h-20 sm:w-20" />
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Area Terbatas</p>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-dark-900">Login Admin</h1>
          <p className="mt-2 text-sm text-dark-500">Masuk untuk mengelola konten sekolah.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5 sm:mt-8">
          <div>
            <label htmlFor="email" className="mb-2 block text-xs font-semibold text-dark-700">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-lg border border-dark-200 py-3 pl-10 pr-3 text-sm text-dark-900 outline-none transition-colors placeholder:text-dark-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="admin@sekolah.sch.id"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-xs font-semibold text-dark-700">Password</label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-dark-200 py-3 pl-10 pr-11 text-sm text-dark-900 outline-none transition-colors placeholder:text-dark-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Masukkan password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-2 top-1/2 flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg text-dark-400 hover:bg-primary-50 hover:text-primary"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {turnstileEnabled && (
            <div className="space-y-2">
              <div ref={containerRef} className="flex min-h-[65px] items-center justify-center" />
              {turnstileStatus === TURNSTILE_STATUS.loading && (
                <p className="flex items-center gap-1.5 text-xs text-dark-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Memuat verifikasi keamanan...
                </p>
              )}
              {turnstileStatus === TURNSTILE_STATUS.success && (
                <p className="flex items-center gap-1.5 text-xs text-green-600">
                  <ShieldCheck className="h-3 w-3" />
                  Verifikasi berhasil
                </p>
              )}
              {turnstileStatus === TURNSTILE_STATUS.error && (
                <div className="flex items-center gap-1.5 text-xs text-primary-700">
                  <AlertCircle className="h-3 w-3" />
                  <span>Verifikasi gagal.</span>
                  <button type="button" onClick={resetTurnstile} className="underline underline-offset-2 hover:text-primary">Coba lagi</button>
                </div>
              )}
              {turnstileStatus === TURNSTILE_STATUS.expired && (
                <div className="flex items-center gap-1.5 text-xs text-primary-700">
                  <AlertCircle className="h-3 w-3" />
                  <span>Verifikasi kedaluwarsa.</span>
                  <button type="button" onClick={resetTurnstile} className="underline underline-offset-2 hover:text-primary">Verifikasi ulang</button>
                </div>
              )}
            </div>
          )}

          {error && <p role="alert" className="rounded-lg bg-primary-50 px-3 py-2.5 text-xs font-medium text-primary-800">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-full bg-primary px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Memproses login...' : 'Login'}
          </button>
        </form>
      </div>

    </main>
  );
};

export default Login;
