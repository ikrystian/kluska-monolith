import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { startOfMonth } from 'date-fns';
import { ChevronRight, Clock, Flame, LogOut, Search, Settings, Trophy, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { buttonVariants } from '@/components/ui/button';
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
  findNavGroup,
  isNavGroup,
  navItemsForRole,
  navLeavesForRole,
  searchNavLeaves,
  type NavGroup,
  type NavLeaf,
} from '@/lib/athlete-nav';
import { haptic } from '@/lib/haptics';
import type { RunningSession, StravaActivity, WorkoutLog } from '@/lib/types';

const NEUTRAL = 'hsl(var(--muted-foreground))';
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

function LeafRow({ leaf, color }: { leaf: NavLeaf; color: string }) {
  const Icon = leaf.icon;
  return (
    <Link to={leaf.href} className="row-tap flex items-center gap-3 px-3.5 py-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: tint(color, 14), color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-tight">{leaf.label}</span>
        {leaf.description && <span className="block truncate text-xs text-muted-foreground">{leaf.description}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

/** Reached from the tab bar, so listing them here would only repeat it. */
const ON_TAB_BAR = ['/athlete/log', '/athlete/social'];

function GroupSection({ group }: { group: NavGroup }) {
  const leaves = group.items.filter(leaf => !ON_TAB_BAR.includes(leaf.href.split('?')[0]));
  if (leaves.length === 0) return null;

  return (
    <section>
      <h2 className="eyebrow mb-1.5 px-1">{group.label}</h2>
      <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
        {leaves.map(leaf => (
          <LeafRow key={leaf.href} leaf={leaf} color={group.color} />
        ))}
      </div>
    </section>
  );
}

/** One number in the identity card's strip. */
function Stat({ value, unit, label }: { value: string | number; unit?: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-display text-[1.75rem] font-bold leading-none tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-sm font-semibold text-muted-foreground">{unit}</span>}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * The "Ty" tab: who you are, how the month is going, and every screen that has
 * no tab of its own. Replaces the old menu sheet, which was a dead end you had
 * to open to learn anything.
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

  const results = query.trim() ? searchNavLeaves(query, role) : null;
  const recentLeaves = recentRoutes
    .map(href => navLeavesForRole(role).find(leaf => leaf.href === href))
    .filter((leaf): leaf is NavLeaf => Boolean(leaf));

  const xpPercent = stats && stats.xpForNextLevel > 0 ? Math.min(100, (stats.currentXP / stats.xpForNextLevel) * 100) : 0;

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
    <div className="page space-y-5">
      {/* Identity */}
      <section className="rounded-2xl bg-card p-4">
        <Link to="/athlete/profile" className="flex items-center gap-3.5 active:opacity-70">
          <Avatar className="h-16 w-16">
            {userProfile?.avatarUrl && <AvatarImage src={resolveMediaUrl(userProfile.avatarUrl)} alt="" className="object-cover" />}
            <AvatarFallback className="text-lg font-bold">{getInitials(userProfile?.name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xl font-bold leading-tight">{userProfile?.name || 'Twój profil'}</span>
            <span className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <Settings className="h-3.5 w-3.5" /> Profil i ustawienia
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        </Link>

        <Link to="/athlete/gamification" className="mt-4 block active:opacity-70">
          {statsLoading && !stats ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold">
                  Poziom <span className="font-display text-xl font-bold tabular-nums">{stats?.level ?? 1}</span>
                </p>
                <p className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-primary" />
                    <span className="tabular-nums">{stats?.streaks.workout ?? 0}</span> dni serii
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-food" />
                    <span className="tabular-nums">{stats?.currentFitCoins ?? 0}</span>
                  </span>
                </p>
              </div>
              <Progress value={xpPercent} className="mt-2" />
            </>
          )}
        </Link>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/60 pt-3.5">
          <Stat value={monthWorkouts?.length ?? '–'} label="Treningi w mies." />
          <Stat value={monthKm.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} unit="km" label="Bieganie" />
          <Stat value={stats?.achievementCount ?? '–'} label="Odznaki" />
        </div>
      </section>

      {/* Search */}
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
          className="h-12 w-full rounded-xl border border-transparent bg-card pl-10 pr-10 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary [&::-webkit-search-cancel-button]:hidden"
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

      {results ? (
        <section aria-live="polite">
          {results.length > 0 ? (
            <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
              {results.map(leaf => (
                <LeafRow key={leaf.href} leaf={leaf} color={findNavGroup(leaf.href)?.color ?? NEUTRAL} />
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
          {recentLeaves.length > 0 && (
            <section>
              <h2 className="eyebrow mb-1.5 flex items-center gap-1 px-1">
                <Clock className="h-3 w-3" /> Ostatnio
              </h2>
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                {recentLeaves.map(leaf => (
                  <Link
                    key={leaf.href}
                    to={leaf.href}
                    className="shrink-0 rounded-full bg-card px-3.5 py-2 text-sm font-semibold transition-transform active:scale-[0.96]"
                  >
                    {leaf.label}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {groups.map(group => (
            <GroupSection key={group.label} group={group} />
          ))}

          <button
            type="button"
            onClick={handleLogout}
            className="row-tap flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-card text-[15px] font-semibold text-destructive"
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
