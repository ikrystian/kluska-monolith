import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Camera as CameraPlugin } from '@capacitor/camera';
import { useTheme } from 'next-themes';
import { Bell, CalendarClock, Camera, MapPin, Monitor, Moon, Palette, Sun, TrendingUp, Vibrate } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { haptic, isHapticsEnabled, isHapticsSupported, setHapticsEnabled } from '@/lib/haptics';
import {
  isBrowserNotificationSupported,
  isLocationSharingEnabled,
  isPushNotificationsEnabled,
  isWeeklySummaryEnabled,
  isWorkoutRemindersEnabled,
  setLocationSharingEnabled,
  setPushNotificationsEnabled,
  setWeeklySummaryEnabled,
  setWorkoutRemindersEnabled,
} from '@/lib/app-permissions';
import {
  isNativePushSupported,
  isPushSupported,
  subscribeToNativePush,
  subscribeToPush,
  unsubscribeFromNativePush,
  unsubscribeFromPush,
} from '@/lib/push';
import { SettingsGroup, SettingsRow, tint } from './profile-ui';

const THEME_OPTIONS = [
  { id: 'light', label: 'Jasny', icon: Sun },
  { id: 'dark', label: 'Ciemny', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
] as const;

const C = {
  theme: 'hsl(var(--chart-4))',
  haptics: 'hsl(var(--primary))',
  location: '#0EA5E9',
  camera: '#8B5CF6',
  notify: 'hsl(var(--chart-5))',
};

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="px-4 py-3.5">
      <div className="mb-3 flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{ backgroundColor: tint(C.theme, 15), color: C.theme }}
        >
          <Palette className="h-[18px] w-[18px]" />
        </span>
        <p className="text-sm font-semibold">Motyw</p>
      </div>
      <div role="radiogroup" aria-label="Motyw aplikacji" className="grid grid-cols-3 gap-1 rounded-full bg-secondary/70 p-1">
        {THEME_OPTIONS.map(({ id, label, icon: Icon }) => {
          const active = (theme ?? 'system') === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(id)}
              className={cn(
                'flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-all',
                active ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AppSettingsSections() {
  const { toast } = useToast();
  const hapticsSupported = useMemo(() => isHapticsSupported(), []);
  const pushSupported = useMemo(() => isNativePushSupported() || isBrowserNotificationSupported(), []);
  const [hapticsOn, setHapticsOn] = useState(() => isHapticsEnabled());
  const [locationSharingOn, setLocationSharingOn] = useState(() => isLocationSharingEnabled());
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [pushOn, setPushOn] = useState(() => isPushNotificationsEnabled());
  const [workoutRemindersOn, setWorkoutRemindersOn] = useState(() => isWorkoutRemindersEnabled());
  const [weeklySummaryOn, setWeeklySummaryOn] = useState(() => isWeeklySummaryEnabled());

  // Keeps the server-side subscription in sync with a previously-granted
  // preference — covers a fresh app restart or the push subscription having
  // expired, both of which should resubscribe silently without re-prompting
  // (permission is already granted at this point, so neither call below
  // shows the user anything).
  useEffect(() => {
    if (!pushOn) return;
    const resubscribe = isNativePushSupported() ? subscribeToNativePush() : isPushSupported() ? subscribeToPush() : Promise.resolve(false);
    resubscribe.then((subscribed) => {
      if (!subscribed) {
        setPushOn(false);
        setPushNotificationsEnabled(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The camera switch mirrors the real OS permission (no local preference), so re-read it on mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CameraPlugin.checkPermissions()
        .then((status) => setCameraOn(status.camera === 'granted'))
        .catch(() => undefined);
    } else if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((status) => {
          setCameraOn(status.state === 'granted');
          status.onchange = () => setCameraOn(status.state === 'granted');
        })
        .catch(() => undefined);
    }
  }, []);

  const handleCameraToggle = async (checked: boolean) => {
    if (!checked) {
      // An app can't revoke its own OS permission — point the user to system settings
      toast({
        title: 'Wyłączanie dostępu do aparatu',
        description: Capacitor.isNativePlatform()
          ? 'Cofnij uprawnienie aparatu w ustawieniach systemowych: Aplikacje → LeniwaKluska → Uprawnienia.'
          : 'Cofnij uprawnienie aparatu w ustawieniach przeglądarki (ikona kłódki/ustawień strony przy pasku adresu).',
      });
      return;
    }
    setIsRequestingCamera(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await CameraPlugin.requestPermissions({ permissions: ['camera'] });
        const granted = status.camera === 'granted';
        setCameraOn(granted);
        if (!granted) {
          toast({
            title: 'Brak dostępu do aparatu',
            description: 'Włącz uprawnienie aparatu dla aplikacji w ustawieniach systemowych, aby skanować kody produktów.',
            variant: 'destructive',
          });
        }
      } else {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia not supported in this environment');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        setCameraOn(true);
      }
    } catch {
      setCameraOn(false);
      toast({
        title: 'Błąd!',
        description: 'Nie udało się poprosić o dostęp do aparatu.',
        variant: 'destructive',
      });
    } finally {
      setIsRequestingCamera(false);
    }
  };

  const handleLocationSharingToggle = async (checked: boolean) => {
    if (!checked) {
      setLocationSharingOn(false);
      setLocationSharingEnabled(false);
      return;
    }
    setIsRequestingLocation(true);
    try {
      const status = await Geolocation.requestPermissions();
      const granted = status.location === 'granted' || status.coarseLocation === 'granted';
      setLocationSharingOn(granted);
      setLocationSharingEnabled(granted);
      if (!granted) {
        toast({
          title: 'Brak dostępu do lokalizacji',
          description: 'Włącz uprawnienie lokalizacji dla aplikacji w ustawieniach systemowych, aby śledzić trasy biegowe GPS.',
          variant: 'destructive',
        });
      }
    } catch {
      setLocationSharingOn(false);
      setLocationSharingEnabled(false);
      toast({
        title: 'Błąd!',
        description: 'Nie udało się poprosić o dostęp do lokalizacji.',
        variant: 'destructive',
      });
    } finally {
      setIsRequestingLocation(false);
    }
  };

  const handlePushToggle = async (checked: boolean) => {
    if (!checked) {
      setPushOn(false);
      setPushNotificationsEnabled(false);
      if (isNativePushSupported()) void unsubscribeFromNativePush();
      else void unsubscribeFromPush();
      return;
    }
    if (!pushSupported) {
      toast({
        title: 'Niedostępne',
        description: 'Ta przeglądarka/urządzenie nie obsługuje powiadomień.',
        variant: 'destructive',
      });
      return;
    }

    // Inside the Capacitor app, the real OS permission dialog (and FCM/APNs
    // registration) has to go through the native plugin — the in-page
    // `Notification` API below doesn't reflect the actual system permission
    // there and can't deliver anything once the WebView isn't running.
    if (isNativePushSupported()) {
      try {
        const subscribed = await subscribeToNativePush();
        setPushOn(subscribed);
        setPushNotificationsEnabled(subscribed);
        if (!subscribed) {
          toast({
            title: 'Brak zgody na powiadomienia',
            description: 'Włącz powiadomienia dla aplikacji w ustawieniach systemowych telefonu.',
            variant: 'destructive',
          });
        }
      } catch {
        setPushOn(false);
        setPushNotificationsEnabled(false);
      }
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushOn(false);
        setPushNotificationsEnabled(false);
        toast({
          title: 'Brak zgody na powiadomienia',
          description: 'Włącz powiadomienia dla aplikacji w ustawieniach systemowych.',
          variant: 'destructive',
        });
        return;
      }

      const subscribed = isPushSupported() ? await subscribeToPush() : false;
      setPushOn(subscribed);
      setPushNotificationsEnabled(subscribed);
      if (!subscribed) {
        toast({
          title: 'Nie udało się aktywować powiadomień',
          description: 'Ta przeglądarka nie obsługuje subskrypcji push.',
          variant: 'destructive',
        });
      }
    } catch {
      setPushOn(false);
      setPushNotificationsEnabled(false);
    }
  };

  return (
    <>
      <SettingsGroup title="Aplikacja">
        <ThemePicker />
        {hapticsSupported && (
          <SettingsRow
            icon={Vibrate}
            color={C.haptics}
            htmlFor="haptics"
            title="Wibracje"
            description="Przy zatwierdzaniu serii i końcu przerwy."
            control={
              <Switch
                id="haptics"
                checked={hapticsOn}
                onCheckedChange={(checked) => {
                  setHapticsEnabled(checked);
                  setHapticsOn(checked);
                  if (checked) haptic('impact');
                }}
              />
            }
          />
        )}
      </SettingsGroup>

      <SettingsGroup title="Powiadomienia">
        <SettingsRow
          icon={Bell}
          color={C.notify}
          htmlFor="push-notifications"
          title="Powiadomienia push"
          description={pushSupported ? 'Zezwól aplikacji na wysyłanie powiadomień.' : 'Niedostępne na tym urządzeniu.'}
          disabled={!pushSupported}
          control={
            <Switch id="push-notifications" checked={pushOn} disabled={!pushSupported} onCheckedChange={handlePushToggle} />
          }
        />
        <SettingsRow
          icon={CalendarClock}
          color={C.notify}
          htmlFor="workout-reminders"
          title="Przypomnienia o treningu"
          description="Przed zaplanowanymi treningami."
          disabled={!pushOn}
          control={
            <Switch
              id="workout-reminders"
              checked={workoutRemindersOn}
              disabled={!pushOn}
              onCheckedChange={(checked) => {
                setWorkoutRemindersOn(checked);
                setWorkoutRemindersEnabled(checked);
              }}
            />
          }
        />
        <SettingsRow
          icon={TrendingUp}
          color={C.notify}
          htmlFor="weekly-summary"
          title="Tygodniowe podsumowanie"
          description="Twoje postępy raz w tygodniu."
          disabled={!pushOn}
          control={
            <Switch
              id="weekly-summary"
              checked={weeklySummaryOn}
              disabled={!pushOn}
              onCheckedChange={(checked) => {
                setWeeklySummaryOn(checked);
                setWeeklySummaryEnabled(checked);
              }}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Uprawnienia">
        <SettingsRow
          icon={MapPin}
          color={C.location}
          htmlFor="location-sharing"
          title="Lokalizacja GPS"
          description="Do śledzenia tras biegowych na żywo."
          control={
            <Switch
              id="location-sharing"
              checked={locationSharingOn}
              disabled={isRequestingLocation}
              onCheckedChange={handleLocationSharingToggle}
            />
          }
        />
        <SettingsRow
          icon={Camera}
          color={C.camera}
          htmlFor="camera-access"
          title="Aparat"
          description="Do skanowania kodów produktów w dzienniku kalorii."
          control={
            <Switch id="camera-access" checked={cameraOn} disabled={isRequestingCamera} onCheckedChange={handleCameraToggle} />
          }
        />
      </SettingsGroup>
    </>
  );
}
