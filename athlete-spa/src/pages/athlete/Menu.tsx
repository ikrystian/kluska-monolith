import { useMemo, useRef, useState, type ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  Award,
  ChevronRight,
  Coins,
  Flame,
  LogOut,
  Monitor,
  Moon,
  Play,
  Search,
  SlidersHorizontal,
  Sun,
  X,
  Sparkles,
  ArrowRight,
  Dumbbell,
  UtensilsCrossed,
  TrendingUp,
  Users2,
  Compass,
  LayoutGrid,
  NotebookPen,
  Ruler,
  Footprints,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  type NavGroup,
  type NavLeaf,
} from '@/lib/athlete-nav';
import { resolveMediaUrl } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

const SEARCH_HINTS = ['trening', 'motyw', 'powiadomienia', 'strava', 'waga', 'makro', 'czat', 'atlas', 'kalendarz', 'wyloguj'];

const PLATE_SIZES = {
  lg: { disc: 'h-12 w-12', ring: 'inset-[3.5px]', icon: 'h-5 w-5' },
  md: { disc: 'h-10 w-10', ring: 'inset-[3px]', icon: 'h-4 w-4' },
  sm: { disc: 'h-7 w-7', ring: 'inset-[2px]', icon: 'h-3.5 w-3.5' },
} as const;

/**
 * A destination's icon on a disc in its domain colour, with the concentric inner ring of
 * an Olympic weight plate — iconic to the #leniwakluska design system.
 */
function Plate({ leaf, size = 'md' }: { leaf: NavLeaf; size?: keyof typeof PLATE_SIZES }) {
  const Icon = leaf.icon;
  const color = navLeafColor(leaf);
  const s = PLATE_SIZES[size];
  return (
    <span
      className={cn('relative grid shrink-0 place-items-center rounded-full transition-transform', s.disc)}
      style={{ backgroundColor: tint(color, 16), color }}
    >
      <span
        aria-hidden
        className={cn('pointer-events-none absolute rounded-full border', s.ring)}
        style={{ borderColor: tint(color, 24) }}
      />
      <Icon className={s.icon} />
    </span>
  );
}

type MenuCategory = 'all' | 'training' | 'health' | 'progress' | 'social' | 'explore' | 'settings';

interface FilterOption {
  id: MenuCategory;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const CATEGORY_FILTERS: FilterOption[] = [
  { id: 'all', label: 'Wszystko', icon: LayoutGrid },
  { id: 'training', label: 'Trening', icon: Dumbbell },
  { id: 'health', label: 'Dieta & Zdrowie', icon: UtensilsCrossed },
  { id: 'progress', label: 'Postępy', icon: TrendingUp },
  { id: 'social', label: 'Trener & Ekipa', icon: Users2 },
  { id: 'explore', label: 'Odkrywaj', icon: Compass },
  { id: 'settings', label: 'Ustawienia', icon: SlidersHorizontal },
];

function getGroupCategory(label: string): MenuCategory {
  switch (label) {
    case 'Trening':
      return 'training';
    case 'Na co dzień':
      return 'health';
    case 'Postępy':
      return 'progress';
    case 'Twój trener':
    case 'Dla trenera':
    case 'Społeczność':
      return 'social';
    case 'Odkrywaj':
      return 'explore';
    case 'Ustawienia':
      return 'settings';
    default:
      return 'all';
  }
}

/** Featured Hero launcher card */
function HeroQuickAction({
  to,
  color,
  icon: Icon,
  badge,
  title,
  subtitle,
}: {
  to: string;
  color: string;
  icon: ComponentType<{ className?: string }>;
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      onClick={() => haptic('tap')}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card/90 to-card/60 p-3.5 shadow-xs transition-all duration-200 hover:border-border active:scale-[0.98] active:bg-secondary/40"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-15"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center justify-between">
        <span
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl shadow-xs"
          style={{ backgroundColor: tint(color, 16), color }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[3px] rounded-xl border"
            style={{ borderColor: tint(color, 25) }}
          />
          <Icon className="h-5 w-5" />
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: tint(color, 14), color }}
        >
          {badge}
        </span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {title}
          </span>
          <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 text-primary" />
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug line-clamp-1">{subtitle}</p>
      </div>
    </Link>
  );
}

