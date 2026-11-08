import { useLanguage } from '../../context/LanguageContext';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import FormInput from '../../components/dashboard/FormInput';
import PpdbAuthLayout from '../../components/ppdb/PpdbAuthLayout';
import { usePpdb } from '../../context/PpdbContext';
import { signOutPpdb, updatePpdbPassword } from '../../services/ppdbService';

const AturSandiPage = () => {
  const { t } = useLanguage();
  const { authLoading } = usePpdb();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const simpan = async (event) => {
    event.preventDefault();
    if (password.length < 8 || password !== confirmation) {
      setError('Kata sandi minimal 8 karakter dan konfirmasinya harus sama.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updatePpdbPassword(password, token);
      setSuccess(true);
      try {
        await signOutPpdb();
      } catch {
        setError('Kata sandi sudah berubah, tetapi sesi belum berakhir. Keluar dari akun secara manual.');
      }
    } catch {
      setError('Kata sandi gagal diperbarui. Minta tautan pemulihan baru dan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PpdbAuthLayout aksiLabel="Kembali ke Beranda">
      <div className="mx-auto max-w-md rounded-3xl border border-dark-100 bg-white p-8 shadow-card sm:p-10">
        <h1 className="font-heading text-2xl font-extrabold text-dark-900">{t("Atur Kata Sandi Baru")}</h1>
        {success ? (
          <div className="mt-6 space-y-2 text-sm"><p role="status" className="text-green-700">{t("Kata sandi diperbarui.")} <Link to="/spmb/masuk" className="font-bold underline">{t("Masuk kembali")}</Link> {t("dengan kata sandi baru.")}</p>{error && <p role="alert" className="text-primary">{t(error)}</p>}</div>
        ) : authLoading ? (
          <p className="mt-6 text-sm text-dark-500">{t("Memeriksa tautan pemulihan...")}</p>
        ) : !token ? (
          <p role="alert" className="mt-6 text-sm text-dark-600">{t("Tautan tidak valid atau sudah kedaluwarsa.")} <Link to="/lupa-sandi" className="font-bold text-primary underline">{t("Minta tautan baru")}</Link>.</p>
        ) : (
          <form onSubmit={simpan} className="mt-6 space-y-5">
            <FormInput label={t("Kata Sandi Baru")} type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
            <FormInput label={t("Konfirmasi Kata Sandi")} type="password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
            {error && <p role="alert" className="text-xs text-primary">{t(error)}</p>}
            <button type="submit" disabled={saving} className="w-full rounded-full bg-primary px-6 py-3.5 text-xs font-bold text-white disabled:opacity-60">{t(saving ? 'Menyimpan...' : 'Simpan Kata Sandi')}</button>
          </form>
        )}
      </div>
    </PpdbAuthLayout>
  );
};

export default AturSandiPage;
