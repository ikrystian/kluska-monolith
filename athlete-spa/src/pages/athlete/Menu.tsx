import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Search, X } from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useRecentRoutes } from '@/hooks/useRecentRoutes';
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
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/** Reached from the tab bar, so listing them here would only repeat it. Search still finds them. */
const ON_TAB_BAR = ['/athlete/log', '/athlete/social', '/athlete/you'];
const offTabBar = (leaf: NavLeaf) => !ON_TAB_BAR.includes(leaf.href.split('?')[0]);

/** Words that show what the search reaches beyond screen names: settings and features. */
const SEARCH_HINTS = ['motyw', 'powiadomienia', 'strava', 'waga', 'makro', 'wyloguj'];

const PLATE_SIZES = {
  lg: { disc: 'h-[3.25rem] w-[3.25rem]', ring: 'inset-[4px]', icon: 'h-[22px] w-[22px]' },
  md: { disc: 'h-11 w-11', ring: 'inset-[3.5px]', icon: 'h-5 w-5' },
} as const;

/**
 * A destination's icon on a disc in its domain colour, with the inner ring of
 * a weight plate — the same shape as the quick-add button on the tab bar.
 */
function Plate({ leaf, size = 'lg' }: { leaf: NavLeaf; size?: keyof typeof PLATE_SIZES }) {
  const Icon = leaf.icon;
  const color = navLeafColor(leaf);
  const s = PLATE_SIZES[size];
  return (
    <span
      className={cn('relative grid shrink-0 place-items-center rounded-full', s.disc)}
      style={{ backgroundColor: tint(color, 16), color }}
    >
      <span
        aria-hidden
        className={cn('pointer-events-none absolute rounded-full border', s.ring)}
        style={{ borderColor: tint(color, 22) }}
      />
      <Icon className={s.icon} />
    </span>
  );
}

function GroupTitle({ group }: { group: NavGroup }) {
  return (
    <h2 className="mb-3 flex items-center gap-1.5 px-1 font-display text-base font-bold uppercase leading-none tracking-wide">
      <span aria-hidden className="h-3 w-1 rounded-full" style={{ backgroundColor: group.color }} />
      {group.label}
    </h2>
  );
}

/**
 * One section as a half-width card with its screens two abreast, so the four
 * big sections make a 2×2 block and every screen keeps a fixed place on the
 * page: found by position and colour, not by reading down a list.
 */
function Folder({ group, leaves }: { group: NavGroup; leaves: NavLeaf[] }) {
  return (
    <section className="rounded-3xl bg-card px-2 pb-3 pt-3.5">
      <GroupTitle group={group} />
      <div className="grid grid-cols-2 gap-y-3">
        {leaves.map(leaf => (
          <Link
            key={leaf.href}
            to={leaf.href}
            onClick={() => haptic('tap')}
            className="pressable-sm flex min-w-0 flex-col items-center gap-1.5 text-center"
          >
            <Plate leaf={leaf} />
            <span className="w-full text-balance px-0.5 text-xs font-medium leading-[1.2]">{leaf.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** A section too small for a folder (one or two screens): a full-width card with room for the hints. */
function Shelf({ group, leaves }: { group: NavGroup; leaves: NavLeaf[] }) {
  return (
    <section className="col-span-2 rounded-3xl bg-card px-3 pb-3 pt-3.5">
      <GroupTitle group={group} />
      <div className={cn('grid gap-2', leaves.length > 1 && 'grid-cols-2')}>
        {leaves.map(leaf => (
          <Link
            key={leaf.href}
            to={leaf.href}
            onClick={() => haptic('tap')}
            className="pressable-sm flex min-w-0 items-center gap-2.5"
          >
            <Plate leaf={leaf} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-tight">{leaf.label}</span>
              {leaf.description && (
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{leaf.description}</span>
              )}
            </span>
            {leaves.length === 1 && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
          </Link>
        ))}
      </div>
    </section>
  );
}

/** A destination as a full-width row, for search hits and recent screens. */
function LeafRow({ leaf }: { leaf: NavLeaf }) {
  return (
    <Link to={leaf.href} onClick={() => haptic('tap')} className="row-tap flex items-center gap-3 px-3 py-2.5">
      <Plate leaf={leaf} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-tight">{leaf.label}</span>
        {leaf.description && <span className="block truncate text-xs text-muted-foreground">{leaf.description}</span>}
      </span>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{findNavGroup(leaf.href)?.label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

function LeafList({ title, leaves }: { title?: string; leaves: NavLeaf[] }) {
  return (
    <section>
      {title && <h2 className="eyebrow mb-1.5 px-1">{title}</h2>}
      <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
        {leaves.map(leaf => (
          <LeafRow key={leaf.href} leaf={leaf} />
        ))}
      </div>
    </section>
  );
}

/**
 * The "Menu" tab: every screen that has no tab of its own, on one screenful.
 * Sections are folders in a fixed grid, so nothing moves and nothing needs
 * scrolling to. Tapping the search opens its own view: the screens opened
 * lately first, then hits from every section, settings included.
 */
export default function MenuPage() {
  const { userProfile } = useUserProfile();
  const navigate = useNavigate();
  const recentRoutes = useRecentRoutes();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const role = userProfile?.role;
  const sections = useMemo(
    () =>
      navItemsForRole(role)
        .filter(isNavGroup)
        .map(group => ({ group, leaves: group.items.filter(offTabBar) }))
        .filter(section => section.leaves.length > 0),
    [role]
  );

  const results = query.trim() ? searchNavLeaves(query, role) : null;
  const recentLeaves = recentRoutes
    .map(href => navLeavesForRole(role).find(leaf => leaf.href === href))
    .filter((leaf): leaf is NavLeaf => Boolean(leaf));

  const closeSearch = () => {
    setQuery('');
    setSearching(false);
    inputRef.current?.blur();
  };

  return (
    <div className="page space-y-4">
      <div className="flex items-center gap-1">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setSearching(true)}
            placeholder="Szukaj ekranów i ustawień"
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
            className="h-12 shrink-0 px-2.5 text-sm font-semibold text-primary active:opacity-60"
          >
            Anuluj
          </button>
        )}
      </div>

      {!searching ? (
        <div className="stagger-rise grid grid-flow-row-dense grid-cols-2 gap-2.5">
          {sections.map(({ group, leaves }) =>
            leaves.length > 2 ? (
              <Folder key={group.label} group={group} leaves={leaves} />
            ) : (
              <Shelf key={group.label} group={group} leaves={leaves} />
            )
          )}
        </div>
      ) : results ? (
        <div aria-live="polite" className="animate-fade-in">
          {results.length > 0 ? (
            <LeafList leaves={results} />
          ) : (
            <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
              Nic nie znaleziono dla „{query.trim()}”.
            </p>
          )}
        </div>
      ) : (
        <div className="animate-fade-in space-y-5">
          {recentLeaves.length > 0 && <LeafList title="Ostatnio otwierane" leaves={recentLeaves} />}
          <section>
            <h2 className="eyebrow mb-1.5 px-1">Spróbuj wpisać</h2>
            <div className="flex flex-wrap gap-2">
              {SEARCH_HINTS.map(hint => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => {
                    haptic('tap');
                    setQuery(hint);
                  }}
                  className="pressable-sm h-9 rounded-full bg-card px-3.5 text-sm font-medium"
                >
                  {hint}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
