import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { AuthProvider } from '@/contexts/AuthContext';
import { createPersistentCacheProvider } from '@/lib/swr-cache';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { FullScreenFallback } from '@/components/route-fallback';

import LoginPage from '@/pages/Login';
import RegisterPage from '@/pages/Register';

import AthleteLayout from '@/components/layouts/AthleteLayout';
import OnboardingLayout from '@/components/layouts/OnboardingLayout';
import KnowledgeZoneLayout from '@/components/layouts/KnowledgeZoneLayout';
import { RequireFullAccount } from '@/components/guest-gate';

// Each page is its own chunk: the athlete only downloads and parses the screen
// they actually open, instead of the whole app up front. Dashboard is the
// default landing route, so it is worth keeping eager to avoid a spinner on
// the very first paint.
import DashboardPage from '@/pages/athlete/Dashboard';

const DietPage = lazy(() => import('@/pages/athlete/Diet'));
const CalendarPage = lazy(() => import('@/pages/athlete/Calendar'));
const ChatPage = lazy(() => import('@/pages/athlete/Chat'));
const CheckInPage = lazy(() => import('@/pages/athlete/CheckIn'));
const ExercisesPage = lazy(() => import('@/pages/athlete/Exercises'));
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
const NutritionPage = lazy(() => import('@/pages/athlete/Nutrition'));
const OnboardingPage = lazy(() => import('@/pages/athlete/Onboarding'));
const ProfilePage = lazy(() => import('@/pages/athlete/Profile'));
const ProgressPage = lazy(() => import('@/pages/athlete/Progress'));
const RunningPage = lazy(() => import('@/pages/athlete/Running'));
const SocialPage = lazy(() => import('@/pages/athlete/Social'));
const TemplatesPage = lazy(() => import('@/pages/athlete/Templates'));
const WorkoutPlansPage = lazy(() => import('@/pages/athlete/WorkoutPlans'));
const WorkoutsPage = lazy(() => import('@/pages/athlete/Workouts'));
const WorkoutCreatePage = lazy(() => import('@/pages/athlete/WorkoutCreate'));
const WorkoutDetailPage = lazy(() => import('@/pages/athlete/WorkoutDetail'));
const WorkoutEditPage = lazy(() => import('@/pages/athlete/WorkoutEdit'));

// Created once: SWR calls the provider on mount, and a fresh Map per render
// would throw away the cache on every re-render.
const cacheProvider = createPersistentCacheProvider();

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
      }}
    >
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
    <AuthProvider>
      {/* Safety net for routes rendered outside AthleteLayout (onboarding,
          and anything not covered by the in-layout Suspense boundary). */}
      <Suspense fallback={<FullScreenFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/athlete/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

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
          </Route>

          <Route path="diet" element={<DietPage />} />
          <Route path="exercises" element={<ExercisesPage />} />
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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="running" element={<RunningPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="workout-plans" element={<WorkoutPlansPage />} />

          <Route path="workouts" element={<WorkoutsPage />} />
          <Route path="workouts/create" element={<WorkoutCreatePage />} />
          <Route path="workouts/:id" element={<WorkoutDetailPage />} />
          <Route path="workouts/:id/edit" element={<WorkoutEditPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/athlete/dashboard" replace />} />
      </Routes>
      </Suspense>
      <Toaster />
      <SonnerToaster />
    </AuthProvider>
    </ThemeProvider>
    </SWRConfig>
  );
}
