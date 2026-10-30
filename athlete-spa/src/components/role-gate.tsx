import { Navigate, Outlet } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';
import type { UserProfile } from '@/lib/types';

/**
 * Layout route guard for screens that only some roles may open. Anyone else
 * lands on the dashboard — the menu already hides these screens from them, so
 * this only catches typed or bookmarked URLs.
 */
export function RequireRole({ roles }: { roles: UserProfile['role'][] }) {
  const { userProfile } = useUserProfile();

  if (!userProfile || !roles.includes(userProfile.role)) {
    return <Navigate to="/athlete/dashboard" replace />;
  }

  return <Outlet />;
}
