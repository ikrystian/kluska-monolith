import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useUser, useDoc } from '@/lib/db-hooks';
import { Loader2 } from 'lucide-react';
import { UserProfile } from '@/lib/types';

export default function OnboardingLayout() {
  const { user, isUserLoading } = useUser();
  const navigate = useNavigate();

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    user ? 'users' : null,
    user?.uid || null
  );

  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/login');
      } else if (userProfile?.onboardingCompleted) {
        // If onboarding is already completed, redirect to dashboard
        navigate('/athlete/dashboard');
      }
      // Non-athlete roles have no home in this SPA; the parent AthleteLayout
      // already handles showing them the "wrong role" screen instead.
    }
  }, [user, userProfile, isLoading, navigate]);

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
      <Outlet />
    </div>
  );
}
