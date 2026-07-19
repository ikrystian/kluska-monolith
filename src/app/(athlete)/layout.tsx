'use client';

import { AppNav } from '@/components/nav';
import { AppHeader } from '@/components/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useUser } from '@/lib/db-hooks';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { BottomNav } from '@/components/bottom-nav';
import { ActiveWorkoutProvider } from '@/contexts/ActiveWorkoutContext';
import { ActiveWorkoutWidget } from '@/components/workout/ActiveWorkoutWidget';
import { UserProfileProvider, useUserProfile } from '@/contexts/UserProfileContext';

function AthleteLayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();

  const isLoading = isUserLoading || isProfileLoading;
  const isOnboardingPage = pathname?.startsWith('/athlete/onboarding');

  useEffect(() => {
    // Redirect only if user is logged in as trainer or admin
    if (!isLoading) {
      if (userProfile?.role === 'trainer') {
        router.push('/trainer/dashboard');
      } else if (userProfile?.role === 'admin') {
        router.push('/admin/dashboard');
      }
    }
  }, [userProfile, isLoading, router]);

  // Render loading state until we are certain about the user's auth state and role.
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

  // If user is trainer or admin, useEffect will redirect them
  if (userProfile?.role === 'trainer' || userProfile?.role === 'admin') {
    return null;
  }

  // If on onboarding page, render children without the full layout (nav, header, etc.)
  if (isOnboardingPage) {
    return <>{children}</>;
  }

  // At this point, user is loaded, logged in, and is confirmed to be an athlete.
  // It is now safe to render the athlete layout and its children.
  return (
    <SidebarProvider>
      <ActiveWorkoutProvider>
        <div className="flex min-h-screen w-full">
          <AppNav />
          <main className="flex-1 flex flex-col overflow-hidden bg-secondary/30">
            <AppHeader />
            <div className="flex-1 overflow-y-auto min-h-0 pt-16 pb-16 md:pb-0 sm:pt-0">{children}</div>
            <BottomNav />
          </main>
        </div>
        <ActiveWorkoutWidget />
      </ActiveWorkoutProvider>
    </SidebarProvider>
  );
}

export default function AthleteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <UserProfileProvider>
      <AthleteLayoutContent>{children}</AthleteLayoutContent>
    </UserProfileProvider>
  );
}
