import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';
import { ActiveWorkoutProvider } from '@/contexts/ActiveWorkoutContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AthleteLayout } from '@/components/layout/AthleteLayout';
import { Loader2 } from 'lucide-react';

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));

// Athlete pages
const DashboardPage = lazy(() => import('@/pages/athlete/DashboardPage'));
const CalendarPage = lazy(() => import('@/pages/athlete/CalendarPage'));
const ChatPage = lazy(() => import('@/pages/athlete/ChatPage'));
const ExercisesPage = lazy(() => import('@/pages/athlete/ExercisesPage'));
const GamificationPage = lazy(() => import('@/pages/athlete/GamificationPage'));
const GoalsPage = lazy(() => import('@/pages/athlete/GoalsPage'));
const HabitsPage = lazy(() => import('@/pages/athlete/HabitsPage'));
const HistoryPage = lazy(() => import('@/pages/athlete/HistoryPage'));
const HistoryDetailPage = lazy(() => import('@/pages/athlete/HistoryDetailPage'));
const KnowledgeZonePage = lazy(() => import('@/pages/athlete/KnowledgeZonePage'));
const ArticleDetailPage = lazy(() => import('@/pages/athlete/ArticleDetailPage'));
const KnowledgeManagePage = lazy(() => import('@/pages/athlete/KnowledgeManagePage'));
const LogPage = lazy(() => import('@/pages/athlete/LogPage'));
const MapPage = lazy(() => import('@/pages/athlete/MapPage'));
const MeasurementsPage = lazy(() => import('@/pages/athlete/MeasurementsPage'));
const ProfilePage = lazy(() => import('@/pages/athlete/ProfilePage'));
const OnboardingPage = lazy(() => import('@/pages/athlete/OnboardingPage'));
const RunningPage = lazy(() => import('@/pages/athlete/RunningPage'));
const SocialPage = lazy(() => import('@/pages/athlete/SocialPage'));
const TemplatesPage = lazy(() => import('@/pages/athlete/TemplatesPage'));
const WorkoutPlansPage = lazy(() => import('@/pages/athlete/WorkoutPlansPage'));
const WorkoutsPage = lazy(() => import('@/pages/athlete/WorkoutsPage'));
const WorkoutDetailPage = lazy(() => import('@/pages/athlete/WorkoutDetailPage'));
const WorkoutEditPage = lazy(() => import('@/pages/athlete/WorkoutEditPage'));
const WorkoutCreatePage = lazy(() => import('@/pages/athlete/WorkoutCreatePage'));

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <UserProfileProvider>
        <ActiveWorkoutProvider>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected athlete routes */}
            <Route
              path="/athlete"
              element={
                <ProtectedRoute>
                  <AthleteLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/athlete/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="exercises" element={<ExercisesPage />} />
              <Route path="gamification" element={<GamificationPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="habits" element={<HabitsPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="history/:sessionId" element={<HistoryDetailPage />} />
              <Route path="knowledge-zone" element={<KnowledgeZonePage />} />
              <Route path="knowledge-zone/:articleId" element={<ArticleDetailPage />} />
              <Route path="knowledge-zone/manage" element={<KnowledgeManagePage />} />
              <Route path="log" element={<LogPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="measurements" element={<MeasurementsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="running" element={<RunningPage />} />
              <Route path="social" element={<SocialPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="workout-plans" element={<WorkoutPlansPage />} />
              <Route path="workouts" element={<WorkoutsPage />} />
              <Route path="workouts/:id" element={<WorkoutDetailPage />} />
              <Route path="workouts/:id/edit" element={<WorkoutEditPage />} />
              <Route path="workouts/create" element={<WorkoutCreatePage />} />
            </Route>

            {/* Onboarding - separate layout */}
            <Route
              path="/athlete/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/athlete/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/athlete/dashboard" replace />} />
            </Routes>
          </Suspense>
        </ActiveWorkoutProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}

export default App;
