import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpDown,
  Clock,
  Dumbbell,
  Flame,
  LayoutGrid,
  List,
  Play,
  Plus,
  Search,
  Sparkles,
  X,
  Layers,
  Calendar,
} from 'lucide-react';
import { useCollection, useUser, useCreateDoc, useDeleteDoc } from '@/lib/db-hooks';
import type { Workout, WorkoutLog } from '@/lib/types';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/section';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { useToast } from '@/hooks/use-toast';
import { WorkoutGridCard, WorkoutListRow } from '@/components/workouts/WorkoutCard';
import { ScheduleWorkoutDialog } from '@/components/workouts/ScheduleWorkoutDialog';
import { TemplatePreviewSheet } from '@/components/workout/TemplateCards';
import {
  recommendTemplate,
  FOCUS_META,
  FOCUS_ORDER,
  templateCover,
  templateFocus,
  lastSessionOf,
  type TemplateFocus,
} from '@/components/workout/template-meta';
import { exerciseCount, totalSets } from '@/components/workouts/workout-format';
import { plural } from '@/lib/plural';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ScopeFilter = 'all' | 'mine' | 'public';
type SortOption = 'recent' | 'name-asc' | 'duration-asc' | 'duration-desc' | 'exercises-desc';
type ViewMode = 'grid' | 'list';

const SCOPE_TABS: { id: ScopeFilter; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'mine', label: 'Moje' },
  { id: 'public', label: 'Publiczne' },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'recent', label: 'Ostatnio wykonane' },
  { id: 'name-asc', label: 'Nazwa (A-Z)' },
  { id: 'duration-asc', label: 'Czas trwania: najkrótsze' },
  { id: 'duration-desc', label: 'Czas trwania: najdłuższe' },
  { id: 'exercises-desc', label: 'Najwięcej ćwiczeń' },
];

