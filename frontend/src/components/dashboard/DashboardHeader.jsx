import { useState } from 'react';
import { Bell, LogOut, Menu, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { canLeaveSettings } from '../../hooks/useUnsavedSettings';
import { useAuth } from '../../context/AuthContext';
import { adminProfil } from '../../data/dummyData';
import telkomLogo from '../../assets/landing/logo-smk-telkom-purwokerto.png';

const DashboardHeader = ({ onBukaMenu }) => {
  const [cari, setCari] = useState('');
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const keluar = async () => {
    if (!canLeaveSettings()) return;
    try {
      await signOut();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  // Pencarian global mengantar ke daftar berita dengan kata kuncinya terbawa di
  // URL, supaya kotak ini benar-benar melakukan sesuatu dan hasilnya bisa
  // dibagikan lewat tautan.
  const cariGlobal = (e) => {
    e.preventDefault();
    const kata = cari.trim();
    if (!kata || !canLeaveSettings()) return;
    navigate(`/dashboard/berita?cari=${encodeURIComponent(kata)}`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-dark-100 bg-white">
      <div className="flex items-center gap-3 px-4 py-4 sm:gap-5 sm:px-6">
        <button
          type="button"
          onClick={onBukaMenu}
          aria-label="Buka menu"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-dark-600 transition-colors hover:bg-dark-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <form onSubmit={cariGlobal} className="relative min-w-0 flex-1" role="search">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
          <label htmlFor="cari-admin" className="sr-only">
            {adminProfil.placeholderCari}
          </label>
          <input
            id="cari-admin"
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder={adminProfil.placeholderCari}
            className="w-full rounded-2xl border border-dark-200 py-3 pl-11 pr-4 text-xs font-light leading-[normal] tracking-[.03em] text-dark-800 outline-none transition-colors placeholder:text-dark-400 focus:border-primary"
          />
        </form>

        <button
          type="button"
          aria-label="Notifikasi"
          className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-dark-600 transition-colors hover:bg-dark-100"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex flex-shrink-0 items-center gap-3">
          <img src={telkomLogo} alt="Logo SMK Telkom Purwokerto" width="40" height="40" className="h-10 w-10 rounded-full bg-dark-200 p-1.5 object-contain" />
          <div className="hidden sm:block">
            <p className="font-heading text-[14.22px] font-bold leading-[normal] tracking-[.03em] text-dark-900">
              {typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : user?.email || adminProfil.nama}
            </p>
            <p className="text-[11.38px] font-medium leading-[normal] tracking-[.03em] text-dark-500">{adminProfil.peran}</p>
          </div>
        </div>

        {/* Tidak ada di desain, tapi panel admin tanpa jalan keluar akan
            mengunci pengguna di dalam sesi. */}
        <button
          type="button"
          onClick={keluar}
          aria-label="Keluar dari akun"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-dark-500 transition-colors hover:bg-primary-50 hover:text-primary"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
