import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import { Loader2 } from 'lucide-react';
import { AppHeader } from '@/components/header';
import { useUser } from '@/lib/db-hooks';
import { BottomNav } from '@/components/bottom-nav';
import { ActiveWorkoutProvider } from '@/contexts/ActiveWorkoutContext';
import { ActiveWorkoutWidget } from '@/components/workout/ActiveWorkoutWidget';
import { NativeWidgetBridge } from '@/components/native-widget-bridge';
import { UserProfileProvider, useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth, ONBOARDING_PENDING_KEY } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AnimatedOutlet } from '@/components/motion';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useHideOnScroll } from '@/hooks/useHideOnScroll';
import { PullToRefreshIndicator } from '@/components/pull-to-refresh-indicator';
import { OfflineBanner } from '@/components/offline-banner';
import { cn } from '@/lib/utils';

function WrongRoleScreen() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg font-semibold">Ten panel jest przeznaczony dla kont sportowców i trenerów.</p>
      <p className="text-muted-foreground">Zaloguj się na konto sportowca lub trenera, aby kontynuować.</p>
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
  // The run recorder is a full-screen, map-first experience (map tiles under a
  // frosted stats sheet) — the nav/header chrome and page-transition wrapper
  // would just eat into that space and fight its own fixed-position layout.
  const isRunRecordPage = location.pathname.startsWith('/athlete/running/record');
  const isImmersivePage = isOnboardingPage || isRunRecordPage;
  // Active workout session hides the header and bottom nav, so the scroll area
  // drops the clearance padding it otherwise needs to sit between them.
  const isActiveWorkoutSession = location.pathname === '/athlete/log' && new URLSearchParams(location.search).has('logId');
  const scrollRef = useRef<HTMLDivElement>(null);

  useAndroidBackButton();

  // Every screen reads through SWR, so one global revalidation refreshes
  // whatever the current page happens to be showing. It must be the mutate
  // bound to our SWRConfig cache provider — the one exported from 'swr' talks
  // to the default cache and does nothing here. No data argument: passing
  // `undefined` would wipe every cached screen back to skeletons first.
  const { mutate } = useSWRConfig();
  const refreshAll = useCallback(() => mutate(() => true), [mutate]);
  const { indicatorRef } = usePullToRefresh(scrollRef, refreshAll, !isActiveWorkoutSession);
  // The header and tab bar tuck away while reading down, and return on scroll up.
  const [chromeRoot, setChromeRoot] = useState<HTMLElement | null>(null);
  const chromeHidden = useHideOnScroll(chromeRoot, location.pathname + location.search, !isActiveWorkoutSession);

  // Scroll the content container back to top on route change so the
  // page transition starts from a clean position.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    // This effect handles redirection after loading is complete
    if (!isLoading) {
      if (!user) {
        // If not logged in at all, go to login
        navigate('/login');
      } else if (userProfile?.role === 'athlete') {
        if (userProfile.onboardingCompleted) {
          // Profile is set up — drop any leftover "pending" marker.
          localStorage.removeItem(ONBOARDING_PENDING_KEY);
        } else if (
          localStorage.getItem(ONBOARDING_PENDING_KEY) === '1' &&
          !isOnboardingPage
        ) {
          // Only a guest sign-in or a new account's first login sets this
          // marker, so existing accounts without `onboardingCompleted` are
          // not forced through the wizard.
          navigate('/athlete/onboarding');
        }
      }
      // Trainers use the app like athletes (no onboarding wizard). Admins have
      // no home in this SPA, so we just show WrongRoleScreen below instead of
      // redirecting anywhere.
    }
  }, [user, userProfile, isLoading, navigate, isOnboardingPage]);

  // Render loading state until we are certain about the user's auth state and role.
  // This prevents child components from rendering and attempting to fetch data prematurely.
  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If after loading, the user is still not logged in, render nothing.
  // The useEffect will handle the redirect.
  if (!user) {
    return null;
  }

  if (userProfile?.role !== 'athlete' && userProfile?.role !== 'trainer') {
    return <WrongRoleScreen />;
  }

  // Onboarding and the run recorder render without the full layout (nav, header, etc.)
  if (isImmersivePage) {
    return <Outlet />;
  }

  // At this point, user is loaded, logged in, and is confirmed to be an athlete
  // or a trainer. It is now safe to render the athlete layout and its children.
  return (
    <ActiveWorkoutProvider>
      <NativeWidgetBridge />
      <main
        ref={setChromeRoot}
        data-chrome={chromeHidden ? 'hidden' : 'visible'}
        className="group/chrome app-column relative flex h-dvh flex-col overflow-hidden bg-background"
      >
        {!isActiveWorkoutSession && <AppHeader />}
        <OfflineBanner />
        <PullToRefreshIndicator ref={indicatorRef} />
        {/* The padding belongs to the scroller, so content slides under the
            frosted header and tab bar instead of stopping at their edge. */}
        <div
          ref={scrollRef}
          id="outlet"
          className={cn(
            'relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden',
            isActiveWorkoutSession
              ? 'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]'
              : 'pb-[var(--app-bottom)] pt-[var(--app-top)] has-[~#mini-player]:pb-[calc(var(--app-bottom)+4rem)]'
          )}
        >
          {/* h-full so pages that build their own internal scroll region
              (ExercisesListView's virtualized list, Log's builder) resolve
              a real height off #outlet instead of collapsing to content. */}
          <AnimatedOutlet className="h-full" />
        </div>
        <BottomNav />
        <ActiveWorkoutWidget />
      </main>
    </ActiveWorkoutProvider>
  );
}

export default function AthleteLayout() {
  return (
    <UserProfileProvider>
      <AthleteLayoutContent />
    </UserProfileProvider>
  );
}
