import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Dumbbell, Plus, Search } from 'lucide-react';
import { useCollection, useUser } from '@/lib/db-hooks';
import type { Workout } from '@/lib/types';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/section';
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
    <div className="page space-y-3">
      <Button asChild className="w-full">
        <Link to="/athlete/workouts/create">
          <Plus /> Nowy szablon
        </Link>
      </Button>

      {hasActiveWorkout && (
        <button
          type="button"
          onClick={() => navigate(`/athlete/log?logId=${activeWorkout?.id}`)}
          className="bg-primary text-primary-foreground group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl p-5 text-left transition-transform duration-200 active:scale-[0.98]"
        >
          <div className="relative min-w-0">
            <p className="text-xs font-semibold text-primary-foreground/75">Trening w toku</p>
            <p className="mt-1 truncate font-display text-3xl font-bold uppercase leading-tight">
              {activeWorkout?.workoutName ?? 'Aktywny trening'}
            </p>
          </div>
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-foreground text-primary transition-transform group-hover:scale-105">
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
            className="bg-card pl-10"
          />
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="tablist">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors',
                filter === f.id ? 'bg-foreground text-background' : 'bg-card text-muted-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : visible.length > 0 ? (
        <div className="grid gap-2">
          {visible.map(w => (
            <WorkoutCard key={w.id} workout={w} to={`/athlete/workouts/${w.id}`} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Dumbbell}
          title={hasFilters ? 'Nic nie znaleziono' : 'Brak treningów'}
          description={hasFilters ? 'Zmień filtr lub wyszukiwaną frazę.' : 'Nie masz jeszcze żadnych treningów. Utwórz pierwszy!'}
          action={
            hasFilters ? (
              <Button variant="secondary" size="sm" onClick={() => { setFilter('all'); setQuery(''); }}>Wyczyść filtry</Button>
            ) : (
              <Button asChild size="sm"><Link to="/athlete/workouts/create">Utwórz trening</Link></Button>
            )
          }
        />
      )}
    </div>
  );
}
