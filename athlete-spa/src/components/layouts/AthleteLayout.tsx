import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppNav } from '@/components/nav';
import { AppHeader } from '@/components/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useUser } from '@/lib/db-hooks';
import { BottomNav } from '@/components/bottom-nav';
import { ActiveWorkoutProvider } from '@/contexts/ActiveWorkoutContext';
import { ActiveWorkoutWidget } from '@/components/workout/ActiveWorkoutWidget';
import { UserProfileProvider, useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

function WrongRoleScreen() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-lg font-semibold">Ten panel jest przeznaczony wyłącznie dla kont sportowców.</p>
      <p className="text-muted-foreground">Zaloguj się na konto sportowca, aby kontynuować.</p>
      <Button
        onClick={() => {
          logout();
          navigate('/login');
        }}
      >
        Wyloguj się
      </Button>
    </div>
  );
}

function AthleteLayoutContent() {
  const { user, isUserLoading } = useUser();
  const { userProfile, isLoading: isProfileLoading } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoading = isUserLoading || isProfileLoading;
  const isOnboardingPage = location.pathname.startsWith('/athlete/onboarding');

  useEffect(() => {
    // This effect handles redirection after loading is complete
    if (!isLoading) {
      if (!user) {
        // If not logged in at all, go to login
        navigate('/login');
      } else if (userProfile?.role === 'athlete') {
        // Check if onboarding is needed (only if not already on onboarding page)
        if (!userProfile.onboardingCompleted && !isOnboardingPage) {
          navigate('/athlete/onboarding');
        }
      }
      // Non-athlete roles (trainer/admin) have no home in this SPA, so we
      // just show WrongRoleScreen below instead of redirecting anywhere.
    }
  }, [user, userProfile, isLoading, navigate, isOnboardingPage]);

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

  // If after loading, the user is still not logged in, render nothing.
  // The useEffect will handle the redirect.
  if (!user) {
    return null;
  }

  if (userProfile?.role !== 'athlete') {
    return <WrongRoleScreen />;
  }

  // If on onboarding page, render children without the full layout (nav, header, etc.)
  if (isOnboardingPage) {
    return <Outlet />;
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
            <div className="flex-1 overflow-y-auto min-h-0 pt-16 pb-16 md:pb-0 sm:pt-0">
              <Outlet />
            </div>
            <BottomNav />
          </main>
        </div>
        <ActiveWorkoutWidget />
      </ActiveWorkoutProvider>
    </SidebarProvider>
  );
}

export default function AthleteLayout() {
  return (
    <UserProfileProvider>
      <AthleteLayoutContent />
    </UserProfileProvider>
  );
}
