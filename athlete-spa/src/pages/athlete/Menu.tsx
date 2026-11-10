import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { ChevronRight, LogOut, Palette, Search, X } from 'lucide-react';
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
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useUser } from '@/lib/db-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useRecentRoutes } from '@/hooks/useRecentRoutes';
import { useGamificationProfile } from '@/hooks/useGamification';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  findNavGroup,
  isNavGroup,
  navItemsForRole,
  navLeavesForRole,
  searchNavLeaves,
  type NavLeaf,
} from '@/lib/athlete-nav';
import { resolveMediaUrl } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const APP_VERSION = '0.9.3';

/** The nav group the menu draws at the bottom as "Konto", next to the theme and logout. */
const SETTINGS_GROUP = 'Ustawienia';
const PROFILE_HREF = '/athlete/you';
const SETTINGS_HREF = '/athlete/you?tab=settings';

/** How many shortcuts the top strip holds: one row, never more. */
const SHORTCUT_COUNT = 4;
/** Shortcuts shown until the athlete has opened enough screens of their own. */
const DEFAULT_SHORTCUTS = ['/athlete/nutrition', '/athlete/calendar', '/athlete/progress', '/athlete/exercises'];

const SEARCH_HINTS = ['trening', 'waga', 'makro', 'czat', 'kalendarz', 'strava', 'powiadomienia', 'motyw'];

const THEME_OPTIONS = [
  { id: 'light', label: 'Jasny' },
  { id: 'dark', label: 'Ciemny' },
  { id: 'system', label: 'Auto' },
] as const;

/**
 * Cells of one card sit on the border colour with a 1px gap, which draws even
 * hairlines between them in both directions without per-cell border logic.
 */
const CARD = 'overflow-hidden rounded-2xl bg-border/70';
const CELL = 'bg-card transition-colors active:bg-secondary';
const ICON = 'h-5 w-5 shrink-0 text-muted-foreground';

/** Polish plural: 1 dzień, 2–4 dni… picks the right form for `n`. */
function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const tens = n % 100;
  const units = n % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

/**
 * Keeps a one-letter word with the word after it, so a name that wraps never
 * ends a line on a stray "i" or "z" ("Grywalizacja / i nagrody").
 */
function tidyLabel(label: string) {
  return label.replace(/(^| )([aiouwz]) /gi, '$1$2\u00a0');
}

/** Section heading in the header's condensed face, so groups read as landmarks while scrolling. */
function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mb-2.5 px-1 font-display text-[1.125rem] font-bold uppercase leading-none tracking-[0.04em]">
      {children}
    </h2>
  );
}

/** One destination of the directory: icon and name, two to a row. */
function DirectoryCell({ leaf, wide }: { leaf: NavLeaf; wide?: boolean }) {
  const Icon = leaf.icon;
  return (
    <li className={cn('min-w-0', wide && 'col-span-2')}>
      <Link to={leaf.href} onClick={() => haptic('tap')} className={cn(CELL, 'flex h-14 items-center gap-3 px-3.5')}>
        <Icon className={ICON} />
        <span className="line-clamp-2 min-w-0 text-[15px] font-semibold leading-[1.2]">{tidyLabel(leaf.label)}</span>
      </Link>
    </li>
  );
}

/** A nav group as a titled card of destinations. An odd last one takes the full row. */
function DirectorySection({ title, leaves }: { title: string; leaves: NavLeaf[] }) {
  const id = useId();
  return (
    <section data-tour="menu-directory" aria-labelledby={id}>
      <SectionTitle id={id}>{title}</SectionTitle>
      <ul className={cn(CARD, 'grid grid-cols-2 gap-px')}>
        {leaves.map((leaf, index) => (
          <DirectoryCell key={leaf.href} leaf={leaf} wide={leaves.length % 2 === 1 && index === leaves.length - 1} />
        ))}
      </ul>
    </section>
  );
}

/**
 * The screens this athlete actually uses, one tap from the top. Always a full
 * row in the menu's own order, so a shortcut keeps its place between visits.
 */
