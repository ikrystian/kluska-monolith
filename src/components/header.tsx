
'use client';

import { Dumbbell } from 'lucide-react';
import { SidebarTrigger } from './ui/sidebar';
import Link from 'next/link';
import { NotificationBell } from './notifications/NotificationBell';
import { QuickChatWidget } from './chat/QuickChatWidget';

export function AppHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-primary md:hidden"
      >
        <span className="font-headline text-xl">Leniwa Kluska</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <QuickChatWidget />
      </div>
    </header>
  );
}
