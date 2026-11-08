import { useLanguage } from '../../context/LanguageContext';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2, Mail } from 'lucide-react';
import PpdbAuthLayout from '../../components/ppdb/PpdbAuthLayout';
import { usePpdb } from '../../context/PpdbContext';
import { ppdbVerifikasi } from '../../data/dummyData';
import { apiMe } from '../../services/apiAuthService';
import { resendPpdbVerification } from '../../services/ppdbService';

const COOLDOWN_SECONDS = 60;

const VerifyEmailPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { biodata, currentUser, authLoading, mulaiAkunBaru } = usePpdb();
  const [state, setState] = useState('checking');
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [sisa, setSisa] = useState(COOLDOWN_SECONDS);
  const [feedback, setFeedback] = useState('');
  const [resending, setResending] = useState(false);

  const email = useMemo(() => biodata.email || currentUser?.email || '', [biodata.email, currentUser?.email]);

  useEffect(() => {
    let mounted = true;
    const checkUser = (user) => {
      if (!mounted) return;
      if (!user) {
        setVerifiedUser(null);
        setState('unverified');
        return;
      }
      setVerifiedUser(user);
      setState(user.emailVerified ? 'verified' : 'unverified');
    };

    apiMe()
      .then(({ user }) => checkUser(user))
      .catch(() => mounted && setState('error'));

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (sisa <= 0) return undefined;
    const timer = window.setTimeout(() => setSisa((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [sisa]);

  const lanjut = async () => {
    const user = verifiedUser || currentUser;
    if (!user) {
      navigate('/spmb/masuk');
      return;
    }
    try {
      const { user: refreshedUser } = await apiMe();
      if (refreshedUser?.emailVerified) {
        setVerifiedUser(refreshedUser);
        setState('verified');
        navigate('/spmb/formulir');
        return;
      }
      setState('unverified');
      setFeedback('Email belum terverifikasi. Silakan klik tautan konfirmasi dari email Anda terlebih dahulu.');
    } catch {
      setFeedback('Status verifikasi tidak dapat diperiksa. Silakan coba lagi.');
    }
  };

  const kirimUlang = async () => {
    if (!email || sisa > 0 || resending) return;
    setResending(true);
    setFeedback('');
    try {
      await resendPpdbVerification();
      setFeedback('Email verifikasi berhasil dikirim ulang.');
      setSisa(COOLDOWN_SECONDS);
    } catch {
      setFeedback('Email verifikasi gagal dikirim ulang. Silakan coba lagi nanti.');
    } finally {
      setResending(false);
    }
  };

  const ubahEmail = () => {
    mulaiAkunBaru();
    navigate('/spmb/daftar');
  };

  if (authLoading || state === 'checking') {
    return <div className="flex min-h-screen items-center justify-center bg-dark-50 text-sm text-dark-500">{t("Memeriksa status verifikasi...")}</div>;
  }

  if (state === 'error') {
    return <div className="flex min-h-screen items-center justify-center bg-dark-50 px-4 text-center text-sm text-dark-500">{t("Status verifikasi tidak dapat diperiksa. Silakan coba lagi.")}</div>;
  }

  if (state === 'verified') {
    return (
      <PpdbAuthLayout aksiLabel="Kembali ke Beranda">
        <div className="mx-auto max-w-md rounded-3xl border border-green-200 bg-white p-8 text-center shadow-card sm:p-10">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
          <h1 className="mt-6 font-heading text-2xl font-extrabold text-dark-900">{t("Email berhasil diverifikasi")}</h1>
          <p className="mt-3 text-xs leading-relaxed text-dark-500">{t("Akunmu sudah aktif. Lanjutkan untuk melengkapi pendaftaran SPMB.")}</p>
          <button type="button" onClick={lanjut} className="mt-6 w-full rounded-full bg-primary px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-white shadow-card hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">{t("Lanjutkan Pendaftaran")}</button>
        </div>
      </PpdbAuthLayout>
    );
  }

  if (!email && !currentUser && !verifiedUser) return <Navigate to="/spmb/masuk" replace />;

  return (
    <PpdbAuthLayout aksiLabel="Butuh Bantuan?" aksiTo="/spmb/masuk" tinggiPita="h-52">
      <div className="mx-auto max-w-md rounded-3xl border border-dark-100 bg-white p-8 text-center shadow-card sm:p-10">
        <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50"><Mail className="h-7 w-7 text-primary" /><CheckCircle2 className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white text-green-600" fill="white" /></span>
        <p className="mt-6 text-[11px] font-bold text-primary">{t(ppdbVerifikasi.badge)}</p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-dark-900">{t("Cek Email Anda")}</h1>
        <p className="mt-3 text-xs leading-relaxed text-dark-500">{t("Kami telah mengirimkan tautan konfirmasi pendaftaran ke alamat email")}</p>
        <p className="mx-auto mt-3 w-fit max-w-full truncate rounded-lg bg-dark-50 px-4 py-2 font-heading text-xs font-bold text-dark-900">{email}</p>
        <a href={ppdbVerifikasi.ctaUrl} target="_blank" rel="noreferrer" className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-white shadow-card hover:-translate-y-0.5"><Mail className="h-4 w-4" />{t(ppdbVerifikasi.ctaLabel)}</a>
        <div className="mt-6 rounded-xl bg-dark-50 px-5 py-4 text-left"><p className="font-heading text-[11px] font-bold text-dark-900">{t(ppdbVerifikasi.catatanJudul)}</p><ul className="mt-2 space-y-1.5">{ppdbVerifikasi.catatan.map((catatan) => <li key={catatan} className="flex gap-2 text-[11px] leading-relaxed text-dark-500"><span aria-hidden="true">&bull;</span>{t(catatan)}</li>)}</ul></div>
        {feedback && <p role="status" className="mt-5 rounded-xl bg-primary-50 px-4 py-3 text-[11px] font-medium text-primary-800">{t(feedback)}</p>}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-dark-100 pt-5 text-[11px]"><span className="text-dark-500">{t("Salah email?")} <button type="button" onClick={ubahEmail} className="font-bold text-dark-900 underline hover:text-primary">{t("Ubah Email")}</button></span><button type="button" disabled={sisa > 0 || resending} onClick={kirimUlang} className="font-heading font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:text-dark-400 disabled:no-underline">{resending ? t('Mengirim...') : sisa > 0 ? t('Kirim Ulang ({seconds}s)', { seconds: sisa }) : t('Kirim Ulang')}</button></div>
        <button type="button" onClick={lanjut} className="mt-5 text-[11px] font-semibold text-dark-400 underline-offset-4 hover:text-primary hover:underline">{t("Saya sudah verifikasi, cek kembali")}</button>
      </div>
    </PpdbAuthLayout>
  );
};

export default VerifyEmailPage;