function Shortcuts({ leaves }: { leaves: NavLeaf[] }) {
  return (
    <section data-tour="menu-shortcuts" aria-labelledby="menu-shortcuts">
      <SectionTitle id="menu-shortcuts">Szybki dostęp</SectionTitle>
      <ul className={cn(CARD, 'grid grid-cols-4 gap-px')}>
        {leaves.map(leaf => {
          const Icon = leaf.icon;
          return (
            <li key={leaf.href} className="min-w-0">
              <Link
                to={leaf.href}
                onClick={() => haptic('tap')}
                className={cn(CELL, 'flex h-full flex-col items-center gap-2 px-1.5 pb-2.5 pt-3.5 text-center')}
              >
                <Icon className="h-[22px] w-[22px] shrink-0 text-primary" />
                {/* Two lines are reserved either way, so icons line up across the row. */}
                <span className="line-clamp-2 min-h-[1.75rem] text-xs font-medium leading-[0.875rem]">
                  {tidyLabel(leaf.label)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** A full-width row with a second line: search results and the recent list. */
function DetailRow({ leaf, description = leaf.description }: { leaf: NavLeaf; description?: ReactNode }) {
  const Icon = leaf.icon;
  return (
    <li>
      <Link to={leaf.href} onClick={() => haptic('tap')} className={cn(CELL, 'flex items-center gap-3 px-3.5 py-3')}>
        <Icon className={ICON} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-snug">{leaf.label}</span>
          {description && <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{description}</span>}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      </Link>
    </li>
  );
}

/** Who is signed in, with level and streak at a glance; opens the profile. */
function ProfileRow() {
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
    <Link to={PROFILE_HREF} onClick={() => haptic('tap')} className={cn(CELL, 'flex items-center gap-3 px-3.5 py-3')}>
      <Avatar className="h-10 w-10">
        {userProfile?.avatarUrl && (
          <AvatarImage src={resolveMediaUrl(userProfile.avatarUrl)} alt="" className="object-cover" />
        )}
        <AvatarFallback className="bg-secondary text-sm font-semibold">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-snug">{name}</span>
        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
          {facts.length > 0 ? facts.join(' · ') : 'Profil, statystyki i dane konta'}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

/** Theme switch inline, so the most-changed setting needs no extra screen. */
function ThemeRow() {
  const { theme, setTheme } = useTheme();
  const current = theme ?? 'system';

  return (
    <div className="flex h-14 items-center gap-3 bg-card pl-3.5 pr-2.5">
      <Palette className={ICON} />
      <p className="flex-1 text-[15px] font-semibold">Motyw</p>
      <div role="radiogroup" aria-label="Motyw aplikacji" className="flex shrink-0 gap-0.5 rounded-full bg-secondary p-0.5">
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
                'h-8 rounded-full px-2 text-[13px] font-semibold transition-colors min-[360px]:px-3',
                active ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground active:text-foreground'
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
    <div className="flex flex-wrap gap-2">
      {SEARCH_HINTS.map(hint => (
        <button
          key={hint}
          type="button"
          onClick={() => {
            haptic('tap');
            onPick(hint);
          }}
          className="h-9 rounded-full bg-card px-3.5 text-[13px] font-semibold transition-colors active:bg-secondary"
        >
          {hint}
        </button>
      ))}
    </div>
  );
}

/**
 * "Menu": every screen of the app on two short pages.
 *
 * Top to bottom: search, four shortcuts, then the nav groups in their fixed
 * order as a two-column directory, and the account — profile, settings, theme,
 * logout. A workout left running is the layout's mini-player, not a row here. Icons stay one quiet colour so the names
 * do the talking; search results keep the one-line hints the directory drops.
 * Groups come from `athlete-nav`, so a new screen added there shows up here
 * and in search without touching this file.
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

  /** Screens opened lately, newest first — the list under an empty search. */
  const recentLeaves = useMemo(() => {
    const leaves = navLeavesForRole(role);
    return recentRoutes
      .map(href => leaves.find(leaf => leaf.href === href))
      .filter((leaf): leaf is NavLeaf => Boolean(leaf));
  }, [recentRoutes, role]);

  /** The same screens topped up with defaults to a full row, in menu order. */
  const shortcutLeaves = useMemo(() => {
    const leaves = navLeavesForRole(role);
    const picked = new Set(
      [...recentLeaves.map(leaf => leaf.href), ...DEFAULT_SHORTCUTS]
        .filter(href => leaves.some(leaf => leaf.href === href))
        .filter((href, index, all) => all.indexOf(href) === index)
        .slice(0, SHORTCUT_COUNT)
    );
    return leaves.filter(leaf => picked.has(leaf.href));
  }, [recentLeaves, role]);

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
        <div data-tour="menu-search" className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
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
            className="h-12 w-full rounded-2xl border border-transparent bg-card pl-11 pr-10 text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground active:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searching && (
          <button
            type="button"
            onClick={closeSearch}
            className="h-12 shrink-0 px-1 text-[15px] font-semibold text-primary active:opacity-60"
          >
            Anuluj
          </button>
        )}
      </div>

      {searching ? (
        results ? (
          <div aria-live="polite" className="animate-fade-in">
            {results.length > 0 ? (
              <section aria-labelledby="menu-results">
                <SectionTitle id="menu-results">
                  {results.length} {plural(results.length, 'wynik', 'wyniki', 'wyników')}
                </SectionTitle>
                <ul className={cn(CARD, 'grid grid-cols-1 gap-px')}>
                  {results.map(leaf => {
                    const group = findNavGroup(leaf.href)?.label;
                    return (
                      <DetailRow
                        key={leaf.href}
                        leaf={leaf}
                        description={[group, leaf.description].filter(Boolean).join(' · ')}
                      />
                    );
                  })}
                </ul>
              </section>
            ) : (
              <EmptyState
                icon={Search}
                title={`Brak wyników dla „${query.trim()}”`}
                description="Sprawdź pisownię albo wybierz jedną z podpowiedzi poniżej."
              />
            )}
            {results.length === 0 && (
              <div className="mt-6">
                <SectionTitle>Podpowiedzi</SectionTitle>
                <HintChips onPick={setQuery} />
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fade-in space-y-6">
            {recentLeaves.length > 0 && (
              <section aria-labelledby="menu-recent">
                <SectionTitle id="menu-recent">Ostatnio otwierane</SectionTitle>
                <ul className={cn(CARD, 'grid grid-cols-1 gap-px')}>
                  {recentLeaves.map(leaf => (
                    <DetailRow key={leaf.href} leaf={leaf} />
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="menu-hints">
              <SectionTitle id="menu-hints">Podpowiedzi</SectionTitle>
              <HintChips onPick={setQuery} />
            </section>
          </div>
        )
      ) : (
        <div className="stagger-rise space-y-6">
          {shortcutLeaves.length === SHORTCUT_COUNT && <Shortcuts leaves={shortcutLeaves} />}

          {groups.map(group => (
            <DirectorySection key={group.label} title={group.label} leaves={group.items} />
          ))}

          <section aria-labelledby="menu-account">
            <SectionTitle id="menu-account">Konto</SectionTitle>
            <div className={cn(CARD, 'grid grid-cols-1 gap-px')}>
              <ProfileRow />
              {settingsLeaf && (
                <Link
                  to={settingsLeaf.href}
                  onClick={() => haptic('tap')}
                  className={cn(CELL, 'flex h-14 items-center gap-3 px-3.5')}
                >
                  <settingsLeaf.icon className={ICON} />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{settingsLeaf.label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                </Link>
              )}
              <ThemeRow />
              <button
                type="button"
                onClick={() => {
                  haptic('tap');
                  setLogoutDialogOpen(true);
                }}
                className={cn(CELL, 'flex h-14 w-full items-center gap-3 px-3.5 text-left text-destructive')}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="text-[15px] font-semibold">Wyloguj się</span>
              </button>
            </div>

            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Leniwa Kluska {APP_VERSION}</span>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1.5">
                <span className={cn('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-amber-500')} />
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </p>
          </section>
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
