import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useUser, useDoc } from '@/lib/db-hooks';
import { Loader2 } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { ONBOARDING_PENDING_KEY } from '@/contexts/AuthContext';

export default function OnboardingLayout() {
  const { user, isUserLoading } = useUser();
  const navigate = useNavigate();

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    user ? 'users' : null,
    user?.uid || null
  );

  const isLoading = isUserLoading || isProfileLoading;
  // The wizard is reachable only right after a guest sign-in or a new account's
  // first login, both of which set this marker. Without it (e.g. a returning
  // user opening the URL directly) there is nothing to onboard.
  const onboardingPending = localStorage.getItem(ONBOARDING_PENDING_KEY) === '1';

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/login');
      } else if (userProfile?.onboardingCompleted || !onboardingPending) {
        // Already set up, or not coming from an entry point that onboards —
        // send them to the dashboard.
        navigate('/athlete/dashboard');
      }
      // Non-athlete roles have no home in this SPA; the parent AthleteLayout
      // already handles showing them the "wrong role" screen instead.
    }
  }, [user, userProfile, isLoading, onboardingPending, navigate]);

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

  // Don't render if not an athlete, if onboarding is completed, or if this
  // session didn't arrive through an entry point that onboards.
  if (
    !user ||
    userProfile?.role !== 'athlete' ||
    userProfile?.onboardingCompleted ||
    !onboardingPending
  ) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Outlet />
    </div>
  );
}
