'use client';

import { AppNav } from '@/components/nav';
import { AppHeader } from '@/components/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useUser, useDoc } from '@/lib/db-hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(
    user ? 'users' : null,
    user?.uid || null
  );

  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (userProfile?.role === 'athlete') {
        router.push('/athlete/dashboard');
      } else if (userProfile?.role === 'trainer') {
        router.push('/trainer/dashboard');
      } else if (userProfile?.role === 'admin') {
        router.push('/admin/dashboard');
      }
    }
  }, [user, userProfile, isLoading, router]);

  // If loading, or not logged in, or is an admin, show loading screen or null.
  // The useEffect will handle the redirect.
  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Ładowanie...</p>
      </div>
    );
  }

  if (userProfile?.role === 'admin' || userProfile?.role === 'trainer' || userProfile?.role === 'athlete') {
    return null; // Return null to prevent rendering this layout before redirect
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppNav />
        <main className="flex flex-1 flex-col bg-secondary/30">
          <AppHeader />
          <div className="flex-1 pt-16 overflow-y-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
