import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, Search, X } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useRecentRoutes } from '@/hooks/useRecentRoutes';
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
import { cn } from '@/lib/utils';

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/** Reached from the tab bar, so listing them here would only repeat it. Search still finds them. */
const ON_TAB_BAR = ['/athlete/log', '/athlete/social', '/athlete/you'];
const offTabBar = (leaf: NavLeaf) => !ON_TAB_BAR.includes(leaf.href.split('?')[0]);

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

/**
 * The "Menu" tab: every screen that has no tab of its own, laid out as a few
 * sections of tiles rather than one long list, so a destination is found by
 * its section and colour, not by reading. Search on top reaches settings too.
 */
export default function MenuPage() {
  const { userProfile } = useUserProfile();
  const navigate = useNavigate();
  const recentRoutes = useRecentRoutes();
  const [query, setQuery] = useState('');

  const role = userProfile?.role;
  const groups = useMemo(() => navItemsForRole(role).filter(isNavGroup), [role]);

  const results = query.trim() ? searchNavLeaves(query, role) : null;
  const recentLeaves = recentRoutes
    .map(href => navLeavesForRole(role).find(leaf => leaf.href === href))
    .filter((leaf): leaf is NavLeaf => Boolean(leaf));

  return (
    <div className="page stagger-rise space-y-6">
      {/* Find: search, then the screens opened lately. */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Szukaj: waga, strava, motyw…"
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
        groups.map(group => <NavSection key={group.label} group={group} />)
      )}
    </div>
  );
}