/** Athlete identity card on top */
function AthleteIdentityCard() {
  const { userProfile } = useUserProfile();
  const { stats } = useGamificationProfile();
  const { theme, setTheme } = useTheme();

  const name = userProfile?.name?.trim() || 'Sportowiec';
  const role = userProfile?.role === 'trainer' ? 'Trener' : 'Sportowiec';
  const avatarUrl = userProfile?.avatarUrl;

  const toggleTheme = () => {
    haptic('tap');
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card/95 to-secondary/30 p-4 shadow-xs">
      <div className="flex items-center gap-3.5">
        <Link
          to="/athlete/you"
          onClick={() => haptic('tap')}
          className="relative shrink-0 transition-transform active:scale-95"
          aria-label="Przejdź do profilu"
        >
          <Avatar className="h-13 w-13 ring-2 ring-primary/25 ring-offset-2 ring-offset-background">
            {avatarUrl && <AvatarImage src={resolveMediaUrl(avatarUrl)} alt={name} className="object-cover" />}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-lg font-bold uppercase tracking-tight text-foreground">
              {name}
            </h1>
            <Badge
              variant={userProfile?.role === 'trainer' ? 'default' : 'secondary'}
              className="text-[10px] uppercase font-bold tracking-wider py-0 px-2 h-4"
            >
              {role}
            </Badge>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            {stats ? (
              <>
                <span className="flex items-center gap-1 font-semibold text-primary">
                  <Award className="h-3.5 w-3.5" /> Poz. {stats.level}
                </span>
                {stats.streaks?.workout > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-amber-500">
                    <Flame className="h-3.5 w-3.5" /> {stats.streaks.workout} dni
                  </span>
                )}
                {stats.currentFitCoins > 0 && (
                  <span className="flex items-center gap-1 font-medium text-muted-foreground">
                    <Coins className="h-3.5 w-3.5" /> {stats.currentFitCoins}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground text-[11px]">Centrum dowodzenia sportowca</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Przełącz motyw"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary text-foreground transition-transform active:scale-90"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-3.5 flex items-center gap-2 pt-3 border-t border-border/50">
        <Link
          to="/athlete/you"
          onClick={() => haptic('tap')}
          className="flex-1 rounded-xl bg-secondary/80 hover:bg-secondary py-2 text-center text-xs font-semibold text-foreground transition-colors active:opacity-75"
        >
          Mój profil
        </Link>
        <Link
          to="/athlete/you?tab=settings"
          onClick={() => haptic('tap')}
          className="flex-1 rounded-xl bg-secondary/80 hover:bg-secondary py-2 text-center text-xs font-semibold text-foreground transition-colors active:opacity-75 flex items-center justify-center gap-1.5"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          Ustawienia
        </Link>
      </div>
    </div>
  );
}

/** Active workout pulse alert banner */
function ActiveWorkoutAlert() {
  const { activeWorkout, hasActiveWorkout } = useActiveWorkout();
  if (!hasActiveWorkout || !activeWorkout) return null;

  return (
    <Link
      to={`/athlete/log?logId=${activeWorkout.id}`}
      onClick={() => haptic('impact')}
      className="group flex items-center justify-between gap-3 rounded-3xl border border-primary/50 bg-primary/10 p-3.5 shadow-xs transition-all active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Trening w toku
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {activeWorkout.workoutName || 'Sesja treningowa'}
          </p>
        </div>
      </div>
      <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-xs">
        <Play className="h-3.5 w-3.5 fill-current" />
        Wróć
      </span>
    </Link>
  );
}

/** Card for coaches/trainers */
function TrainerModeBanner() {
  return (
    <Link
      to="/athlete/trainer-panel"
      onClick={() => haptic('tap')}
      className="group relative flex items-center justify-between overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-4 transition-all duration-200 active:scale-[0.98] shadow-xs"
    >
      <div className="flex items-center gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
          <Award className="h-5 w-5" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold uppercase tracking-wider text-primary">
              Panel Trenera
            </span>
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Aktywny
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Zarządzaj podopiecznymi, planami i raportami check-in
          </p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-primary transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Horizontal row of recently opened screens */
function RecentShortcuts({ recentLeaves }: { recentLeaves: NavLeaf[] }) {
  if (recentLeaves.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="eyebrow">Ostatnio odwiedzone</h2>
        <span className="text-[11px] font-medium text-muted-foreground">Szybki powrót</span>
      </div>
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        {recentLeaves.map(leaf => {
          const color = navLeafColor(leaf);
          const Icon = leaf.icon;
          return (
            <Link
              key={leaf.href}
              to={leaf.href}
              onClick={() => haptic('tap')}
              className="pressable-sm flex shrink-0 items-center gap-2 rounded-2xl border border-border/60 bg-card px-3 py-2 text-xs font-semibold shadow-xs hover:border-border transition-colors"
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-lg"
                style={{ backgroundColor: tint(color, 16), color }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="whitespace-nowrap">{leaf.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Single row item in a category card */
function MenuItemRow({ leaf }: { leaf: NavLeaf }) {
  return (
    <Link
      to={leaf.href}
      onClick={() => haptic('tap')}
      className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-secondary/40 active:bg-secondary/70"
    >
      <Plate leaf={leaf} size="md" />
      <div className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold tracking-tight leading-snug text-foreground group-hover:text-primary transition-colors">
          {leaf.label}
        </span>
        {leaf.description && (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {leaf.description}
          </span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

/** One structured category section card */
function GroupedSectionCard({ group, leaves }: { group: NavGroup; leaves: NavLeaf[] }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wider text-foreground">
          <span
            aria-hidden
            className="h-3.5 w-1.5 rounded-full"
            style={{ backgroundColor: group.color }}
          />
          {group.label}
        </h2>
        <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {leaves.length} {leaves.length === 1 ? 'pozycja' : leaves.length < 5 ? 'pozycje' : 'pozycji'}
        </span>
      </div>
      <div className="divide-y divide-border/40 overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xs">
        {leaves.map(leaf => (
          <MenuItemRow key={leaf.href} leaf={leaf} />
        ))}
      </div>
    </section>
  );
}

/** Destination as a full-width row for search hits */
function SearchHitRow({ leaf }: { leaf: NavLeaf }) {
  const group = findNavGroup(leaf.href);
  return (
    <Link
      to={leaf.href}
      onClick={() => haptic('tap')}
      className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-secondary/40 active:bg-secondary/70"
    >
      <Plate leaf={leaf} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
            {leaf.label}
          </span>
          {group && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: tint(group.color, 14), color: group.color }}
            >
              {group.label}
            </span>
          )}
        </div>
        {leaf.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{leaf.description}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

/** App footer with theme toggle, network status, version and logout */
function AppUtilitiesFooter({ onLogoutClick }: { onLogoutClick: () => void }) {
  const { theme, setTheme } = useTheme();
  const isOnline = useOnlineStatus();

  return (
    <section className="space-y-2.5 pt-2">
      <h2 className="eyebrow px-1">System & Aplikacja</h2>

      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card p-4 shadow-xs space-y-4">
        {/* Motyw */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 text-primary" />
              Motyw interfejsu
            </span>
            <span className="text-xs font-semibold text-foreground">
              {theme === 'system' ? 'Systemowy' : theme === 'dark' ? 'Ciemny' : 'Jasny'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary/60 p-1">
            {[
              { id: 'light', label: 'Jasny', icon: Sun },
              { id: 'dark', label: 'Ciemny', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor },
            ].map(opt => {
              const Icon = opt.icon;
              const active = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    haptic('tap');
                    setTheme(opt.id);
                  }}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all',
                    active
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground active:opacity-70'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status sieci i wersja */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isOnline ? 'bg-emerald-500 shadow-xs' : 'bg-amber-500'
              )}
            />
            <span className="text-muted-foreground font-medium">
              {isOnline ? 'Online (Połączono)' : 'Tryb offline'}
            </span>
          </div>
          <span className="text-muted-foreground font-mono text-[11px]">
            Leniwa Kluska v0.9.3
          </span>
        </div>

        {/* Wyloguj */}
        <div className="pt-2 border-t border-border/40">
          <button
            type="button"
            onClick={onLogoutClick}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 active:scale-[0.99]"
          >
            <LogOut className="h-4 w-4" />
            Wyloguj się
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * The redesigned "Menu" hub:
 * Complete, organized command center for every screen, tool, setting, and quick action.
 */
export default function MenuPage() {
  const { userProfile } = useUserProfile();
  const { user } = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const recentRoutes = useRecentRoutes();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory>('all');
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const role = userProfile?.role;

  // All groups available to this role
  const allSections = useMemo(
    () =>
      navItemsForRole(role)
        .filter(isNavGroup)
        .map(group => ({ group, leaves: group.items }))
        .filter(section => section.leaves.length > 0),
    [role]
  );

  // Filter sections by selected category
  const filteredSections = useMemo(() => {
    if (selectedCategory === 'all') return allSections;
    return allSections.filter(section => getGroupCategory(section.group.label) === selectedCategory);
  }, [allSections, selectedCategory]);

  const results = query.trim() ? searchNavLeaves(query, role) : null;

  const recentLeaves = useMemo(() => {
    return recentRoutes
      .map(href => navLeavesForRole(role).find(leaf => leaf.href === href))
      .filter((leaf): leaf is NavLeaf => Boolean(leaf));
  }, [recentRoutes, role]);

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
    <div className="page space-y-4 pb-8">
      {/* Search Input Bar */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setSearching(true)}
            placeholder="Szukaj funkcji, ekranów, ustawień..."
            aria-label="Szukaj w aplikacji"
            enterKeyHint="go"
            onKeyDown={e => {
              if (e.key === 'Enter' && results?.[0]) {
                navigate(results[0].href);
              }
            }}
            className="h-12 w-full rounded-2xl border border-border/60 bg-card pl-10 pr-10 text-sm md:text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary [&::-webkit-search-cancel-button]:hidden shadow-xs"
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
            className="h-12 shrink-0 px-2 text-sm font-semibold text-primary active:opacity-60"
          >
            Anuluj
          </button>
        )}
      </div>

      {/* When searching: display search view */}
      {searching ? (
        results ? (
          <div aria-live="polite" className="animate-fade-in space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="eyebrow">Wyniki wyszukiwania ({results.length})</h2>
              {results.length > 0 && (
                <span className="text-xs text-muted-foreground">Wciśnij Enter, aby przejść</span>
              )}
            </div>
            {results.length > 0 ? (
              <div className="divide-y divide-border/40 overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xs">
                {results.map(leaf => (
                  <SearchHitRow key={leaf.href} leaf={leaf} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-border/70 bg-card p-6 text-center shadow-xs space-y-3">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-muted-foreground">
                  <Search className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Nic nie znaleziono dla „{query.trim()}”
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sprawdź czy nie popełniłeś literówki lub spróbuj innego hasła.
                  </p>
                </div>
                <div className="pt-2">
                  <p className="eyebrow mb-2">Popularne wyszukiwania</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {SEARCH_HINTS.map(hint => (
                      <button
                        key={hint}
                        type="button"
                        onClick={() => {
                          haptic('tap');
                          setQuery(hint);
                        }}
                        className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary/80 active:scale-95 transition-all"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fade-in space-y-4">
            {recentLeaves.length > 0 && <RecentShortcuts recentLeaves={recentLeaves} />}
            <section className="space-y-2">
              <h2 className="eyebrow px-1">Popularne hasła</h2>
              <div className="flex flex-wrap gap-2">
                {SEARCH_HINTS.map(hint => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => {
                      haptic('tap');
                      setQuery(hint);
                    }}
                    className="pressable-sm flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3.5 py-2 text-xs font-semibold shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {hint}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )
      ) : (
        /* Default Hub View */
        <div className="stagger-rise space-y-4">
          {/* Athlete Identity Card */}
          <AthleteIdentityCard />

          {/* Active Workout Alert */}
          <ActiveWorkoutAlert />

          {/* Trainer Mode Callout */}
          {role === 'trainer' && <TrainerModeBanner />}

          {/* Category Filter Pills */}
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {CATEGORY_FILTERS.map(filter => {
              const active = selectedCategory === filter.id;
              const Icon = filter.icon;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => {
                    haptic('tap');
                    setSelectedCategory(filter.id);
                  }}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95',
                    active
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'border border-border/60 bg-card text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>

          {/* Hero Quick Actions (shown when 'all' is selected) */}
          {selectedCategory === 'all' && (
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="eyebrow">Szybkie akcje</h2>
                <span className="text-[11px] font-medium text-muted-foreground">1-tap launch</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <HeroQuickAction
                  to="/athlete/log"
                  color="hsl(var(--primary))"
                  icon={Play}
                  badge="Trening"
                  title="Trenuj teraz"
                  subtitle="Nowa sesja lub z szablonu"
                />
                <HeroQuickAction
                  to="/athlete/nutrition"
                  color="hsl(var(--food))"
                  icon={NotebookPen}
                  badge="Dieta"
                  title="Kalorie i makro"
                  subtitle="Posiłki i bilans dnia"
                />
                <HeroQuickAction
                  to="/athlete/measurements"
                  color="hsl(var(--volt))"
                  icon={Ruler}
                  badge="Forma"
                  title="Pomiary & waga"
                  subtitle="Waga, obwody, zdjęcia"
                />
                <HeroQuickAction
                  to="/athlete/running"
                  color="hsl(var(--run))"
                  icon={Footprints}
                  badge="GPS"
                  title="Bieganie"
                  subtitle="Rejestruj trasę i tempo"
                />
              </div>
            </section>
          )}

          {/* Recent Shortcuts */}
          {selectedCategory === 'all' && recentLeaves.length > 0 && (
            <RecentShortcuts recentLeaves={recentLeaves} />
          )}

          {/* Structured Category Groups */}
          <div className="space-y-4">
            {filteredSections.map(({ group, leaves }) => (
              <GroupedSectionCard key={group.label} group={group} leaves={leaves} />
            ))}
          </div>

          {/* Reset filter banner if empty or single filter selected */}
          {selectedCategory !== 'all' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  haptic('tap');
                  setSelectedCategory('all');
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Pokaż wszystkie sekcje (Wszystko)
              </button>
            </div>
          )}

          {/* System & Utilities Footer */}
          {selectedCategory === 'all' && (
            <AppUtilitiesFooter onLogoutClick={() => setLogoutDialogOpen(true)} />
          )}
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent className="rounded-3xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg uppercase tracking-wide">
              {user?.isGuest ? 'Konto gościa zostanie utracone' : 'Wylogować się?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {user?.isGuest
                ? 'Jesteś zalogowany jako gość na tym urządzeniu. Po wylogowaniu Twoje treningi, plany i historia zostaną bezpowrotnie usunięte. Czy na pewno chcesz kontynuować?'
                : 'Czy na pewno chcesz zakończyć bieżącą sesję w aplikacji Leniwa Kluska?'}
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
