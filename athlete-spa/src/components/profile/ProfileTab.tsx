import { useMemo, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { startOfMonth } from 'date-fns';
import { Camera, ChevronRight, Coins, Dumbbell, Flame, MapPin, Medal, Pencil, UserPen, UserPlus } from 'lucide-react';
import { Facebook, Instagram, Twitter } from '@/components/ui/social-icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useGamificationProfile } from '@/hooks/useGamification';
import { useCollection, useUser } from '@/lib/db-hooks';
import { resolveMediaUrl } from '@/lib/api-client';
import { placeholderImages } from '@/lib/placeholder-images';
import { haptic } from '@/lib/haptics';
import { pluralForm } from '@/lib/plural';
import type { RunningSession, StravaActivity, WorkoutLog } from '@/lib/types';
import { SettingsGroup, SettingsLinkRow, tint } from './profile-ui';

const EARTH_EQUATOR_KM = 40075;

const ROLE_LABELS: Record<string, string> = {
  athlete: 'Sportowiec',
  trainer: 'Trener',
  admin: 'Administrator',
};

const getInitials = (name: string | null | undefined) =>
  name
    ? name
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

const fmtKm = (km: number) =>
  km.toLocaleString('pl-PL', { minimumFractionDigits: km < 100 ? 1 : 0, maximumFractionDigits: km < 100 ? 1 : 0 });

/** Calendar day of an ISO date, or null when it doesn't parse. */
const dayKey = (iso: string | Date | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toDateString();
};

const isSince = (iso: string | Date | undefined, since: Date) => {
  if (!iso) return false;
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && date >= since;
};

/** One of the three gamification counters under the XP bar. */
function Counter({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ backgroundColor: tint(color, 16), color }}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg font-bold leading-none tabular-nums">{value}</span>
        <span className="block truncate text-[11px] leading-tight text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

/** One number in a stat strip. */
function Stat({ value, unit, label, isLoading }: { value: string | number; unit?: string; label: string; isLoading?: boolean }) {
  return (
    <div className="min-w-0">
      {isLoading ? (
        <Skeleton className="h-7 w-12" />
      ) : (
        <p className="truncate font-display text-[1.75rem] font-bold leading-none tabular-nums">
          {value}
          {unit && <span className="ml-0.5 font-body text-sm font-semibold leading-none text-muted-foreground">{unit}</span>}
        </p>
      )}
      <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * "Ty" → Profil: who you are, how the month is going, the all-time totals,
 * and the rows that edit what other people see.
 */
export function ProfileTab({
  onEditProfile,
  onEditAvatar,
  onEditGyms,
}: {
  onEditProfile: () => void;
  onEditAvatar: () => void;
  onEditGyms: () => void;
}) {
  const { user } = useUser();
  const { userProfile, isLoading } = useUserProfile();
  const { stats, isLoading: statsLoading } = useGamificationProfile();
  const fallbackAvatar = placeholderImages.find(img => img.id === 'avatar-male');

  const monthStart = useMemo(() => startOfMonth(new Date()), []);

  const { data: monthWorkouts } = useCollection<WorkoutLog>(
    user ? 'workoutLogs' : null,
    { athleteId: user?.uid, status: 'completed', endTime: { $gte: monthStart.toISOString() } }
  );
  // All-time runs feed both the totals and this month's numbers, so one query each is enough.
  const { data: runningSessions, isLoading: runsLoading } = useCollection<RunningSession>(
    user ? 'runningSessions' : null,
    { ownerId: user?.uid }
  );
  const { data: stravaActivities, isLoading: stravaLoading } = useCollection<StravaActivity>(
    user ? 'stravaActivities' : null,
    { ownerId: user?.uid }
  );

  const runsReady = !((runsLoading && !runningSessions) || (stravaLoading && !stravaActivities));

  const totals = useMemo(() => {
    const runs = runningSessions ?? [];
    const strava = stravaActivities ?? [];
    const runKm = (run: RunningSession) => run.distance || 0;
    const stravaKm = (activity: StravaActivity) => (activity.distance || 0) / 1000;

    const monthRuns = runs.filter(run => isSince(run.date, monthStart));
    const monthStrava = strava.filter(activity => isSince(activity.date, monthStart));

    return {
      totalKm: runs.reduce((sum, run) => sum + runKm(run), 0) + strava.reduce((sum, a) => sum + stravaKm(a), 0),
      activityCount: runs.length + strava.length,
      monthKm: monthRuns.reduce((sum, run) => sum + runKm(run), 0) + monthStrava.reduce((sum, a) => sum + stravaKm(a), 0),
      monthRunDates: [...monthRuns.map(run => run.date), ...monthStrava.map(a => a.date)],
    };
  }, [runningSessions, stravaActivities, monthStart]);

  /** Days this month with any workout or run: steadiness, which a raw count hides. */
  const activeDays = useMemo(() => {
    if (!monthWorkouts || !runsReady) return undefined;
    const days = new Set<string>();
    for (const workout of monthWorkouts) {
      const key = dayKey(workout.endTime);
      if (key) days.add(key);
    }
    for (const date of totals.monthRunDates) {
      const key = dayKey(date);
      if (key) days.add(key);
    }
    return days.size;
  }, [monthWorkouts, runsReady, totals.monthRunDates]);

  const xpPercent = stats && stats.xpForNextLevel > 0 ? Math.min(100, (stats.currentXP / stats.xpForNextLevel) * 100) : 0;
  const streak = stats?.streaks.workout ?? 0;
  const earthPercentage = (totals.totalKm / EARTH_EQUATOR_KM) * 100;
  const favoriteGymsCount = userProfile?.favoriteGymIds?.length ?? 0;
  const avatarSrc = userProfile?.avatarUrl ? resolveMediaUrl(userProfile.avatarUrl) : fallbackAvatar?.imageUrl;

  const socialLinks = [
    { href: userProfile?.socialLinks?.instagram, icon: Instagram, label: 'Instagram' },
    { href: userProfile?.socialLinks?.facebook, icon: Facebook, label: 'Facebook' },
    { href: userProfile?.socialLinks?.twitter, icon: Twitter, label: 'Twitter / X' },
  ].filter((l): l is { href: string; icon: typeof Instagram; label: string } => Boolean(l.href));

  return (
    <div className="space-y-5">
      {user?.isGuest && (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-4">
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

      {/* Identity: who, level, this month — three bands of one card. */}
      <section className="overflow-hidden rounded-3xl bg-card">
        <div className="p-4">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <Avatar className="h-[4.5rem] w-[4.5rem] ring-2 ring-primary ring-offset-2 ring-offset-card">
                {avatarSrc && <AvatarImage src={avatarSrc} alt="Awatar użytkownika" className="object-cover" />}
                <AvatarFallback className="text-xl font-bold">{isLoading ? '' : getInitials(userProfile?.name)}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={onEditAvatar}
                aria-label="Zmień zdjęcie profilowe"
                className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-foreground text-background ring-2 ring-card transition-transform active:scale-90"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              {isLoading && !userProfile ? (
                <>
                  <Skeleton className="h-7 w-36" />
                  <Skeleton className="mt-2 h-4 w-20" />
                </>
              ) : (
                <>
                  <h2 className="line-clamp-2 break-words font-display text-[1.75rem] font-bold uppercase leading-[0.95]">
                    {userProfile?.name || 'Twój profil'}
                  </h2>
                  <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
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
              onClick={onEditProfile}
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
        </div>

        <Link
          to="/athlete/gamification"
          onClick={() => haptic('tap')}
          aria-label={`Poziom ${stats?.level ?? 1}, osiągnięcia i nagrody`}
          className="pressable-lg mx-3 block rounded-2xl bg-secondary/60 p-3.5"
        >
          {statsLoading && !stats ? (
            <Skeleton className="h-[5.5rem] w-full" />
          ) : (
            <>
              <div className="flex items-end justify-between gap-3">
                <p className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-muted-foreground">Poziom</span>
                  <span className="font-display text-[2rem] font-bold leading-none tabular-nums">{stats?.level ?? 1}</span>
                </p>
                <p className="flex items-center gap-0.5 pb-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                  {stats?.currentXP ?? 0} / {stats?.xpForNextLevel ?? 0} XP
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                </p>
              </div>
              <Progress value={xpPercent} className="mt-2 h-2 bg-foreground/10" />
              <div className="mt-3.5 grid grid-cols-3 gap-2">
                <Counter icon={Flame} color="hsl(var(--primary))" value={streak} label={`${pluralForm(streak, 'dzień', 'dni', 'dni')} serii`} />
                <Counter icon={Coins} color="hsl(var(--food))" value={stats?.currentFitCoins ?? 0} label="FitCoins" />
                <Counter icon={Medal} color="hsl(var(--social))" value={stats?.achievementCount ?? 0} label="Odznaki" />
              </div>
            </>
          )}
        </Link>

        <div className="px-4 pb-4 pt-4">
          <p className="eyebrow">W tym miesiącu</p>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <Stat value={monthWorkouts?.length ?? '–'} label="Treningi" />
            <Stat value={fmtKm(totals.monthKm)} unit="km" label="Bieganie" isLoading={!runsReady} />
            <Stat value={activeDays ?? '–'} label="Aktywne dni" />
          </div>
        </div>
      </section>

      {/* All-time: the totals and the around-the-equator goal they add up to. */}
      <section className="rounded-3xl bg-card p-4">
        <p className="eyebrow">Łącznie</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Stat value={fmtKm(totals.totalKm)} unit="km" label="Kilometry" isLoading={!runsReady} />
          <Stat value={totals.activityCount} label="Aktywności" isLoading={!runsReady} />
          <Stat value={favoriteGymsCount} label="Siłownie" isLoading={isLoading && !userProfile} />
        </div>

        <div className="mt-4 border-t border-border/50 pt-3.5">
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
              : `Do okrążenia równika zostało ${Math.max(0, EARTH_EQUATOR_KM - totals.totalKm).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} km`}
          </p>
        </div>
      </section>

      <SettingsGroup title="Twój profil">
        <SettingsLinkRow
          icon={UserPen}
          color="hsl(var(--primary))"
          title="Dane profilu"
          description={userProfile?.email || 'Imię, email, miasto, social media'}
          onClick={() => userProfile && onEditProfile()}
        />
        <SettingsLinkRow
          icon={Dumbbell}
          color="hsl(var(--volt))"
          title="Ulubione siłownie"
          description="Miejsca, w których trenujesz"
          value={isLoading && !userProfile ? undefined : favoriteGymsCount || 'Brak'}
          onClick={() => userProfile && onEditGyms()}
        />
      </SettingsGroup>
    </div>
  );
}
