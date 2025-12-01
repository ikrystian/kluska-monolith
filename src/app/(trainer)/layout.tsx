'use client';

import { AppNav } from '@/components/nav';
import { AppHeader } from '@/components/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useUser, useDoc } from '@/lib/db-hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { QuickChatWidget } from '@/components/chat/QuickChatWidget';

export default function TrainerLayout({
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
    // This effect handles redirection after loading is complete
    if (!isLoading) {
      if (!user) {
        // If not logged in at all, go to login
        router.push('/login');
      } else if (userProfile?.role === 'athlete') {
        router.push('/athlete/dashboard');
      } else if (userProfile?.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (userProfile && userProfile.role !== 'trainer') {
        // If logged in but not a trainer, go to login
        router.push('/login');
      }
      // If user is trainer, don't redirect - let them stay on current page
    }
  }, [user, userProfile, isLoading, router]);

  // Render loading state until we are certain about the user's auth state and role.
  // This prevents child components from rendering and attempting to fetch data prematurely.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Weryfikacja uprawnień...</p>
        </div>
      </div>
    );
  }

  // If after loading, the user is still not a trainer or admin, render nothing.
  // The useEffect will handle the redirect.
  if (userProfile?.role !== 'trainer' && userProfile?.role !== 'admin') {
    return null;
  }

  // At this point, user is loaded, logged in, and is confirmed to be a trainer or admin.
  // It is now safe to render the trainer layout and its children.
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppNav />
        <main className="flex-1 flex-col overflow-y-auto bg-secondary/30">
          <AppHeader />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
      <QuickChatWidget />
    </SidebarProvider>
  );
}
