import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';
import { adminSekolah } from '../../data/dummyData';

// Kerangka panel admin: sidebar tetap di layar lebar, laci geser di layar kecil.
const DashboardLayout = () => {
  const [laciTerbuka, setLaciTerbuka] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-white font-sans [--font-sans:var(--font-jakarta)] [--font-heading:var(--font-jakarta)] lg:flex">
      {/* Sidebar layar lebar */}
      <aside className="hidden w-72 flex-shrink-0 border-r border-dark-100 lg:sticky lg:top-0 lg:block lg:h-screen">
        <DashboardSidebar />
      </aside>

      {/* Laci layar kecil */}
      {laciTerbuka && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setLaciTerbuka(false)}
            className="absolute inset-0 bg-dark-950/50"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-masuk-halaman overflow-y-auto shadow-card">
            <button
              type="button"
              onClick={() => setLaciTerbuka(false)}
              aria-label="Tutup menu"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-dark-500 transition-colors hover:bg-dark-100"
            >
              <X className="h-5 w-5" />
            </button>
            <DashboardSidebar onPilihMenu={() => setLaciTerbuka(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader onBukaMenu={() => setLaciTerbuka(true)} />

        {/* key={pathname} membuat animasi masuk ikut jalan tiap pindah halaman,
            sama seperti MainLayout di sisi publik. */}
        <main key={pathname} className="animate-masuk-halaman flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="px-4 pb-6 pt-2 text-[10.67px] font-semibold leading-[normal] tracking-[.02em] text-dark-400 sm:px-6 lg:px-8">
          {adminSekolah.nama} &bull; Admin Panel
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
