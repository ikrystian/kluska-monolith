import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SWRConfig, useSWRConfig } from 'swr';
import { bindCacheInvalidation, trackActiveKeys } from '@/lib/cache-invalidation';
import { AuthProvider } from '@/contexts/AuthContext';
import { createPersistentCacheProvider } from '@/lib/swr-cache';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'react-hot-toast';
import { FullScreenFallback } from '@/components/route-fallback';
import { NativePushBridge } from '@/components/native-push-bridge';
import { NativeRunBridge } from '@/components/native-run-bridge';
import { NativeDeepLinks } from '@/components/native-widget-bridge';

import LoginPage from '@/pages/Login';
import RegisterPage from '@/pages/Register';
import ForgotPasswordPage from '@/pages/ForgotPassword';

import AthleteLayout from '@/components/layouts/AthleteLayout';
import OnboardingLayout from '@/components/layouts/OnboardingLayout';
import KnowledgeZoneLayout from '@/components/layouts/KnowledgeZoneLayout';
import { RequireFullAccount } from '@/components/guest-gate';
import { RequireRole } from '@/components/role-gate';

// Each page is its own chunk: the athlete only downloads and parses the screen
// they actually open, instead of the whole app up front. Dashboard is the
// default landing route, so it is worth keeping eager to avoid a spinner on
// the very first paint.
import DashboardPage from '@/pages/athlete/Dashboard';
import { HalloweenScene } from './components/auth/HalloweenScene';
import { useHalloween } from '@/hooks/useHalloween';

const DietPage = lazy(() => import('@/pages/athlete/Diet'));
const CalendarPage = lazy(() => import('@/pages/athlete/Calendar'));
const ChatPage = lazy(() => import('@/pages/athlete/Chat'));
const CheckInPage = lazy(() => import('@/pages/athlete/CheckIn'));
const ExercisesPage = lazy(() => import('@/pages/athlete/Exercises'));
const ExerciseQuickViewPage = lazy(() => import('@/pages/athlete/ExerciseQuickView'));
const GamificationPage = lazy(() => import('@/pages/athlete/Gamification'));
const GoalsPage = lazy(() => import('@/pages/athlete/Goals'));
const HabitsPage = lazy(() => import('@/pages/athlete/Habits'));
const HistoryPage = lazy(() => import('@/pages/athlete/History'));
const HistoryDetailPage = lazy(() => import('@/pages/athlete/HistoryDetail'));
const KnowledgeZonePage = lazy(() => import('@/pages/athlete/KnowledgeZone'));
const KnowledgeZoneArticlePage = lazy(() => import('@/pages/athlete/KnowledgeZoneArticle'));
const KnowledgeZoneManagePage = lazy(() => import('@/pages/athlete/KnowledgeZoneManage'));
const LogPage = lazy(() => import('@/pages/athlete/Log'));
const MapPage = lazy(() => import('@/pages/athlete/Map'));
const MeasurementsPage = lazy(() => import('@/pages/athlete/Measurements'));
const MenuPage = lazy(() => import('@/pages/athlete/Menu'));
const NutritionPage = lazy(() => import('@/pages/athlete/Nutrition'));
const OnboardingPage = lazy(() => import('@/pages/athlete/Onboarding'));
const PetPage = lazy(() => import('@/pages/athlete/Pet'));
const ProgressPage = lazy(() => import('@/pages/athlete/Progress'));
const RunningPage = lazy(() => import('@/pages/athlete/Running'));
const RunRecordPage = lazy(() => import('@/pages/athlete/RunRecord'));
const RunDetailPage = lazy(() => import('@/pages/athlete/RunDetail'));
const RunDetailStravaPage = lazy(() => import('@/pages/athlete/RunDetailStrava'));
const SocialPage = lazy(() => import('@/pages/athlete/Social'));
const PublicProfilePage = lazy(() => import('@/pages/athlete/PublicProfile'));
const ChallengesPage = lazy(() => import('@/pages/athlete/Challenges'));
const ChallengeDetailPage = lazy(() => import('@/pages/athlete/ChallengeDetail'));
const SettingsPage = lazy(() => import('@/pages/athlete/Settings'));
const YouPage = lazy(() => import('@/pages/athlete/You'));
const TemplatesPage = lazy(() => import('@/pages/athlete/Templates'));
const TrainersPage = lazy(() => import('@/pages/athlete/Trainers'));
const TrainerDetailPage = lazy(() => import('@/pages/athlete/TrainerDetail'));
const TrainerPanelPage = lazy(() => import('@/pages/athlete/TrainerPanel'));
const WorkoutPlansPage = lazy(() => import('@/pages/athlete/WorkoutPlans'));
const WorkoutsPage = lazy(() => import('@/pages/athlete/Workouts'));
const WorkoutCreatePage = lazy(() => import('@/pages/athlete/WorkoutCreate'));
const WorkoutDetailPage = lazy(() => import('@/pages/athlete/WorkoutDetail'));
const WorkoutEditPage = lazy(() => import('@/pages/athlete/WorkoutEdit'));

// Created once: SWR calls the provider on mount, and a fresh Map per render
// would throw away the cache on every re-render.
const cacheProvider = createPersistentCacheProvider();

