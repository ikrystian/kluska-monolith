
'use client';

import { Dumbbell } from 'lucide-react';
import { SidebarTrigger } from './ui/sidebar';
import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-primary md:hidden"
      >
        <Dumbbell className="h-6 w-6" />
        <span className="font-headline text-xl">GymProgress</span>
      </Link>
    </header>
  );
}