export default function AthleteWorkoutsPage() {
  const { hasActiveWorkout, activeWorkout } = useActiveWorkout();
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  const { createDoc } = useCreateDoc();
  const { deleteDoc } = useDeleteDoc();

  // Filters & State
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [focusFilter, setFocusFilter] = useState<TemplateFocus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showRecommendation, setShowRecommendation] = useState(true);

  // View mode with persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem('athlete-workouts-view') as ViewMode) || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    haptic('selection');
    try {
      localStorage.setItem('athlete-workouts-view', mode);
    } catch {
      // ignore storage errors
    }
  };

  // Modals
  const [schedulingWorkout, setSchedulingWorkout] = useState<Workout | null>(null);
  const [deletingWorkout, setDeletingWorkout] = useState<Workout | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Workouts
  const { data: workouts, isLoading, refetch } = useCollection<Workout>(
    user ? 'workouts' : null,
    user ? { $or: [{ ownerId: 'public' }, { ownerId: user.uid }] } : undefined
  );

  // Fetch Logs to know last completed session per template
  const { data: historyLogs } = useCollection<WorkoutLog>(
    user ? 'workoutLogs' : null,
    user ? { athleteId: user.uid, status: 'completed' } : undefined
  );

  // Counts
  const myCount = useMemo(
    () => (workouts ?? []).filter(w => w.ownerId && w.ownerId !== 'public' && w.ownerId === user?.uid).length,
    [workouts, user?.uid]
  );
  const publicCount = useMemo(
    () => (workouts ?? []).filter(w => w.ownerId === 'public').length,
    [workouts]
  );

  // Daily recommendation (based on muscle recovery readiness)
  const recommendation = useMemo(() => {
    if (!workouts || workouts.length === 0) return null;
    return recommendTemplate(workouts, historyLogs);
  }, [workouts, historyLogs]);

  // Filtering & Sorting
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (workouts ?? []).filter(w => {
      // 1. Scope filter
      if (scopeFilter === 'mine') {
        if (w.ownerId === 'public' || w.ownerId !== user?.uid) return false;
      } else if (scopeFilter === 'public') {
        if (w.ownerId !== 'public') return false;
      }

      // 2. Muscle focus filter
      if (focusFilter !== 'all') {
        const focus = templateFocus(w.exerciseSeries);
        if (focus !== focusFilter) return false;
      }

      // 3. Search query: matches workout name, description, or exercise names
      if (q) {
        const matchName = w.name.toLowerCase().includes(q);
        const matchDesc = Boolean(w.description && w.description.toLowerCase().includes(q));
        const matchExercise = (w.exerciseSeries ?? []).some(s =>
          s.exercise?.name?.toLowerCase().includes(q)
        );
        if (!matchName && !matchDesc && !matchExercise) return false;
      }

      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name, 'pl');
      }
      if (sortBy === 'duration-asc') {
        return (a.durationMinutes || 0) - (b.durationMinutes || 0);
      }
      if (sortBy === 'duration-desc') {
        return (b.durationMinutes || 0) - (a.durationMinutes || 0);
      }
      if (sortBy === 'exercises-desc') {
        return (b.exerciseSeries?.length || 0) - (a.exerciseSeries?.length || 0);
      }

      // 'recent' default: most recently logged workouts first
      const lastA = lastSessionOf(a, historyLogs);
      const lastB = lastSessionOf(b, historyLogs);
      if (lastA && lastB) {
        return new Date(lastB.endTime).getTime() - new Date(lastA.endTime).getTime();
      }
      if (lastA) return -1;
      if (lastB) return 1;

      // Fallback: own templates first, then alphabetical
      return Number(a.ownerId === 'public') - Number(b.ownerId === 'public') || a.name.localeCompare(b.name, 'pl');
    });
  }, [workouts, scopeFilter, focusFilter, query, sortBy, user?.uid, historyLogs]);

  const hasFilters = scopeFilter !== 'all' || focusFilter !== 'all' || query.trim() !== '';

  const handleResetFilters = () => {
    setScopeFilter('all');
    setFocusFilter('all');
    setQuery('');
    haptic('tap');
  };

  // Actions
  const handleStartWorkout = (workout: Workout) => {
    haptic('tap');
    if (hasActiveWorkout) {
      navigate(`/athlete/log?logId=${activeWorkout?.id}`);
    } else {
      navigate(`/athlete/log?workoutId=${workout.id}`);
    }
  };

  const handleDuplicateWorkout = async (w: Workout) => {
    if (!user) return;
    try {
      const copy: Omit<Workout, 'id'> = {
        ...w,
        name: `${w.name} (kopia)`,
        ownerId: user.uid,
        sourceWorkoutId: w.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      delete (copy as any).id;
      delete (copy as any)._id;

      await createDoc('workouts', copy);
      toast({
        title: 'Szablon skopiowany',
        description: `Utworzono „${copy.name}” w Twoich szablonach.`,
      });
      refetch();
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się skopiować szablonu.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingWorkout) return;
    setIsDeleting(true);
    try {
      await deleteDoc('workouts', deletingWorkout.id);
      toast({
        title: 'Szablon usunięty',
        description: `Szablon „${deletingWorkout.name}” został usunięty.`,
      });
      setDeletingWorkout(null);
      refetch();
    } catch {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć szablonu.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page stagger-rise space-y-4">
      {/* Top Header & CTAs */}
      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            Szablony treningowe
          </h1>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {isLoading
              ? 'Wczytywanie bazy…'
              : `${plural(workouts?.length ?? 0, 'szablon', 'szablony', 'szablonów')} w bazie · ${myCount} Twoich`}
          </p>
        </div>

        <div data-tour="workouts-actions" className="flex items-center gap-2">
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="h-10 flex-1 gap-1.5 rounded-xl text-xs font-semibold sm:flex-none"
          >
            <Link to="/athlete/log">
              <Play className="h-3.5 w-3.5 fill-primary text-primary" /> Pusty trening
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="h-10 flex-1 gap-1.5 rounded-xl text-xs font-bold shadow-sm sm:flex-none"
          >
            <Link to="/athlete/workouts/create">
              <Plus className="h-4 w-4" /> Nowy szablon
            </Link>
          </Button>
        </div>
      </div>

      {/* Active Workout Banner */}
      {hasActiveWorkout && (
        <button
          type="button"
          onClick={() => navigate(`/athlete/log?logId=${activeWorkout?.id}`)}
          className="group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/95 to-amber-600 p-4 text-left text-primary-foreground shadow-md transition-all active:scale-[0.98]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
              <Flame className="h-6 w-6 animate-pulse text-white" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground/80">
                <span className="inline-block h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                <span>Trening w toku</span>
              </div>
              <p className="truncate font-display text-2xl font-bold uppercase leading-tight sm:text-3xl">
                {activeWorkout?.workoutName ?? 'Aktywny trening'}
              </p>
            </div>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-foreground text-primary transition-transform group-hover:scale-105">
            <ArrowRight className="h-5 w-5" />
          </span>
        </button>
      )}

      {/* Daily Recommendation Hero */}
      {showRecommendation && recommendation && !hasFilters && (
        <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-card shadow-sm">
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-secondary/60 sm:aspect-[24/9]">
            <img
              src={templateCover(recommendation.template)}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-black/40 to-black/60" />

            {/* Badges */}
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                <Sparkles className="h-3 w-3" /> Polecany na dziś
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      FOCUS_META[templateFocus(recommendation.template.exerciseSeries)].accent,
                  }}
                />
                {FOCUS_META[templateFocus(recommendation.template.exerciseSeries)].label}
              </span>
            </div>

            <button
              type="button"
              aria-label="Ukryj polecany"
              onClick={() => setShowRecommendation(false)}
              className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white/80 backdrop-blur-md transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="absolute bottom-2.5 left-3.5 right-3.5">
              <p className="text-xs font-semibold text-white/80">{recommendation.reason}</p>
              <h2 className="line-clamp-1 font-display text-2xl font-bold uppercase text-white drop-shadow-sm sm:text-3xl">
                {recommendation.template.name}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">
              {recommendation.template.durationMinutes} min ·{' '}
              {exerciseCount(recommendation.template.exerciseSeries?.length ?? 0)} ·{' '}
              {totalSets(recommendation.template.exerciseSeries)} serii
            </p>

            <div className="flex items-center gap-2">
              <TemplatePreviewSheet
                template={recommendation.template}
                trigger={
                  <Button variant="secondary" size="sm" className="h-9 px-3.5 text-xs font-semibold">
                    Podgląd
                  </Button>
                }
                onStart={() => handleStartWorkout(recommendation.template)}
                lastSession={lastSessionOf(recommendation.template, historyLogs)}
              />
              <Button
                size="sm"
                onClick={() => handleStartWorkout(recommendation.template)}
                className="h-9 gap-1.5 rounded-xl px-4 text-xs font-bold"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Rozpocznij
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Search & Filter Controls */}
      <div data-tour="workouts-filters" className="space-y-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Szukaj szablonu lub ćwiczenia…"
            className="h-11 rounded-xl bg-card pl-10 pr-9 text-sm"
          />
          {query.trim() !== '' && (
            <button
              type="button"
              aria-label="Wyczyść szukanie"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Scope Tabs (Wszystkie / Moje / Publiczne) */}
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/50 bg-card p-1">
          {SCOPE_TABS.map(tab => {
            const isSelected = scopeFilter === tab.id;
            const count =
              tab.id === 'all'
                ? workouts?.length
                : tab.id === 'mine'
                  ? myCount
                  : publicCount;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setScopeFilter(tab.id);
                  haptic('selection');
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all',
                  isSelected
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                {count !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                      isSelected
                        ? 'bg-background/80 text-foreground'
                        : 'bg-secondary/60 text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Muscle Focus Pills Carousel */}
        <div
          className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4"
          role="tablist"
          aria-label="Filtr partii mięśniowych"
        >
          <button
            type="button"
            role="tab"
            aria-selected={focusFilter === 'all'}
            onClick={() => {
              setFocusFilter('all');
              haptic('selection');
            }}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
              focusFilter === 'all'
                ? 'bg-foreground text-background shadow-sm'
                : 'bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
            )}
          >
            Wszystkie partie
          </button>
          {FOCUS_ORDER.map(focusKey => {
            const meta = FOCUS_META[focusKey];
            const isSelected = focusFilter === focusKey;
            return (
              <button
                key={focusKey}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setFocusFilter(focusKey);
                  haptic('selection');
                }}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                  isSelected
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: meta.accent }}
                />
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Sub-toolbar: Count + Sort + View mode switcher */}
        <div className="flex items-center justify-between px-0.5 pt-1 text-xs">
          <span className="font-medium text-muted-foreground">
            {isLoading ? (
              'Szukanie…'
            ) : (
              <span>
                Znaleziono <strong className="text-foreground">{visible.length}</strong>{' '}
                {plural(visible.length, 'szablon', 'szablony', 'szablonów')}
              </span>
            )}
          </span>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/50 bg-card px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  <span className="hidden sm:inline">
                    {SORT_OPTIONS.find(s => s.id === sortBy)?.label}
                  </span>
                  <span className="sm:hidden">Sortuj</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {SORT_OPTIONS.map(opt => (
                  <DropdownMenuItem
                    key={opt.id}
                    onClick={() => {
                      setSortBy(opt.id);
                      haptic('selection');
                    }}
                    className={cn(
                      'text-xs font-medium',
                      sortBy === opt.id && 'font-bold text-primary'
                    )}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg border border-border/50 bg-card p-0.5">
              <button
                type="button"
                aria-label="Widok siatki"
                onClick={() => handleViewChange('grid')}
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-md transition-colors',
                  viewMode === 'grid'
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Widok listy"
                onClick={() => handleViewChange('list')}
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-md transition-colors',
                  viewMode === 'list'
                    ? 'bg-secondary text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main List / Grid Display */}
      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-border/50 bg-card"
              >
                <Skeleton className="aspect-[16/10] w-full" />
                <div className="space-y-2 p-3.5">
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                  <div className="flex gap-1.5 pt-2">
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 rounded-2xl border border-border/40 bg-card p-3"
              >
                <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4 rounded-md" />
                  <Skeleton className="h-3.5 w-1/2 rounded-md" />
                </div>
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        )
      ) : visible.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visible.map(w => (
              <WorkoutGridCard
                key={w.id}
                workout={w}
                to={`/athlete/workouts/${w.id}`}
                logs={historyLogs}
                isOwner={Boolean(user && w.ownerId === user.uid)}
                onStart={handleStartWorkout}
                onSchedule={setSchedulingWorkout}
                onDuplicate={handleDuplicateWorkout}
                onDelete={setDeletingWorkout}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map(w => (
              <WorkoutListRow
                key={w.id}
                workout={w}
                to={`/athlete/workouts/${w.id}`}
                logs={historyLogs}
                isOwner={Boolean(user && w.ownerId === user.uid)}
                onStart={handleStartWorkout}
                onSchedule={setSchedulingWorkout}
                onDuplicate={handleDuplicateWorkout}
                onDelete={setDeletingWorkout}
              />
            ))}
          </div>
        )
      ) : (
        <EmptyState
          icon={hasFilters ? Search : Dumbbell}
          title={hasFilters ? 'Nic nie znaleziono' : 'Brak szablonów'}
          description={
            hasFilters
              ? 'Nie znaleziono treningów pasujących do Twoich filtrów lub szukanej frazy.'
              : scopeFilter === 'mine'
                ? 'Nie utworzyłeś jeszcze żadnych własnych szablonów treningowych.'
                : 'Brak dostępnych szablonów w tej kategorii.'
          }
          action={
            hasFilters ? (
              <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                Wyczyść filtry
              </Button>
            ) : scopeFilter === 'mine' ? (
              <div className="flex justify-center gap-2">
                <Button asChild size="sm">
                  <Link to="/athlete/workouts/create">
                    <Plus className="h-4 w-4" /> Stwórz pierwszy szablon
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setScopeFilter('public')}
                >
                  Przeglądaj publiczne
                </Button>
              </div>
            ) : (
              <Button asChild size="sm">
                <Link to="/athlete/workouts/create">
                  <Plus className="h-4 w-4" /> Utwórz szablon
                </Link>
              </Button>
            )
          }
        />
      )}

      {/* Schedule Workout Dialog */}
      {schedulingWorkout && (
        <ScheduleWorkoutDialog
          workout={schedulingWorkout}
          open={Boolean(schedulingWorkout)}
          onOpenChange={open => !open && setSchedulingWorkout(null)}
        />
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deletingWorkout)}
        onOpenChange={open => !open && setDeletingWorkout(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć szablon?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć szablon „{deletingWorkout?.name}”? Tej operacji nie można
              cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Usuwanie…' : 'Usuń szablon'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
