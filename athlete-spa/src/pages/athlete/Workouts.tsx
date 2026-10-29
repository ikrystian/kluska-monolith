import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Dumbbell, Plus, Search } from 'lucide-react';
import { useCollection, useUser } from '@/lib/db-hooks';
import type { Workout } from '@/lib/types';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { WorkoutCard } from '@/components/workouts/WorkoutCard';

type Filter = 'all' | 'mine' | 'public';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'mine', label: 'Moje' },
  { id: 'public', label: 'Publiczne' },
];

export default function AthleteWorkoutsPage() {
  const { hasActiveWorkout, activeWorkout } = useActiveWorkout();
  const navigate = useNavigate();
  const { user } = useUser();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const { data: workouts, isLoading } = useCollection<Workout>(
    user ? 'workouts' : null,
    user ? { $or: [{ ownerId: 'public' }, { ownerId: user.uid }] } : undefined
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (workouts ?? [])
      .filter(w => (filter === 'all' ? true : filter === 'public' ? w.ownerId === 'public' : w.ownerId !== 'public'))
      .filter(w => !q || w.name.toLowerCase().includes(q))
      // own workouts first, then alphabetical
      .sort((a, b) => Number(a.ownerId === 'public') - Number(b.ownerId === 'public') || a.name.localeCompare(b.name, 'pl'));
  }, [workouts, filter, query]);

  const hasFilters = filter !== 'all' || query.trim() !== '';

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-28 pt-5 md:px-6 md:pt-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Siłownia</p>
          <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">Treningi</h1>
        </div>
        <Button asChild className="shrink-0 gap-1.5 rounded-full">
          <Link to="/athlete/workouts/create">
            <Plus className="h-4 w-4" />
            Nowy
          </Link>
        </Button>
      </header>

      {hasActiveWorkout && (
        <button
          type="button"
          onClick={() => navigate(`/athlete/log?logId=${activeWorkout?.id}`)}
          className="hero-ember texture-grain group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] p-5 text-left text-white shadow-glow transition-transform duration-200 active:scale-[0.98]"
        >
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[1.1rem] border-white/10" />
          <div className="relative min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/75">Trening w toku</p>
            <p className="mt-1 truncate font-display text-xl font-extrabold uppercase leading-tight">
              {activeWorkout?.workoutName ?? 'Aktywny trening'}
            </p>
          </div>
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-primary shadow-lg transition-transform group-hover:scale-105">
            <ArrowRight className="h-5 w-5" />
          </span>
        </button>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Szukaj treningu…"
            className="h-11 rounded-full border-border/60 bg-card pl-10 shadow-soft"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                filter === f.id ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-[1.75rem]" />
          ))}
        </div>
      ) : visible.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(w => (
            <WorkoutCard key={w.id} workout={w} to={`/athlete/workouts/${w.id}`} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.75rem] border-2 border-dashed border-border/70 px-6 py-14 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary">
            <Dumbbell className="h-6 w-6 text-muted-foreground" />
          </span>
          <h2 className="mt-4 font-headline text-lg font-bold">
            {hasFilters ? 'Nic nie znaleziono' : 'Brak treningów'}
          </h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            {hasFilters ? 'Zmień filtr lub wyszukiwaną frazę.' : 'Nie masz jeszcze żadnych treningów. Utwórz pierwszy!'}
          </p>
          <Button asChild variant={hasFilters ? 'outline' : 'default'} className="mt-5 rounded-full">
            {hasFilters ? (
              <button type="button" onClick={() => { setFilter('all'); setQuery(''); }}>Wyczyść filtry</button>
            ) : (
              <Link to="/athlete/workouts/create">Utwórz trening</Link>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
