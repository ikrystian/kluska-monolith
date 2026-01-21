import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { AppNav, AppHeader } from './AppNav';
import { BottomNav } from './BottomNav';

export function AthleteLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <AppNav isMobileOpen={isMobileMenuOpen} onMobileClose={() => setIsMobileMenuOpen(false)} />
      <main className="flex-1 flex flex-col overflow-hidden bg-secondary/30 md:ml-64">
        <AppHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        <div className="flex-1 overflow-y-auto min-h-0 pb-16 md:pb-0">
          <Outlet />
        </div>
        <BottomNav />
      </main>
    </div>
  );
}
