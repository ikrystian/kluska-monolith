'use client';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from '@/lib/next-auth-react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { ActiveWorkoutProvider } from '@/contexts/ActiveWorkoutContext';
import { UserProfileProvider } from '@/contexts/UserProfileContext';

// Pages
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

// Layouts
import AthleteLayout from '@/layouts/AthleteLayout';
import TrainerLayout from '@/layouts/TrainerLayout';
import AdminLayout from '@/layouts/AdminLayout';

// Athlete Pages
import AthleteDashboard from '@/pages/athlete/DashboardPage';
import AthleteWorkouts from '@/pages/athlete/WorkoutsPage';
import AthleteWorkoutCreate from '@/pages/athlete/WorkoutCreatePage';
import AthleteWorkoutDetail from '@/pages/athlete/WorkoutDetailPage';
import AthleteExercises from '@/pages/athlete/ExercisesPage';
import AthleteWorkoutPlans from '@/pages/athlete/WorkoutPlansPage';
import AthleteHistory from '@/pages/athlete/HistoryPage';
import AthleteHistoryDetail from '@/pages/athlete/HistoryDetailPage';
import AthleteCalendar from '@/pages/athlete/CalendarPage';
import AthleteLog from '@/pages/athlete/LogPage';
import AthleteSocial from '@/pages/athlete/SocialPage';
import AthleteGoals from '@/pages/athlete/GoalsPage';
import AthleteRunning from '@/pages/athlete/RunningPage';
import AthleteMeasurements from '@/pages/athlete/MeasurementsPage';
import AthleteProfile from '@/pages/athlete/ProfilePage';
import AthleteGamification from '@/pages/athlete/GamificationPage';
import AthleteChat from '@/pages/athlete/ChatPage';
import AthleteHabits from '@/pages/athlete/HabitsPage';
import AthleteMap from '@/pages/athlete/MapPage';

// Trainer Pages
import TrainerDashboard from '@/pages/trainer/DashboardPage';

// Admin Pages
import AdminDashboard from '@/pages/admin/DashboardPage';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Ładowanie...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && session?.user && !allowedRoles.includes(session.user.role)) {
    // Redirect to appropriate dashboard based on role
    if (session.user.role === 'athlete') return <Navigate to="/athlete/dashboard" replace />;
    if (session.user.role === 'trainer') return <Navigate to="/trainer/dashboard" replace />;
    if (session.user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Redirect based on role
function RoleRedirect() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Ładowanie...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  if (session?.user?.role === 'athlete') return <Navigate to="/athlete/dashboard" replace />;
  if (session?.user?.role === 'trainer') return <Navigate to="/trainer/dashboard" replace />;
  if (session?.user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;

  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Root redirect */}
      <Route path="/" element={<RoleRedirect />} />

      {/* Athlete Routes */}
      <Route
        path="/athlete/*"
        element={
          <ProtectedRoute allowedRoles={['athlete']}>
            <AthleteLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AthleteDashboard />} />
        <Route path="workouts" element={<AthleteWorkouts />} />
        <Route path="workouts/create" element={<AthleteWorkoutCreate />} />
        <Route path="workouts/:id" element={<AthleteWorkoutDetail />} />
        <Route path="exercises" element={<AthleteExercises />} />
        <Route path="workout-plans" element={<AthleteWorkoutPlans />} />
        <Route path="history" element={<AthleteHistory />} />
        <Route path="history/:sessionId" element={<AthleteHistoryDetail />} />
        <Route path="calendar" element={<AthleteCalendar />} />
        <Route path="log" element={<AthleteLog />} />
        <Route path="social" element={<AthleteSocial />} />
        <Route path="goals" element={<AthleteGoals />} />
        <Route path="running" element={<AthleteRunning />} />
        <Route path="measurements" element={<AthleteMeasurements />} />
        <Route path="profile" element={<AthleteProfile />} />
        <Route path="gamification" element={<AthleteGamification />} />
        <Route path="chat" element={<AthleteChat />} />
        <Route path="habits" element={<AthleteHabits />} />
        <Route path="map" element={<AthleteMap />} />
        {/* Add more athlete routes here */}
      </Route>

      {/* Trainer Routes */}
      <Route
        path="/trainer/*"
        element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <TrainerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<TrainerDashboard />} />
        {/* Add more trainer routes here */}
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        {/* Add more admin routes here */}
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <SessionProvider>
        <UserProfileProvider>
          <ActiveWorkoutProvider>
            <BrowserRouter>
              <AppRoutes />
              <Toaster />
            </BrowserRouter>
          </ActiveWorkoutProvider>
        </UserProfileProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
