import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { userProfile, isLoading: profileLoading } = useUserProfile();
  const location = useLocation();

  const isLoading = authLoading || profileLoading;
  const isOnboardingPage = location.pathname === '/athlete/onboarding';

  // Show loading spinner while checking auth
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

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check user role - redirects based on role
  if (userProfile) {
    if (userProfile.role === 'trainer') {
      return <Navigate to="/trainer/dashboard" replace />;
    }
    if (userProfile.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }

    // Check if onboarding is needed
    if (userProfile.role === 'athlete' && !userProfile.onboardingCompleted && !isOnboardingPage) {
      return <Navigate to="/athlete/onboarding" replace />;
    }
  }

  return <>{children}</>;
}
