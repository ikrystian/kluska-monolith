'use client';

import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  Dumbbell,
  LogOut,
  MapPin,
  Pencil,
  UserPen,
  UserPlus,
} from 'lucide-react';
import { Facebook, Instagram, Twitter } from '@/components/ui/social-icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { resolveMediaUrl } from '@/lib/api-client';
import { placeholderImages } from '@/lib/placeholder-images';
import { useCollection, useDoc, useUpdateDoc, useUser } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import type { RunningSession, StravaActivity, UserProfile } from '@/lib/types';
import { SettingsGroup, SettingsLinkRow } from './profile-ui';
import { IntegrationsSection } from './IntegrationsSection';
import { AppSettingsSections } from './AppSettingsSections';

// Editors (react-image-crop, zod form, gyms list) only load when the athlete opens them.
const AvatarUploadDialog = lazy(() =>
  import('./AvatarUploadDialog').then((m) => ({ default: m.AvatarUploadDialog }))
);
const ProfileEditSheet = lazy(() =>
  import('./ProfileEditSheet').then((m) => ({ default: m.ProfileEditSheet }))
);
const FavoriteGymsSheet = lazy(() =>
  import('./FavoriteGymsSheet').then((m) => ({ default: m.FavoriteGymsSheet }))
);

const EARTH_EQUATOR_KM = 40075;

const ROLE_LABELS: Record<string, string> = {
  athlete: 'Sportowiec',
  trainer: 'Trener',
  admin: 'Administrator',
};

const getInitials = (name: string | undefined) =>
  name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

const fmtKm = (km: number) =>
  km.toLocaleString('pl-PL', { minimumFractionDigits: km < 100 ? 1 : 0, maximumFractionDigits: km < 100 ? 1 : 0 });

