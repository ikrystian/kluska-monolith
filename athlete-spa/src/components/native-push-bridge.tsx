import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isPushNotificationsEnabled, PUSH_PREFERENCE_CHANGED_EVENT } from '@/lib/app-permissions';
import { startNativePushSession } from '@/lib/push';

/**
 * Keeps native push alive for the whole logged-in session (not only while the
 * profile page is open): token refresh, foreground notifications as an
 * in-app toast, and deep-linking when a notification is tapped.
 */
export function NativePushBridge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.uid;
  // Bumped when the profile toggle switches push on or off, so the session
  // starts (or stops) right away instead of on the next app launch.
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    window.addEventListener(PUSH_PREFERENCE_CHANGED_EVENT, bump);
    return () => window.removeEventListener(PUSH_PREFERENCE_CHANGED_EVENT, bump);
  }, []);

  useEffect(() => {
    if (!userId || !isPushNotificationsEnabled()) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    startNativePushSession({
      onForeground: ({ title, body }) => {
        toast(`${title ? `${title}\n` : ''}${body ?? ''}`.trim(), { icon: '🔔', duration: 6000 });
      },
      onTap: (data) => {
        if (data.url?.startsWith('/')) navigate(data.url);
      },
    }).then((stop) => {
      if (cancelled) stop();
      else cleanup = stop;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [userId, navigate, revision]);

  return null;
}
