import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useUser } from '@/lib/db-hooks';
import { usePet } from '@/hooks/usePet';
import { isPetNotificationsSupported, schedulePetNotifications } from '@/lib/pet-notifications';

/**
 * Trzyma lokalne powiadomienia zwierzaka w zgodzie z jego stanem. Tylko
 * w aplikacji natywnej — w przeglądarce nie pobiera nawet stanu.
 */
export function PetNotificationsBridge() {
  const { user } = useUser();
  const supported = isPetNotificationsSupported();
  const { state } = usePet(supported && Boolean(user));
  const navigate = useNavigate();

  useEffect(() => {
    if (state) void schedulePetNotifications(state);
  }, [state]);

  useEffect(() => {
    if (!supported) return;
    const listener = LocalNotifications.addListener('localNotificationActionPerformed', event => {
      const url = event.notification.extra?.url;
      if (typeof url === 'string' && url.startsWith('/athlete/')) navigate(url);
    });
    return () => {
      void listener.then(handle => handle.remove());
    };
  }, [supported, navigate]);

  return null;
}
