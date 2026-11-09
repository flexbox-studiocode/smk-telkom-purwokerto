import { Link, NavLink } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  Info,
  LayoutDashboard,
  Megaphone,
  Newspaper,
  Trophy,
} from 'lucide-react';
import Logo from '../Logo';
import { adminMenu, adminSekolah } from '../../data/dummyData';
import { useAppConfig } from '../../context/AppConfigContext';

const SPMB_INTERNAL_MENU = new Set(['/dashboard/spmb', '/dashboard/informasi-spmb']);

// Nama ikon disimpan sebagai teks di dummyData lalu dipetakan di sini, mengikuti
// pola yang sudah dipakai HeroStatsBar.
const ikon = {
  dashboard: LayoutDashboard,
  ppdb: GraduationCap,
  informasiSpmb: Info,
  prestasi: Trophy,
  bkk: BriefcaseBusiness,
  berita: Newspaper,
  pengumuman: Megaphone,
  kalender: CalendarDays,
};

const DashboardSidebar = ({ onPilihMenu }) => {
  const { spmbInternalEnabled } = useAppConfig();
  const menu = spmbInternalEnabled ? adminMenu : adminMenu.filter(({ to }) => !SPMB_INTERNAL_MENU.has(to));
  return (
  <div className="flex h-full flex-col bg-white">
    <Link to="/" onClick={onPilihMenu} aria-label="Kembali ke beranda SMK Telkom Purwokerto" className="flex items-center gap-3 rounded-lg px-6 py-6 transition-colors hover:bg-dark-50">
      <Logo className="h-11 w-11" />
      <div>
        <p className="font-heading text-base font-extrabold leading-tight text-dark-900">SMK Telkom</p>
        <p className="text-xs text-dark-500">Purwokerto</p>
      </div>
    </Link>

    <p className="px-6 pb-3 text-[11.38px] font-extrabold leading-[normal] uppercase tracking-[0.12em] text-dark-400">
      Menu Utama
    </p>

    <nav className="flex-1 space-y-1.5 overflow-y-auto px-4" aria-label="Menu admin">
      {menu.map(({ label, to, icon, end }) => {
        const Ikon = ikon[icon];
        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onPilihMenu}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-full py-2.5 pl-2.5 pr-4 text-[14.22px] font-bold leading-[normal] tracking-[.03em] transition-colors ${
                isActive
                  ? 'bg-primary text-white shadow-card'
                  : 'text-dark-700 hover:bg-primary-50 hover:text-primary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-white text-primary' : 'bg-dark-500 text-white'
                  }`}
                >
                  {Ikon && <Ikon className="h-4 w-4" />}
                </span>
                {label}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>

    <div className="p-4">
      <div className="rounded-2xl border border-dark-100 bg-white px-5 py-4 shadow-card">
        <p className="font-heading text-[12.8px] font-extrabold leading-[normal] tracking-[.02em] text-dark-900">{adminSekolah.nama}</p>
        {adminSekolah.alamat.map((baris) => (
          <p key={baris} className="mt-1 text-[10.67px] font-semibold leading-[15.64px] tracking-[.03em] text-dark-500">
            {baris}
          </p>
        ))}
      </div>
    </div>
  </div>
  );
};

export default DashboardSidebar;
