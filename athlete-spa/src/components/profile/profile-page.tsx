'use client';

import { apiFetch, getApiBaseUrl, getStoredToken, resolveMediaUrl } from '@/lib/api-client';
import { lazy, Suspense, useState, useMemo, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Camera, Instagram, Facebook, Twitter, Loader2, Activity, CheckCircle2, XCircle, Footprints, Globe, UserPlus, MapPin, Bell, Music2 } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { Camera as CameraPlugin } from '@capacitor/camera';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { placeholderImages } from '@/lib/placeholder-images';
import { useDoc, useCollection, useUser, useUpdateDoc } from '@/lib/db-hooks';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile, Gym } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ThemeToggle } from '@/components/theme-toggle';
import { Switch } from '@/components/ui/switch';
import { haptic, isHapticsEnabled, isHapticsSupported, setHapticsEnabled } from '@/lib/haptics';
import {
  isBrowserNotificationSupported,
  isLocationSharingEnabled,
  isPushNotificationsEnabled,
  isSpotifyWidgetEnabled,
  isWeeklySummaryEnabled,
  isWorkoutRemindersEnabled,
  setLocationSharingEnabled,
  setPushNotificationsEnabled,
  setSpotifyWidgetEnabled,
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
import { useUserProfile } from '@/contexts/UserProfileContext';
import type { RunningSession, StravaActivity } from '@/lib/types';

// react-image-crop + its CSS only load when the athlete opens the avatar editor.
const AvatarUploadDialog = lazy(() =>
  import('./AvatarUploadDialog').then((m) => ({ default: m.AvatarUploadDialog }))
);

const profileSchema = z.object({
  name: z.string().min(1, 'Imię jest wymagane.'),
  email: z.string().email('Nieprawidłowy adres email.'),
  socialLinks: z.object({
    instagram: z.string().url().or(z.literal('')),
    facebook: z.string().url().or(z.literal('')),
    twitter: z.string().url().or(z.literal('')),
  }).optional(),
  favoriteGymIds: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const avatarImage = placeholderImages.find((img) => img.id === 'avatar-male');
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const hapticsSupported = useMemo(() => isHapticsSupported(), []);
  const [hapticsOn, setHapticsOn] = useState(() => isHapticsEnabled());

  const pushSupported = useMemo(() => isNativePushSupported() || isBrowserNotificationSupported(), []);
  const [locationSharingOn, setLocationSharingOn] = useState(() => isLocationSharingEnabled());
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [pushOn, setPushOn] = useState(() => isPushNotificationsEnabled());
  const [workoutRemindersOn, setWorkoutRemindersOn] = useState(() => isWorkoutRemindersEnabled());
  const [weeklySummaryOn, setWeeklySummaryOn] = useState(() => isWeeklySummaryEnabled());

  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isSpotifyStatusLoading, setIsSpotifyStatusLoading] = useState(true);
  const [isSpotifyDisconnecting, setIsSpotifyDisconnecting] = useState(false);
  const [spotifyWidgetOn, setSpotifyWidgetOn] = useState(() => isSpotifyWidgetEnabled());

  const refetchSpotifyStatus = async () => {
    try {
      const response = await apiFetch('/api/spotify/status');
      if (!response.ok) return;
      const data = await response.json();
      setIsSpotifyConnected(!!data.connected);
    } catch (error) {
      // Network hiccup — leave the last known connected state as-is.
    } finally {
      setIsSpotifyStatusLoading(false);
    }
  };

  useEffect(() => {
    refetchSpotifyStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const { data: userProfile, isLoading: profileLoading, refetch } = useDoc<UserProfile>('users', user?.uid || null);
  const { refetch: refetchProfileContext } = useUserProfile();

  const { data: allGyms, isLoading: gymsLoading } = useCollection<Gym>('gyms');

  // Fetch running sessions and Strava activities
  const { data: runningSessions } = useCollection<RunningSession>(
    user ? 'runningSessions' : null,
    { ownerId: user?.uid }
  );
  const { data: stravaActivities } = useCollection<StravaActivity>(
    user ? 'stravaActivities' : null,
    { ownerId: user?.uid }
  );

  // Calculate total running distance
  const totalRunningKm = useMemo(() => {
    let total = 0;
    // Add manual running sessions
    if (runningSessions) {
      total += runningSessions.reduce((sum, session) => sum + session.distance, 0);
    }
    // Add Strava activities (convert meters to km)
    if (stravaActivities) {
      total += stravaActivities.reduce((sum, activity) => sum + (activity.distance / 1000), 0);
    }
    return total;
  }, [runningSessions, stravaActivities]);

  const EARTH_EQUATOR_KM = 40075;
  const earthPercentage = (totalRunningKm / EARTH_EQUATOR_KM) * 100;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: userProfile?.name || '',
      email: userProfile?.email || '',
      socialLinks: {
        instagram: userProfile?.socialLinks?.instagram || '',
        facebook: userProfile?.socialLinks?.facebook || '',
        twitter: userProfile?.socialLinks?.twitter || '',
      },
      favoriteGymIds: userProfile?.favoriteGymIds || [],
    }
  });

  const isLoading = profileLoading || gymsLoading;
  const { updateDoc } = useUpdateDoc();

  const isStravaConnected = !!userProfile?.stravaAccessToken;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleUrlOpen = async (data: { url: string }) => {
      if (data.url.includes('strava-callback') || data.url.includes('strava_connected')) {
        try {
          await Browser.close();
        } catch {
          // Browser sheet might already be closed
        }
        refetch();
        toast({
          title: 'Sukces!',
          description: 'Połączono z kontem Strava.',
        });
      } else if (data.url.includes('strava_error')) {
        try {
          await Browser.close();
        } catch {
          // Browser sheet might already be closed
        }
        toast({
          title: 'Błąd!',
          description: 'Nie udało się połączyć ze Strava.',
          variant: 'destructive',
        });
      } else if (data.url.includes('spotify-callback') || data.url.includes('spotify_connected')) {
        try {
          await Browser.close();
        } catch {
          // Browser sheet might already be closed
        }
        refetchSpotifyStatus();
        toast({
          title: 'Sukces!',
          description: 'Połączono z kontem Spotify.',
        });
      } else if (data.url.includes('spotify_error')) {
        try {
          await Browser.close();
        } catch {
          // Browser sheet might already be closed
        }
        toast({
          title: 'Błąd!',
          description: 'Nie udało się połączyć ze Spotify.',
          variant: 'destructive',
        });
      }
    };

    const appListenerPromise = App.addListener('appUrlOpen', handleUrlOpen);
    const browserListenerPromise = Browser.addListener('browserFinished', () => {
      refetch();
      refetchSpotifyStatus();
    });

    return () => {
      appListenerPromise.then((l) => l.remove());
      browserListenerPromise.then((l) => l.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch, toast]);

  const handleConnectStrava = async () => {
    const token = getStoredToken();
    const apiBase = getApiBaseUrl();
    if (Capacitor.isNativePlatform()) {
      await Browser.open({
        url: `${apiBase}/api/strava/connect?token=${encodeURIComponent(token ?? '')}&platform=capacitor`,
      });
    } else {
      window.location.href = `${apiBase}/api/strava/connect?token=${encodeURIComponent(token ?? '')}`;
    }
  };

  const handleDisconnectStrava = async () => {
    setIsDisconnecting(true);
    try {
      const response = await apiFetch('/api/strava/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Strava');
      }

      await refetch();
      toast({
        title: 'Sukces!',
        description: 'Strava została odłączona.',
      });
    } catch (error) {
      toast({
        title: 'Błąd!',
        description: 'Nie udało się odłączyć Strava.',
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleConnectSpotify = async () => {
    const token = getStoredToken();
    const apiBase = getApiBaseUrl();
    if (Capacitor.isNativePlatform()) {
      await Browser.open({
        url: `${apiBase}/api/spotify/connect?token=${encodeURIComponent(token ?? '')}&platform=capacitor`,
      });
    } else {
      window.location.href = `${apiBase}/api/spotify/connect?token=${encodeURIComponent(token ?? '')}`;
    }
  };

  const handleDisconnectSpotify = async () => {
    setIsSpotifyDisconnecting(true);
    try {
      const response = await apiFetch('/api/spotify/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Spotify');
      }

      await refetchSpotifyStatus();
      setSpotifyWidgetOn(false);
      setSpotifyWidgetEnabled(false);
      toast({
        title: 'Sukces!',
        description: 'Spotify zostało odłączone.',
      });
    } catch (error) {
      toast({
        title: 'Błąd!',
        description: 'Nie udało się odłączyć Spotify.',
        variant: 'destructive',
      });
    } finally {
      setIsSpotifyDisconnecting(false);
    }
  };

  const handleAvatarUpload = async (url: string) => {
    if (!user || !userProfile) return;
    try {
      await updateDoc('users', user.uid, { ...userProfile, avatarUrl: url });
      refetch();
      refetchProfileContext();
    } catch (error) {
      toast({
        title: 'Błąd!',
        description: 'Nie udało się zapisać avatara.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!userProfile || !user) return;

    const updatedData: UserProfile = {
      ...userProfile,
      ...data
    };

    try {
      await updateDoc('users', user.uid, updatedData);
      toast({
        title: 'Sukces!',
        description: 'Twój profil został zaktualizowany.',
      });
    } catch (error) {
      toast({
        title: 'Błąd!',
        description: 'Nie udało się zaktualizować profilu.',
        variant: 'destructive',
      });
    }
  };

  // The camera switch mirrors the real OS permission (no local preference), so re-read it on mount
  useEffect(() => {
    CameraPlugin.checkPermissions()
      .then((status) => setCameraOn(status.camera === 'granted'))
      .catch(() => undefined);
  }, []);

  const handleCameraToggle = async (checked: boolean) => {
    if (!checked) {
      // An app can't revoke its own OS permission — point the user to system settings
      toast({
        title: 'Wyłączanie dostępu do aparatu',
        description: 'Cofnij uprawnienie aparatu w ustawieniach systemowych: Aplikacje → LeniwaKluska → Uprawnienia.',
      });
      return;
    }
    setIsRequestingCamera(true);
    try {
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
    } catch (error) {
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
    } catch (error) {
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
      } catch (error) {
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
    } catch (error) {
      setPushOn(false);
      setPushNotificationsEnabled(false);
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="container mx-auto max-w-6xl pb-8 space-y-4">
      {user?.isGuest && (
        <div className="mx-4 mt-4 md:mx-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm backdrop-blur-sm dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground">Konto gościa</h4>
                <p className="text-sm text-muted-foreground">
                  Aby zmiany, które będziesz wprowadzał, zostały zapisane na stałe, musisz założyć konto. Twój dotychczasowy progress zostanie zapisany w nowo utworzonym koncie.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0 rounded-xl font-semibold shadow-sm">
              <Link to="/register">Załóż konto</Link>
            </Button>
          </div>
        </div>
      )}
      {/* Cover + avatar hero */}
      <section className="relative">
        <div className="hero-ember texture-grain relative h-32 w-full overflow-hidden rounded-b-3xl shadow-glow md:h-40 md:rounded-3xl" />
        <div className="px-4 md:px-8">
          <div className="-mt-12 flex flex-col items-center text-center md:-mt-14 md:flex-row md:items-end md:gap-5 md:text-left">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lifted md:h-28 md:w-28">
              {userProfile?.avatarUrl ? (
                <AvatarImage src={resolveMediaUrl(userProfile.avatarUrl)} alt="Awatar użytkownika" />
              ) : avatarImage ? (
                <AvatarImage src={avatarImage.imageUrl} alt="Awatar użytkownika" />
              ) : null}
              <AvatarFallback className="text-xl">
                {isLoading ? <Skeleton className="h-full w-full" /> : getInitials(userProfile?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="mt-3 min-w-0 flex-1 md:mb-2 md:mt-0">
              {isLoading ? (
                <>
                  <Skeleton className="mx-auto h-7 w-40 md:mx-0" />
                  <Skeleton className="mx-auto mt-2 h-4 w-24 md:mx-0" />
                </>
              ) : (
                <>
                  <h1 className="truncate font-headline text-2xl font-extrabold tracking-tight">{userProfile?.name}</h1>
                  <p className="text-sm capitalize text-muted-foreground">{userProfile?.role}</p>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 rounded-xl md:mt-0"
              onClick={() => setIsAvatarDialogOpen(true)}
            >
              <Camera className="mr-2 h-4 w-4" />
              Zmień zdjęcie
            </Button>
            {isAvatarDialogOpen && (
              <Suspense fallback={null}>
                <AvatarUploadDialog
                  open={isAvatarDialogOpen}
                  onOpenChange={setIsAvatarDialogOpen}
                  onUploadComplete={handleAvatarUpload}
                  currentAvatarUrl={resolveMediaUrl(userProfile?.avatarUrl)}
                />
              </Suspense>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 px-1 pt-6 md:grid-cols-3 md:gap-8 md:px-8">
        <div className="md:col-span-1">
          {/* Running Statistics Card */}
          <Card className="overflow-hidden border-sky-500/20 bg-sky-500/[0.03]">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <Footprints className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Statystyki Biegowe</h3>
                  <p className="text-xs text-muted-foreground">Łącznie przebiegli</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline text-4xl font-extrabold tabular-nums text-sky-600 dark:text-sky-400">{totalRunningKm.toFixed(2)}</span>
                    <span className="text-lg font-semibold text-muted-foreground">km</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      <span className="text-muted-foreground">Szerokość Ziemi na równiku</span>
                    </div>
                    <span className="font-medium">{EARTH_EQUATOR_KM.toLocaleString()} km</span>
                  </div>

                  <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(earthPercentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{earthPercentage.toFixed(2)}% szerokości Ziemi</span>
                    {earthPercentage >= 100 && (
                      <span className="text-green-600 font-semibold">🎉 Okrążono Ziemię!</span>
                    )}
                    {earthPercentage < 100 && (
                      <span>Pozostało: {(EARTH_EQUATOR_KM - totalRunningKm).toFixed(0)} km</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">Informacje o Koncie</CardTitle>
                  <CardDescription>
                    Zaktualizuj swoje dane osobowe i ustawienia.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <div className="space-y-6">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Imię i Nazwisko</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Adres Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <div className="space-y-4 pt-4">
                    <h3 className="font-semibold">Media Społecznościowe</h3>
                    {isLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <>
                        <FormField
                          control={form.control}
                          name="socialLinks.instagram"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Instagram className="h-4 w-4" /> Instagram
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="https://instagram.com/twojprofil" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="socialLinks.facebook"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Facebook className="h-4 w-4" /> Facebook
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="https://facebook.com/twojprofil" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="socialLinks.twitter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Twitter className="h-4 w-4" /> Twitter / X
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="https://x.com/twojprofil" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Activity className="h-5 w-5 text-[#FC4C02]" />
                      Integracja Strava
                    </h3>
                    {isLoading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : isStravaConnected ? (
                      <div className="rounded-xl border bg-muted/50 p-4">
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500" />
                            <div>
                              <p className="font-medium">Połączono ze Strava</p>
                              <p className="text-sm text-muted-foreground">
                                Twoje aktywności biegowe są synchronizowane
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full rounded-lg sm:w-auto"
                            onClick={handleDisconnectStrava}
                            disabled={isDisconnecting}
                          >
                            {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Odłącz
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border p-4">
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                          <div className="flex items-center gap-3">
                            <XCircle className="h-6 w-6 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Nie połączono</p>
                              <p className="text-sm text-muted-foreground">
                                Połącz ze Strava, aby automatycznie importować swoje biegi
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="w-full rounded-lg bg-[#FC4C02] text-white hover:bg-[#E34402] sm:w-auto"
                            onClick={handleConnectStrava}
                          >
                            <Activity className="mr-2 h-4 w-4" />
                            Połącz ze Strava
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Music2 className="h-5 w-5 text-[#1DB954]" />
                      Integracja Spotify
                    </h3>
                    {isSpotifyStatusLoading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : isSpotifyConnected ? (
                      <div className="rounded-xl border bg-muted/50 p-4">
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500" />
                            <div>
                              <p className="font-medium">Połączono ze Spotify</p>
                              <p className="text-sm text-muted-foreground">
                                Możesz sterować odtwarzaniem podczas treningu
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full rounded-lg sm:w-auto"
                            onClick={handleDisconnectSpotify}
                            disabled={isSpotifyDisconnecting}
                          >
                            {isSpotifyDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Odłącz
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border p-4">
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                          <div className="flex items-center gap-3">
                            <XCircle className="h-6 w-6 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Nie połączono</p>
                              <p className="text-sm text-muted-foreground">
                                Połącz ze Spotify, aby sterować muzyką podczas śledzenia treningu
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="w-full rounded-lg bg-[#1DB954] text-white hover:bg-[#1aa34a] sm:w-auto"
                            onClick={handleConnectSpotify}
                          >
                            <Music2 className="mr-2 h-4 w-4" />
                            Połącz ze Spotify
                          </Button>
                        </div>
                      </div>
                    )}
                    {isSpotifyConnected && (
                      <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                        <div className="min-w-0">
                          <FormLabel htmlFor="spotify-widget">Widget Spotify podczas treningu</FormLabel>
                          <p className="text-sm text-muted-foreground">Pokazuj kontrolki odtwarzania na ekranie treningu (/athlete/log).</p>
                        </div>
                        <Switch
                          id="spotify-widget"
                          checked={spotifyWidgetOn}
                          onCheckedChange={(checked) => {
                            setSpotifyWidgetOn(checked);
                            setSpotifyWidgetEnabled(checked);
                          }}
                          className="shrink-0"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4">
                    <h3 className="font-semibold">Ulubione Siłownie</h3>
                    <FormField
                      control={form.control}
                      name="favoriteGymIds"
                      render={() => (
                        <FormItem>
                          <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border p-4">
                            {isLoading && <p>Ładowanie siłowni...</p>}
                            {allGyms?.map((gym) => (
                              <FormField
                                key={gym.id}
                                control={form.control}
                                name="favoriteGymIds"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={gym.id}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(gym.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), gym.id])
                                              : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== gym.id
                                                )
                                              )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {gym.name}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                            {!isLoading && allGyms?.length === 0 && <p className="text-sm text-muted-foreground">Brak siłowni do wyboru.</p>}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormLabel>Motyw</FormLabel>
                    <ThemeToggle />
                  </div>

                  {hapticsSupported && (
                    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                      <div className="min-w-0">
                        <FormLabel htmlFor="haptics">Wibracje</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Krótka wibracja przy zatwierdzaniu serii i końcu przerwy.
                        </p>
                      </div>
                      <Switch
                        id="haptics"
                        checked={hapticsOn}
                        onCheckedChange={(checked) => {
                          setHapticsEnabled(checked);
                          setHapticsOn(checked);
                          if (checked) haptic('impact');
                        }}
                        className="shrink-0"
                      />
                    </div>
                  )}

                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="font-semibold flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-sky-500" />
                      Udostępnianie Lokalizacji
                    </h3>
                    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                      <div className="min-w-0">
                        <FormLabel htmlFor="location-sharing">Lokalizacja GPS</FormLabel>
                        <p className="text-sm text-muted-foreground">Wymagane do śledzenia tras biegowych na żywo w module Bieganie.</p>
                      </div>
                      <Switch
                        id="location-sharing"
                        checked={locationSharingOn}
                        disabled={isRequestingLocation}
                        onCheckedChange={handleLocationSharingToggle}
                        className="shrink-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Camera className="h-5 w-5 text-sky-500" />
                      Dostęp do Aparatu
                    </h3>
                    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                      <div className="min-w-0">
                        <FormLabel htmlFor="camera-access">Aparat</FormLabel>
                        <p className="text-sm text-muted-foreground">Wymagany do skanowania kodów kreskowych i QR produktów w dzienniku kalorii.</p>
                      </div>
                      <Switch
                        id="camera-access"
                        checked={cameraOn}
                        disabled={isRequestingCamera}
                        onCheckedChange={handleCameraToggle}
                        className="shrink-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Bell className="h-5 w-5 text-sky-500" />
                      Ustawienia Powiadomień
                    </h3>
                    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                      <div className="min-w-0">
                        <FormLabel htmlFor="push-notifications">Powiadomienia push</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          {pushSupported ? 'Zezwól aplikacji na wysyłanie powiadomień.' : 'Niedostępne na tym urządzeniu/przeglądarce.'}
                        </p>
                      </div>
                      <Switch
                        id="push-notifications"
                        checked={pushOn}
                        disabled={!pushSupported}
                        onCheckedChange={handlePushToggle}
                        className="shrink-0"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                      <div className="min-w-0">
                        <FormLabel htmlFor="workout-reminders">Przypomnienia o treningu</FormLabel>
                        <p className="text-sm text-muted-foreground">Otrzymuj powiadomienia przed zaplanowanymi treningami.</p>
                      </div>
                      <Switch
                        id="workout-reminders"
                        checked={workoutRemindersOn}
                        disabled={!pushOn}
                        onCheckedChange={(checked) => {
                          setWorkoutRemindersOn(checked);
                          setWorkoutRemindersEnabled(checked);
                        }}
                        className="shrink-0"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                      <div className="min-w-0">
                        <FormLabel htmlFor="weekly-summary">Tygodniowe podsumowanie</FormLabel>
                        <p className="text-sm text-muted-foreground">Otrzymuj podsumowanie swoich postępów co tydzień.</p>
                      </div>
                      <Switch
                        id="weekly-summary"
                        checked={weeklySummaryOn}
                        disabled={!pushOn}
                        onCheckedChange={(checked) => {
                          setWeeklySummaryOn(checked);
                          setWeeklySummaryEnabled(checked);
                        }}
                        className="shrink-0"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" className="w-full rounded-xl sm:w-auto" disabled={form.formState.isSubmitting || isLoading}>
                      {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Zapisz Zmiany
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