function HeroStat({ label, value, unit, isLoading }: { label: string; value: string; unit?: string; isLoading: boolean }) {
  return (
    <div className="min-w-0 px-2 text-center">
      {isLoading ? (
        <Skeleton className="mx-auto h-7 w-12" />
      ) : (
        <p className="truncate font-display text-[1.75rem] font-bold leading-none tabular-nums">
          {value}
          {unit && <span className="ml-0.5 font-body text-xs font-semibold text-muted-foreground">{unit}</span>}
        </p>
      )}
      <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function ProfilePage() {
  const { toast } = useToast();
  const { user } = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { updateDoc } = useUpdateDoc();
  const { refetch: refetchProfileContext } = useUserProfile();
  const fallbackAvatar = placeholderImages.find((img) => img.id === 'avatar-male');

  const [openPanel, setOpenPanel] = useState<'avatar' | 'edit' | 'gyms' | null>(null);
  const [guestLogoutOpen, setGuestLogoutOpen] = useState(false);
  const closePanel = (open: boolean) => !open && setOpenPanel(null);

  const { data: userProfile, isLoading, refetch } = useDoc<UserProfile>('users', user?.uid || null);

  const { data: runningSessions, isLoading: runsLoading } = useCollection<RunningSession>(
    user ? 'runningSessions' : null,
    { ownerId: user?.uid }
  );
  const { data: stravaActivities, isLoading: stravaLoading } = useCollection<StravaActivity>(
    user ? 'stravaActivities' : null,
    { ownerId: user?.uid }
  );

  const { totalKm, activityCount } = useMemo(() => {
    const manualKm = (runningSessions ?? []).reduce((sum, s) => sum + (s.distance || 0), 0);
    const stravaKm = (stravaActivities ?? []).reduce((sum, a) => sum + (a.distance || 0) / 1000, 0);
    return {
      totalKm: manualKm + stravaKm,
      activityCount: (runningSessions?.length ?? 0) + (stravaActivities?.length ?? 0),
    };
  }, [runningSessions, stravaActivities]);

  const statsLoading = (runsLoading && !runningSessions) || (stravaLoading && !stravaActivities);
  const earthPercentage = (totalKm / EARTH_EQUATOR_KM) * 100;
  const favoriteGymsCount = userProfile?.favoriteGymIds?.length ?? 0;

  const socialLinks = [
    { href: userProfile?.socialLinks?.instagram, icon: Instagram, label: 'Instagram' },
    { href: userProfile?.socialLinks?.facebook, icon: Facebook, label: 'Facebook' },
    { href: userProfile?.socialLinks?.twitter, icon: Twitter, label: 'Twitter / X' },
  ].filter((l): l is { href: string; icon: typeof Instagram; label: string } => Boolean(l.href));

  const handleProfileSaved = () => {
    refetch();
    refetchProfileContext();
  };

  const handleAvatarUpload = async (url: string) => {
    if (!user || !userProfile) return;
    try {
      await updateDoc('users', user.uid, { ...userProfile, avatarUrl: url });
      handleProfileSaved();
    } catch {
      toast({ title: 'Błąd!', description: 'Nie udało się zapisać avatara.', variant: 'destructive' });
    }
  };

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLogout = () => {
    haptic('impact');
    if (user?.isGuest) {
      setGuestLogoutOpen(true);
      return;
    }
    doLogout();
  };

  const avatarSrc = userProfile?.avatarUrl ? resolveMediaUrl(userProfile.avatarUrl) : fallbackAvatar?.imageUrl;

  return (
    <div className="page">
      {user?.isGuest && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-food/20 text-food">
              <UserPlus className="h-5 w-5" />
            </span>
            <div className="space-y-0.5">
              <p className="font-semibold">Konto gościa</p>
              <p className="text-sm text-muted-foreground">
                Załóż konto, aby zapisać zmiany na stałe — dotychczasowy progres zostanie przeniesiony.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 font-semibold">
            <Link to="/register">Załóż konto</Link>
          </Button>
        </div>
      )}

      <div className="space-y-5">
        <section className="rounded-2xl bg-card p-4">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <Avatar className="h-[4.5rem] w-[4.5rem]">
                {avatarSrc && <AvatarImage src={avatarSrc} alt="Awatar użytkownika" className="object-cover" />}
                <AvatarFallback className="text-xl font-bold">{isLoading ? '' : getInitials(userProfile?.name)}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => setOpenPanel('avatar')}
                aria-label="Zmień zdjęcie profilowe"
                className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-foreground text-background ring-2 ring-card transition-transform active:scale-90"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              {isLoading ? (
                <>
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="mt-2 h-4 w-20" />
                </>
              ) : (
                <>
                  <h1 className="truncate text-xl font-bold leading-tight">{userProfile?.name || 'Twój profil'}</h1>
                  <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                    <span>{user?.isGuest ? 'Gość' : ROLE_LABELS[userProfile?.role ?? ''] ?? 'Sportowiec'}</span>
                    {userProfile?.location && (
                      <>
                        <span aria-hidden>·</span>
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{userProfile.location}</span>
                      </>
                    )}
                  </p>
                </>
              )}
            </div>

            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => setOpenPanel('edit')}
              disabled={!userProfile}
              aria-label="Edytuj profil"
              className="shrink-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>

          {socialLinks.length > 0 && (
            <div className="mt-3 flex gap-2">
              {socialLinks.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-full bg-secondary transition-transform active:scale-90"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 divide-x divide-border/50 border-t border-border/50 pt-3.5">
            <HeroStat label="Kilometry" value={fmtKm(totalKm)} isLoading={statsLoading} />
            <HeroStat label="Aktywności" value={String(activityCount)} isLoading={statsLoading} />
            <HeroStat label="Siłownie" value={String(favoriteGymsCount)} isLoading={isLoading} />
          </div>
        </section>

        {/* Around-the-equator goal */}
        <section className="rounded-2xl bg-card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[15px] font-semibold">Dookoła Ziemi</p>
            <span className="font-display text-[1.625rem] font-bold leading-none tabular-nums">
              {earthPercentage.toLocaleString('pl-PL', { maximumFractionDigits: earthPercentage < 10 ? 2 : 1 })}%
            </span>
          </div>
          <div
            className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label="Postęp okrążenia Ziemi"
            aria-valuenow={Math.min(earthPercentage, 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-run transition-[width] duration-700"
              style={{ width: `${Math.max(Math.min(earthPercentage, 100), earthPercentage > 0 ? 1.5 : 0)}%` }}
            />
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {earthPercentage >= 100
              ? 'Okrążono równik!'
              : `Do okrążenia równika zostało ${Math.max(0, EARTH_EQUATOR_KM - totalKm).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} km`}
          </p>
        </section>

        <div className="space-y-5">
          <SettingsGroup title="Konto">
            <SettingsLinkRow
              icon={UserPen}
              color="hsl(var(--primary))"
              title="Dane profilu"
              description={userProfile?.email || 'Imię, email, miasto, social media'}
              onClick={() => userProfile && setOpenPanel('edit')}
            />
            <SettingsLinkRow
              icon={Dumbbell}
              color="hsl(var(--volt))"
              title="Ulubione siłownie"
              description="Miejsca, w których trenujesz"
              value={isLoading ? undefined : favoriteGymsCount || 'Brak'}
              onClick={() => userProfile && setOpenPanel('gyms')}
            />
          </SettingsGroup>

          <IntegrationsSection
            isStravaConnected={!!userProfile?.stravaConnected}
            isProfileLoading={isLoading}
            onStravaChanged={refetch}
          />

          <AppSettingsSections />

          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="w-full border-destructive/30 text-destructive active:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Wyloguj się
          </Button>
        </div>
      </div>

      <Suspense fallback={null}>
        {openPanel === 'avatar' && (
          <AvatarUploadDialog
            open
            onOpenChange={closePanel}
            onUploadComplete={handleAvatarUpload}
            currentAvatarUrl={resolveMediaUrl(userProfile?.avatarUrl)}
          />
        )}
        {openPanel === 'edit' && userProfile && (
          <ProfileEditSheet open onOpenChange={closePanel} userProfile={userProfile} onSaved={handleProfileSaved} />
        )}
        {openPanel === 'gyms' && userProfile && (
          <FavoriteGymsSheet open onOpenChange={closePanel} userProfile={userProfile} onSaved={handleProfileSaved} />
        )}
      </Suspense>

      <AlertDialog open={guestLogoutOpen} onOpenChange={setGuestLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wylogować konto gościa?</AlertDialogTitle>
            <AlertDialogDescription>
              Twoje dane są przechowywane wyłącznie na tym urządzeniu. Po wylogowaniu zostaną trwale usunięte.
              Załóż konto, aby je zachować.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={doLogout} className={buttonVariants({ variant: 'destructive' })}>
              Rozumiem, wyloguj mnie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
