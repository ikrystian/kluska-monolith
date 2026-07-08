import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';

import LoginPage from '@/pages/Login';
import RegisterPage from '@/pages/Register';

import AthleteLayout from '@/components/layouts/AthleteLayout';
import OnboardingLayout from '@/components/layouts/OnboardingLayout';
import KnowledgeZoneLayout from '@/components/layouts/KnowledgeZoneLayout';

import DashboardPage from '@/pages/athlete/Dashboard';
import CalendarPage from '@/pages/athlete/Calendar';
import ChatPage from '@/pages/athlete/Chat';
import CheckInPage from '@/pages/athlete/CheckIn';
import ExercisesPage from '@/pages/athlete/Exercises';
import GamificationPage from '@/pages/athlete/Gamification';
import GoalsPage from '@/pages/athlete/Goals';
import HabitsPage from '@/pages/athlete/Habits';
import HistoryPage from '@/pages/athlete/History';
import HistoryDetailPage from '@/pages/athlete/HistoryDetail';
import KnowledgeZonePage from '@/pages/athlete/KnowledgeZone';
import KnowledgeZoneArticlePage from '@/pages/athlete/KnowledgeZoneArticle';
import KnowledgeZoneManagePage from '@/pages/athlete/KnowledgeZoneManage';
import LogPage from '@/pages/athlete/Log';
import MapPage from '@/pages/athlete/Map';
import MeasurementsPage from '@/pages/athlete/Measurements';
import OnboardingPage from '@/pages/athlete/Onboarding';
import ProfilePage from '@/pages/athlete/Profile';
import ProgressPage from '@/pages/athlete/Progress';
import RunningPage from '@/pages/athlete/Running';
import SocialPage from '@/pages/athlete/Social';
import TemplatesPage from '@/pages/athlete/Templates';
import WorkoutPlansPage from '@/pages/athlete/WorkoutPlans';
import WorkoutsPage from '@/pages/athlete/Workouts';
import WorkoutCreatePage from '@/pages/athlete/WorkoutCreate';
import WorkoutDetailPage from '@/pages/athlete/WorkoutDetail';
import WorkoutEditPage from '@/pages/athlete/WorkoutEdit';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
    <AuthProvider>
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
          <Route path="chat" element={<ChatPage />} />
          <Route path="check-in" element={<CheckInPage />} />
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
          <Route path="measurements" element={<MeasurementsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="running" element={<RunningPage />} />
          <Route path="social" element={<SocialPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="workout-plans" element={<WorkoutPlansPage />} />

          <Route path="workouts" element={<WorkoutsPage />} />
          <Route path="workouts/create" element={<WorkoutCreatePage />} />
          <Route path="workouts/:id" element={<WorkoutDetailPage />} />
          <Route path="workouts/:id/edit" element={<WorkoutEditPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/athlete/dashboard" replace />} />
      </Routes>
      <Toaster />
      <SonnerToaster />
    </AuthProvider>
    </ThemeProvider>
  );
}