/** Hands the provider-bound `mutate`/`cache` to the invalidation layer. */
function CacheInvalidationBinder() {
  const { mutate, cache } = useSWRConfig();
  useEffect(() => {
    bindCacheInvalidation({ mutate, cache });
    return () => bindCacheInvalidation(null);
  }, [mutate, cache]);
  return null;
}

/** `/athlete/profile` from before the split; query params (OAuth results, `tab`) route to the right screen. */
function LegacyProfileRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (params.get('tab') === 'settings') {
    params.delete('tab');
    const qs = params.toString();
    return <Navigate to={{ pathname: '/athlete/settings', search: qs ? `?${qs}` : '' }} replace />;
  }
  return <Navigate to={{ pathname: '/athlete/you', search }} replace />;
}

/** Seasonal overlay; a component of its own because the SWR hook needs the provider above it. */
function HalloweenOverlay() {
  return useHalloween() ? <HalloweenScene /> : null;
}

export default function App() {
  return (
    <SWRConfig
      value={{
        provider: cacheProvider,
        // The restored snapshot can be hours old, so a screen the athlete
        // returns to should re-check rather than trust it indefinitely.
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        keepPreviousData: true,
        use: [trackActiveKeys],
      }}
    >
      <CacheInvalidationBinder />
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        <AuthProvider>
          <NativePushBridge />
          <NativeRunBridge />
          <NativeDeepLinks />
          {/* Safety net for routes rendered outside AthleteLayout (onboarding,
          and anything not covered by the in-layout Suspense boundary). */}
          <Suspense fallback={<FullScreenFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/athlete/dashboard" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              <Route path="/athlete" element={<AthleteLayout />}>
                <Route element={<OnboardingLayout />}>
                  <Route path="onboarding" element={<OnboardingPage />} />
                </Route>

                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="calendar" element={<CalendarPage />} />

                {/* Features tied to a trainer/community need a full account; guests
              (per-device accounts) see an upgrade prompt instead. */}
                <Route element={<RequireFullAccount />}>
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="check-in" element={<CheckInPage />} />
                  <Route path="social" element={<SocialPage />} />
                  <Route path="social/profile/:userId" element={<PublicProfilePage />} />
                  <Route path="challenges" element={<ChallengesPage />} />
                  <Route path="challenges/:challengeId" element={<ChallengeDetailPage />} />
                </Route>

                <Route path="diet" element={<DietPage />} />
                <Route path="exercises" element={<ExercisesPage />} />
                <Route path="exercise/:exerciseId" element={<ExerciseQuickViewPage />} />
                <Route path="gamification" element={<GamificationPage />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="habits" element={<HabitsPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="history/:sessionId" element={<HistoryDetailPage />} />

                <Route path="knowledge-zone" element={<KnowledgeZoneLayout />}>
                  <Route index element={<KnowledgeZonePage />} />
                  <Route path="manage" element={<KnowledgeZoneManagePage />} />
                  <Route path=":articleId" element={<KnowledgeZoneArticlePage />} />
                </Route>

                <Route path="log" element={<LogPage />} />
                <Route path="map" element={<MapPage />} />
                <Route path="nutrition" element={<NutritionPage />} />
                <Route path="measurements" element={<MeasurementsPage />} />
                <Route path="menu" element={<MenuPage />} />
                {/* Profile and settings moved into the "Ty" tab; old links keep working. */}
                <Route path="profile" element={<LegacyProfileRedirect />} />
                <Route path="pet" element={<PetPage />} />
                <Route path="progress" element={<ProgressPage />} />
                <Route path="running" element={<RunningPage />} />
                <Route path="running/record" element={<RunRecordPage />} />
                <Route path="running/strava/:activityId" element={<RunDetailStravaPage />} />
                <Route path="running/:sessionId" element={<RunDetailPage />} />
                {/* Podsumowanie is now the profile card on the "Ty" tab. */}
                <Route path="summary" element={<Navigate to="/athlete/you" replace />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="trainers" element={<TrainersPage />} />
                <Route path="trainers/:id" element={<TrainerDetailPage />} />

                <Route element={<RequireRole roles={['trainer']} />}>
                  <Route path="trainer-panel" element={<TrainerPanelPage />} />
                </Route>

                <Route path="workout-plans" element={<WorkoutPlansPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="you" element={<YouPage />} />

                <Route path="workouts" element={<WorkoutsPage />} />
                <Route path="workouts/create" element={<WorkoutCreatePage />} />
                <Route path="workouts/:id" element={<WorkoutDetailPage />} />
                <Route path="workouts/:id/edit" element={<WorkoutEditPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/athlete/dashboard" replace />} />
            </Routes>
          </Suspense>
          <HalloweenOverlay />

          <Toaster
            position="top-center"
            containerStyle={{ top: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.875rem',
                boxShadow: '0 8px 32px -8px rgb(0 0 0 / 0.4)',
                fontSize: '0.9375rem',
                maxWidth: '92vw',
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: 'hsl(var(--destructive))',
                  secondary: 'hsl(var(--destructive-foreground))',
                },
              },
              success: {
                iconTheme: {
                  primary: 'hsl(var(--volt))',
                  secondary: 'hsl(var(--volt-foreground))',
                },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </SWRConfig>
  );
}
