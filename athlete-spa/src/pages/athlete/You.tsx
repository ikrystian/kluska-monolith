import { useMemo, useState, type ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { startOfMonth } from 'date-fns';
import { ChevronRight, Clock, Coins, Flame, LogOut, Medal, Search, Settings, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { buttonVariants } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section';
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
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection, useUser } from '@/lib/db-hooks';
import { useGamificationProfile } from '@/hooks/useGamification';
import { useRecentRoutes } from '@/hooks/useRecentRoutes';
import { resolveMediaUrl } from '@/lib/api-client';
import {
  isNavGroup,
  navItemsForRole,
  navLeafColor,
  navLeavesForRole,
  searchNavLeaves,
  type NavGroup,
  type NavLeaf,
} from '@/lib/athlete-nav';
import { haptic } from '@/lib/haptics';
import { pluralForm } from '@/lib/plural';
import { cn } from '@/lib/utils';
import type { RunningSession, StravaActivity, WorkoutLog } from '@/lib/types';

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

function getInitials(name: string | null | undefined) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Reached from the tab bar, so listing them here would only repeat it. */
const ON_TAB_BAR = ['/athlete/log', '/athlete/social'];
const offTabBar = (leaf: NavLeaf) => !ON_TAB_BAR.includes(leaf.href.split('?')[0]);

/* ---------- Destinations ---------- */

/** Rounded square in the destination's domain colour; the same badge on tiles, rows and chips. */
function LeafIcon({ leaf, size = 'md' }: { leaf: NavLeaf; size?: 'sm' | 'md' }) {
  const Icon = leaf.icon;
  const color = navLeafColor(leaf);
  return (
    <span
      className={cn('grid shrink-0 place-items-center', size === 'md' ? 'h-10 w-10 rounded-xl' : 'h-6 w-6 rounded-lg')}
      style={{ backgroundColor: tint(color, 15), color }}
    >
      <Icon className={size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5'} />
    </span>
  );
}

/**
 * One destination as a tile. Two per row, so a section reads at a glance; a
 * section with an odd count lets its first tile span the row instead of
 * leaving a hole.
 */
function NavTile({ leaf, wide }: { leaf: NavLeaf; wide?: boolean }) {
  const color = navLeafColor(leaf);
  return (
    <Link
      to={leaf.href}
      onClick={() => haptic('tap')}
      className={cn(
        'pressable relative flex overflow-hidden rounded-2xl bg-card p-3.5',
        wide ? 'col-span-2 items-center gap-3' : 'flex-col'
      )}
    >
      {/* A soft wash of the domain colour, so a tile is recognisable before it is read. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl"
        style={{ backgroundColor: tint(color, 14) }}
      />
      <LeafIcon leaf={leaf} />
      <span className={cn('relative min-w-0', wide ? 'flex-1' : 'mt-2.5')}>
        <span className="block text-[15px] font-semibold leading-tight">{leaf.label}</span>
        {leaf.description && (
          <span className="mt-1 line-clamp-2 block text-xs leading-snug text-muted-foreground">{leaf.description}</span>
        )}
      </span>
      {wide && <ChevronRight className="relative h-4 w-4 shrink-0 text-muted-foreground/60" />}
    </Link>
  );
}

function NavSection({ group }: { group: NavGroup }) {
  const leaves = group.items.filter(offTabBar);
  if (leaves.length === 0) return null;
  const odd = leaves.length % 2 === 1;

  return (
    <section>
      <SectionHeader title={group.label} />
      <div className="grid grid-cols-2 gap-2">
        {leaves.map((leaf, i) => (
          <NavTile key={leaf.href} leaf={leaf} wide={odd && i === 0} />
        ))}
      </div>
    </section>
  );
}

/** Search hit: a full-width row, since results come from every section at once. */
function LeafRow({ leaf }: { leaf: NavLeaf }) {
  return (
    <Link to={leaf.href} className="row-tap flex items-center gap-3 px-3.5 py-2.5">
      <LeafIcon leaf={leaf} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-tight">{leaf.label}</span>
        {leaf.description && <span className="block truncate text-xs text-muted-foreground">{leaf.description}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

/* ---------- Identity card ---------- */

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

/** One number in the month strip. */
function Stat({ value, unit, label }: { value: string | number; unit?: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-display text-[1.75rem] font-bold leading-none tabular-nums">
        {value}
        {unit && <span className="ml-0.5 font-body text-sm font-semibold leading-none text-muted-foreground">{unit}</span>}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

const dayKey = (iso: string | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toDateString();
};

/**
 * The "Ty" tab: who you are, how the month is going, and every screen that has
 * no tab of its own — laid out as a few sections of tiles rather than one long
 * list, so a destination is found by its section and colour, not by reading.
 */
export default function YouPage() {
  const { userProfile } = useUserProfile();
  const { user } = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const recentRoutes = useRecentRoutes();
  const { stats, isLoading: statsLoading } = useGamificationProfile();
  const [query, setQuery] = useState('');
  const [guestLogoutOpen, setGuestLogoutOpen] = useState(false);

  const role = userProfile?.role;
  const groups = useMemo(() => navItemsForRole(role).filter(isNavGroup), [role]);
  const monthStart = useMemo(() => startOfMonth(new Date()).toISOString(), []);

  const { data: monthWorkouts } = useCollection<WorkoutLog>(
    user ? 'workoutLogs' : null,
    { athleteId: user?.uid, status: 'completed', endTime: { $gte: monthStart } }
  );
  const { data: monthRuns } = useCollection<RunningSession>(
    user ? 'runningSessions' : null,
    { ownerId: user?.uid, date: { $gte: monthStart } }
  );
  const { data: monthStrava } = useCollection<StravaActivity>(
    user ? 'stravaActivities' : null,
    { ownerId: user?.uid, date: { $gte: monthStart } }
  );

  const monthKm =
    (monthRuns ?? []).reduce((sum, run) => sum + (run.distance || 0), 0) +
    (monthStrava ?? []).reduce((sum, activity) => sum + (activity.distance || 0) / 1000, 0);

  /** Days this month with any workout or run: steadiness, which a raw count hides. */
  const activeDays = useMemo(() => {
    if (!monthWorkouts && !monthRuns && !monthStrava) return undefined;
    const days = new Set<string>();
    for (const workout of monthWorkouts ?? []) {
      const key = dayKey(workout.endTime);
      if (key) days.add(key);
    }
    for (const run of [...(monthRuns ?? []), ...(monthStrava ?? [])]) {
      const key = dayKey(run.date);
      if (key) days.add(key);
    }
    return days.size;
  }, [monthWorkouts, monthRuns, monthStrava]);

  const results = query.trim() ? searchNavLeaves(query, role) : null;
  const recentLeaves = recentRoutes
    .map(href => navLeavesForRole(role).find(leaf => leaf.href === href))
    .filter((leaf): leaf is NavLeaf => Boolean(leaf));

  const xpPercent = stats && stats.xpForNextLevel > 0 ? Math.min(100, (stats.currentXP / stats.xpForNextLevel) * 100) : 0;
  const streak = stats?.streaks.workout ?? 0;

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

  return (
    <div className="page stagger-rise space-y-6">
      {/* Identity: who, level, this month — three bands of one card. */}
      <section className="overflow-hidden rounded-3xl bg-card">
        <Link to="/athlete/profile" className="row-tap flex items-center gap-3.5 p-4">
          <Avatar className="h-16 w-16 ring-2 ring-primary ring-offset-2 ring-offset-card">
            {userProfile?.avatarUrl && <AvatarImage src={resolveMediaUrl(userProfile.avatarUrl)} alt="" className="object-cover" />}
            <AvatarFallback className="text-lg font-bold">{getInitials(userProfile?.name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 break-words font-display text-[1.75rem] font-bold uppercase leading-[0.95]">
              {userProfile?.name || 'Twój profil'}
            </span>
            <span className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
              <Settings className="h-3.5 w-3.5" /> Profil i ustawienia
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        </Link>

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
              <Progress value={xpPercent} className="mt-2 h-2 bg-background/60" />
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
            <Stat value={monthKm.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} unit="km" label="Bieganie" />
            <Stat value={activeDays ?? '–'} label="Aktywne dni" />
          </div>
        </div>
      </section>

      {/* Find: search, then the screens opened lately. */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Szukaj: waga, strava, posiłki…"
            aria-label="Szukaj w aplikacji"
            enterKeyHint="go"
            onKeyDown={e => {
              if (e.key === 'Enter' && results?.[0]) navigate(results[0].href);
            }}
            className="h-12 w-full rounded-2xl border border-transparent bg-card pl-10 pr-10 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground active:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!results && recentLeaves.length > 0 && (
          <div>
            <p className="eyebrow mb-1.5 flex items-center gap-1 px-1">
              <Clock className="h-3 w-3" /> Ostatnio
            </p>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {recentLeaves.map(leaf => (
                <Link
                  key={leaf.href}
                  to={leaf.href}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-card py-1.5 pl-1.5 pr-3 text-sm font-semibold transition-transform active:scale-[0.96]"
                >
                  <LeafIcon leaf={leaf} size="sm" />
                  {leaf.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {results ? (
        <section aria-live="polite">
          {results.length > 0 ? (
            <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
              {results.map(leaf => (
                <LeafRow key={leaf.href} leaf={leaf} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
              Nic nie znaleziono dla „{query.trim()}”.
            </p>
          )}
        </section>
      ) : (
        <>
          {groups.map(group => (
            <NavSection key={group.label} group={group} />
          ))}

          <button
            type="button"
            onClick={handleLogout}
            className="row-tap flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-card text-[15px] font-semibold text-destructive"
          >
            <LogOut className="h-4 w-4" /> Wyloguj się
          </button>
        </>
      )}

      <AlertDialog open={guestLogoutOpen} onOpenChange={setGuestLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wylogować konto gościa?</AlertDialogTitle>
            <AlertDialogDescription>
              Twoje dane są przypisane do tego urządzenia. Po wylogowaniu stracisz do nich dostęp. Załóż konto, aby je zachować.
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
