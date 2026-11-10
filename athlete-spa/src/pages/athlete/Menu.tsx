import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { ChevronRight, LogOut, Monitor, Moon, Palette, Search, Sun, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { EmptyState } from '@/components/ui/section';
import { SettingsGroup, tint } from '@/components/profile/profile-ui';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useUser } from '@/lib/db-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useRecentRoutes } from '@/hooks/useRecentRoutes';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useGamificationProfile } from '@/hooks/useGamification';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  findNavGroup,
  isNavGroup,
  navItemsForRole,
  navLeafColor,
  navLeavesForRole,
  searchNavLeaves,
  type NavLeaf,
} from '@/lib/athlete-nav';
import { resolveMediaUrl } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const APP_VERSION = '0.9.3';

/** The nav group the menu draws at the bottom as "Aplikacja", next to the theme and logout. */
const SETTINGS_GROUP = 'Ustawienia';
const PROFILE_HREF = '/athlete/you';
const SETTINGS_HREF = '/athlete/you?tab=settings';

const SEARCH_HINTS = ['trening', 'waga', 'makro', 'czat', 'kalendarz', 'strava', 'powiadomienia', 'motyw'];

const THEME_OPTIONS = [
  { id: 'light', label: 'Jasny', icon: Sun },
  { id: 'dark', label: 'Ciemny', icon: Moon },
  { id: 'system', label: 'Auto', icon: Monitor },
] as const;

/** Polish plural: 1 dzień, 2–4 dni… picks the right form for `n`. */
function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const tens = n % 100;
  const units = n % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

