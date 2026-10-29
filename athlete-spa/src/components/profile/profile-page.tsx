'use client';

import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Camera,
  Dumbbell,
  Globe,
  IdCard,
  LineChart,
  LogOut,
  MapPin,
  Pencil,
  UserPen,
  UserPlus,
  Users,
  type LucideIcon,
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
import { SettingsGroup, SettingsLinkRow, tint } from './profile-ui';
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

const QUICK_LINKS: { to: string; label: string; hint: string; icon: LucideIcon; color: string }[] = [
  { to: '/athlete/progress', label: 'Postępy', hint: 'Wykresy i rekordy', icon: LineChart, color: 'hsl(var(--chart-4))' },
  { to: '/athlete/gamification', label: 'Osiągnięcia', hint: 'Odznaki i poziomy', icon: Award, color: 'hsl(var(--chart-5))' },
  { to: '/athlete/social', label: 'Społeczność', hint: 'Znajomi i feed', icon: Users, color: 'hsl(var(--primary))' },
  { to: '/athlete/history', label: 'Historia', hint: 'Wszystkie treningi', icon: Dumbbell, color: 'hsl(var(--volt))' },
];

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
        <Skeleton className="mx-auto h-7 w-12 bg-white/20" />
      ) : (
        <p className="truncate font-headline text-2xl font-extrabold leading-none tabular-nums">
          {value}
          {unit && <span className="ml-0.5 text-xs font-bold text-white/70">{unit}</span>}
        </p>
      )}
      <p className="mt-1.5 truncate text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">{label}</p>
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
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:px-8 md:pt-8">
      {user?.isGuest && (
        <div className="mb-5 flex flex-col gap-3 rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <UserPlus className="h-5 w-5" />
            </span>
            <div className="space-y-0.5">
              <p className="font-semibold">Konto gościa</p>
              <p className="text-sm text-muted-foreground">
                Załóż konto, aby zapisać zmiany na stałe — dotychczasowy progres zostanie przeniesiony.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 rounded-full font-semibold">
            <Link to="/register">Załóż konto</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start md:gap-8">
        {/* Identity column */}
        <div className="space-y-4 md:sticky md:top-6">
          <section className="hero-ember texture-grain relative overflow-hidden rounded-[2rem] p-5 pb-4 text-white shadow-glow">
            <div className="relative flex items-start gap-4">
              <div className="relative shrink-0">
                <Avatar className="h-20 w-20 border-[3px] border-white/80 shadow-lifted">
                  {avatarSrc && <AvatarImage src={avatarSrc} alt="Awatar użytkownika" className="object-cover" />}
                  <AvatarFallback className="bg-black/25 text-xl font-bold text-white">
                    {isLoading ? '' : getInitials(userProfile?.name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => setOpenPanel('avatar')}
                  aria-label="Zmień zdjęcie profilowe"
                  className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-foreground text-background shadow-soft transition-transform active:scale-90"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="min-w-0 flex-1 pt-1">
                {isLoading ? (
                  <>
                    <Skeleton className="h-6 w-36 bg-white/20" />
                    <Skeleton className="mt-2 h-4 w-20 bg-white/20" />
                  </>
                ) : (
                  <>
                    <h1 className="truncate font-headline text-2xl font-extrabold leading-tight tracking-tight">
                      {userProfile?.name || 'Twój profil'}
                    </h1>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                      <span className="rounded-full bg-black/20 px-2.5 py-0.5">
                        {user?.isGuest ? 'Gość' : ROLE_LABELS[userProfile?.role ?? ''] ?? 'Sportowiec'}
                      </span>
                      {userProfile?.location && (
                        <span className="flex min-w-0 items-center gap-1 text-white/85">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{userProfile.location}</span>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setOpenPanel('edit')}
                disabled={!userProfile}
                aria-label="Edytuj profil"
                className="h-9 w-9 shrink-0 rounded-full bg-black/20 text-white hover:bg-black/30 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>

            {socialLinks.length > 0 && (
              <div className="relative mt-4 flex gap-2">
                {socialLinks.map(({ href, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid h-8 w-8 place-items-center rounded-full bg-black/20 transition-colors hover:bg-black/30"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}

            <div className="relative mt-5 grid grid-cols-3 divide-x divide-white/20 rounded-2xl bg-black/20 py-3 backdrop-blur-sm">
              <HeroStat label="Kilometry" value={fmtKm(totalKm)} isLoading={statsLoading} />
              <HeroStat label="Aktywności" value={String(activityCount)} isLoading={statsLoading} />
              <HeroStat label="Siłownie" value={String(favoriteGymsCount)} isLoading={isLoading} />
            </div>
          </section>

          {/* Around-the-equator goal */}
          <section className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <Globe className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Dookoła Ziemi</p>
                <p className="text-xs text-muted-foreground">
                  {earthPercentage >= 100
                    ? 'Okrążono równik! 🎉'
                    : `Zostało ${Math.max(0, EARTH_EQUATOR_KM - totalKm).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} km`}
                </p>
              </div>
              <span className="font-headline text-lg font-extrabold tabular-nums text-sky-600 dark:text-sky-400">
                {earthPercentage.toLocaleString('pl-PL', { maximumFractionDigits: earthPercentage < 10 ? 2 : 1 })}%
              </span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-label="Postęp okrążenia Ziemi"
              aria-valuenow={Math.min(earthPercentage, 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-[width] duration-700"
                style={{ width: `${Math.max(Math.min(earthPercentage, 100), earthPercentage > 0 ? 1.5 : 0)}%` }}
              />
            </div>
          </section>

          {/* Summary entry point */}
          <Link
            to="/athlete/summary"
            className="group flex items-center gap-3 rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-soft transition-transform active:scale-[0.98]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <IdCard className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Twoje podsumowanie</p>
              <p className="text-xs text-muted-foreground">Kilometry, tony, treningi i rekordy</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>

          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_LINKS.map(({ to, label, hint, icon: Icon, color }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col gap-2 rounded-[1.25rem] border border-border/60 bg-card p-3.5 shadow-soft transition-transform active:scale-[0.97]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ backgroundColor: tint(color, 15), color }}>
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Settings column */}
        <div className="space-y-6">
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
            className="h-12 w-full rounded-[1.25rem] border-destructive/30 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
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
