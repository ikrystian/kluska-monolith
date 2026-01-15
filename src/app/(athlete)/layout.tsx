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
    // This effect handles redirection after loading is complete
    if (!isLoading) {
      if (!user) {
        // If not logged in at all, go to login
        router.push('/login');
      } else if (userProfile?.role === 'trainer') {
        router.push('/trainer/dashboard');
      } else if (userProfile?.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (userProfile?.role === 'athlete') {
        // Check if onboarding is needed (only if not already on onboarding page)
        if (!userProfile.onboardingCompleted && !isOnboardingPage) {
          router.push('/athlete/onboarding');
        }
      } else if (userProfile?.role !== 'athlete') {
        // If logged in but not an athlete/trainer/admin, go to login
        router.push('/athlete/dashboard');
      }
    }
  }, [user, userProfile, isLoading, router, isOnboardingPage]);

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

  // If after loading, the user is still not an athlete, render nothing.
  // The useEffect will handle the redirect.
  if (userProfile?.role !== 'athlete') {
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
            <div className="flex-1 overflow-y-auto min-h-0 pb-16 md:pb-0">{children}</div>
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