/** Destination's icon on a rounded tile in its domain colour — the same tile the settings rows use. */
function RowIcon({ leaf }: { leaf: NavLeaf }) {
  const Icon = leaf.icon;
  const color = navLeafColor(leaf);
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
      style={{ backgroundColor: tint(color, 15), color }}
    >
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

/** One destination in a grouped list: icon, name, one-line hint, chevron. */
function MenuRow({ leaf, description = leaf.description }: { leaf: NavLeaf; description?: ReactNode }) {
  return (
    <Link
      to={leaf.href}
      onClick={() => haptic('tap')}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50 active:bg-secondary"
    >
      <RowIcon leaf={leaf} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-snug">{leaf.label}</p>
        {description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

/** Who is signed in, with level and streak at a glance; opens the profile. */
function ProfileCard() {
  const { userProfile } = useUserProfile();
  const { stats } = useGamificationProfile();

  const name = userProfile?.name?.trim() || 'Sportowiec';
  const isTrainer = userProfile?.role === 'trainer';

  const facts: string[] = [];
  if (isTrainer) facts.push('Trener');
  if (stats) {
    facts.push(`Poziom ${stats.level}`);
    const streak = stats.streaks?.workout ?? 0;
    if (streak > 0) facts.push(`seria ${streak} ${plural(streak, 'dzień', 'dni', 'dni')}`);
    if (stats.currentFitCoins > 0) {
      facts.push(`${stats.currentFitCoins} ${plural(stats.currentFitCoins, 'FitCoin', 'FitCoiny', 'FitCoinów')}`);
    }
  }

  return (
    <Link
      to={PROFILE_HREF}
      onClick={() => haptic('tap')}
      className="flex items-center gap-3.5 rounded-2xl bg-card px-4 py-3.5 transition-colors hover:bg-secondary/50 active:bg-secondary"
    >
      <Avatar className="h-12 w-12">
        {userProfile?.avatarUrl && (
          <AvatarImage src={resolveMediaUrl(userProfile.avatarUrl)} alt="" className="object-cover" />
        )}
        <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-tight">{name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {facts.length > 0 ? facts.join(' · ') : 'Profil, statystyki i dane konta'}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

/** A session left running elsewhere: one tap takes the athlete back into it. */
function ActiveWorkoutRow() {
  const { activeWorkout, hasActiveWorkout } = useActiveWorkout();
  if (!hasActiveWorkout || !activeWorkout) return null;

  return (
    <Link
      to={`/athlete/log?logId=${activeWorkout.id}`}
      onClick={() => haptic('impact')}
      className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 transition-colors active:bg-primary/15"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-primary">Trening w toku</p>
        <p className="truncate text-[15px] font-semibold leading-snug">
          {activeWorkout.workoutName || 'Sesja treningowa'}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
        Wróć
      </span>
    </Link>
  );
}

/** The last few screens opened (at most four), as an even two-column grid of shortcuts. */
function RecentShortcuts({ leaves }: { leaves: NavLeaf[] }) {
  return (
    <section>
      <h2 className="mb-2 px-4 text-xs font-semibold text-muted-foreground">Ostatnio otwierane</h2>
      <div className="grid grid-cols-2 gap-2">
        {leaves.map(leaf => {
          const Icon = leaf.icon;
          const color = navLeafColor(leaf);
          return (
            <Link
              key={leaf.href}
              to={leaf.href}
              onClick={() => haptic('tap')}
              className="flex h-12 min-w-0 items-center gap-2.5 rounded-xl bg-card px-2.5 transition-colors hover:bg-secondary/50 active:bg-secondary"
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                style={{ backgroundColor: tint(color, 15), color }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="line-clamp-2 text-[13px] font-semibold leading-tight">{leaf.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Theme switch inline, so the most-changed setting needs no extra screen. */
function ThemeRow() {
  const { theme, setTheme } = useTheme();
  const current = theme ?? 'system';
  const color = 'hsl(var(--chart-4))';

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
        style={{ backgroundColor: tint(color, 15), color }}
      >
        <Palette className="h-[18px] w-[18px]" />
      </span>
      <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">Motyw</p>
      <div role="radiogroup" aria-label="Motyw aplikacji" className="flex shrink-0 gap-0.5 rounded-full bg-secondary/70 p-0.5">
        {THEME_OPTIONS.map(({ id, label }) => {
          const active = current === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                haptic('tap');
                setTheme(id);
              }}
              className={cn(
                'h-8 rounded-full px-3 text-xs font-semibold transition-colors',
                active ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground active:text-foreground'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HintChips({ onPick }: { onPick: (hint: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {SEARCH_HINTS.map(hint => (
        <button
          key={hint}
          type="button"
          onClick={() => {
            haptic('tap');
            onPick(hint);
          }}
          className="h-8 rounded-full bg-secondary px-3.5 text-xs font-semibold transition-colors active:bg-secondary/70"
        >
          {hint}
        </button>
      ))}
    </div>
  );
}

/**
 * "Menu": every screen of the app in one ordered, grouped list.
 *
 * Top to bottom: search, who you are (and a workout left running), the screens
 * you opened lately, then the nav groups in their fixed order, and the app
 * itself — settings, theme, logout. Groups come from `athlete-nav`, so a new
 * screen added there shows up here and in search without touching this file.
 */
export default function MenuPage() {
  const { userProfile } = useUserProfile();
  const { user } = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const recentRoutes = useRecentRoutes();
  const isOnline = useOnlineStatus();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const role = userProfile?.role;

  const groups = useMemo(
    () => navItemsForRole(role).filter(isNavGroup).filter(group => group.label !== SETTINGS_GROUP && group.items.length > 0),
    [role]
  );

  const settingsLeaf = useMemo(() => navLeavesForRole(role).find(leaf => leaf.href === SETTINGS_HREF), [role]);

  const recentLeaves = useMemo(() => {
    const leaves = navLeavesForRole(role);
    return recentRoutes
      .map(href => leaves.find(leaf => leaf.href === href))
      .filter((leaf): leaf is NavLeaf => Boolean(leaf));
  }, [recentRoutes, role]);

  const results = query.trim() ? searchNavLeaves(query, role) : null;

  const closeSearch = () => {
    setQuery('');
    setSearching(false);
    inputRef.current?.blur();
  };

  const handleConfirmLogout = () => {
    haptic('impact');
    logout();
    navigate('/login');
  };

  return (
    <div className="page space-y-6 pb-8">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setSearching(true)}
            placeholder="Szukaj ekranu lub ustawienia"
            aria-label="Szukaj w aplikacji"
            enterKeyHint="go"
            onKeyDown={e => {
              if (e.key === 'Enter' && results?.[0]) navigate(results[0].href);
              if (e.key === 'Escape') closeSearch();
            }}
            className="h-11 w-full rounded-xl border border-transparent bg-card pl-10 pr-10 text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground active:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searching && (
          <button
            type="button"
            onClick={closeSearch}
            className="h-11 shrink-0 px-1 text-[15px] font-semibold text-primary active:opacity-60"
          >
            Anuluj
          </button>
        )}
      </div>

      {searching ? (
        results ? (
          <div aria-live="polite" className="animate-fade-in">
            {results.length > 0 ? (
              <SettingsGroup title={`${results.length} ${plural(results.length, 'wynik', 'wyniki', 'wyników')}`}>
                {results.map(leaf => {
                  const group = findNavGroup(leaf.href)?.label;
                  const description = [group, leaf.description].filter(Boolean).join(' · ');
                  return <MenuRow key={leaf.href} leaf={leaf} description={description} />;
                })}
              </SettingsGroup>
            ) : (
              <EmptyState
                icon={Search}
                title={`Brak wyników dla „${query.trim()}”`}
                description="Sprawdź pisownię albo wybierz jedną z podpowiedzi."
                action={<HintChips onPick={setQuery} />}
              />
            )}
          </div>
        ) : (
          <div className="animate-fade-in space-y-6">
            {recentLeaves.length > 0 && (
              <SettingsGroup title="Ostatnio otwierane">
                {recentLeaves.map(leaf => (
                  <MenuRow key={leaf.href} leaf={leaf} />
                ))}
              </SettingsGroup>
            )}
            <section>
              <h2 className="mb-2 px-4 text-xs font-semibold text-muted-foreground">Podpowiedzi</h2>
              <div className="rounded-2xl bg-card p-4">
                <HintChips onPick={setQuery} />
              </div>
            </section>
          </div>
        )
      ) : (
        <div className="stagger-rise space-y-6">
          <div className="space-y-2.5">
            <ProfileCard />
            <ActiveWorkoutRow />
          </div>

          {recentLeaves.length > 0 && <RecentShortcuts leaves={recentLeaves} />}

          {groups.map(group => (
            <SettingsGroup key={group.label} title={group.label}>
              {group.items.map(leaf => (
                <MenuRow key={leaf.href} leaf={leaf} />
              ))}
            </SettingsGroup>
          ))}

          <SettingsGroup title="Aplikacja">
            {settingsLeaf && <MenuRow leaf={settingsLeaf} description="Powiadomienia, integracje, dane offline" />}
            <ThemeRow />
          </SettingsGroup>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl bg-card">
              <button
                type="button"
                onClick={() => {
                  haptic('tap');
                  setLogoutDialogOpen(true);
                }}
                className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[15px] font-semibold text-destructive transition-colors active:bg-secondary"
              >
                <LogOut className="h-4 w-4" />
                Wyloguj się
              </button>
            </div>

            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Leniwa Kluska {APP_VERSION}</span>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1.5">
                <span className={cn('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-amber-500')} />
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </p>
          </div>
        </div>
      )}

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="max-w-sm rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {user?.isGuest ? 'Konto gościa zostanie utracone' : 'Wylogować się?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {user?.isGuest
                ? 'Jesteś zalogowany jako gość na tym urządzeniu. Po wylogowaniu Twoje treningi, plany i historia zostaną bezpowrotnie usunięte.'
                : 'Zakończysz bieżącą sesję w aplikacji na tym urządzeniu.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl">Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLogout}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {user?.isGuest ? 'Usuń dane i wyloguj' : 'Wyloguj się'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
