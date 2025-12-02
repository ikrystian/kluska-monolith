'use client';

import { useUser, useDoc } from '@/lib/db-hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { UserProfile } from '@/lib/types';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    user ? 'users' : null,
    user?.uid || null
  );

  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (userProfile?.onboardingCompleted) {
        // If onboarding is already completed, redirect to dashboard
        router.push('/athlete/dashboard');
      } else if (userProfile?.role !== 'athlete') {
        // If not an athlete, redirect based on role
        if (userProfile?.role === 'trainer') {
          router.push('/trainer/dashboard');
        } else if (userProfile?.role === 'admin') {
          router.push('/admin/dashboard');
        }
      }
    }
  }, [user, userProfile, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Don't render if not an athlete or if onboarding is completed
  if (!user || userProfile?.role !== 'athlete' || userProfile?.onboardingCompleted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {children}
    </div>
  );
}