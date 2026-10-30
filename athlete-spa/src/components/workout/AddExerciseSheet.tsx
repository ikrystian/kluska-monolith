import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Dumbbell, Loader2, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ExerciseFilters } from '@/components/shared/exercises/ExerciseFilters';
import { EMPTY_EXERCISE_FILTERS, useExerciseLibrary, visibleExercisesScope } from '@/hooks/useExerciseLibrary';
import { resolveMediaUrl } from '@/lib/api-client';
import { useDoc, useUser } from '@/lib/db-hooks';
import { MuscleGroupName } from '@/lib/types';
import type { Exercise, UserProfile } from '@/lib/types';

const muscleGroupOptions = Object.values(MuscleGroupName).map(name => ({ label: name, value: name }));

type Step = 'body' | 'results';

function ExerciseRow({ exercise, onPick }: { exercise: Exercise; onPick: (id: string) => void }) {
  const mediaUrl = resolveMediaUrl(exercise.mediaUrl);
  return (
    <button
      type="button"
      onClick={() => onPick(exercise.id)}
      className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-2.5 text-left transition-all hover:border-primary/30 active:scale-[0.99]"
    >
      {mediaUrl ? (
        <img src={mediaUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary/60">
          <Dumbbell className="h-5 w-5 text-muted-foreground" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{exercise.name}</span>
        <span className="mt-0.5 flex flex-wrap gap-1">
          {exercise.mainMuscleGroups?.slice(0, 2).map(mg => (
            <Badge key={mg.name} variant="secondary" className="h-4 px-1 py-0 text-[10px]">
              {mg.name}
            </Badge>
          ))}
        </span>
      </span>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-primary">
        <PlusCircle className="h-5 w-5" />
      </span>
    </button>
  );
}

/**
 * Picker for adding an exercise to the workout. It opens on a list of body
 * parts instead of a list of exercises: nothing is fetched until the athlete
 * picks one, then the first page of its exercises loads and the rest follows
 * on scroll. Search and filters are the ones of the exercise library screen.
 */
export function AddExerciseSheet({ onAddExercise }: { onAddExercise: (exerciseId: string) => void }) {
  const { user } = useUser();
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>('users', user?.uid || null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('body');
  const [filters, setFilters] = useState(EMPTY_EXERCISE_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Same visibility as the workout page itself, so every exercise picked here
  // is one the page can resolve back by its id.
  const trainerId = userProfile?.trainerId;
  const scope = useMemo(() => {
    const ownerIds = ['public'];
    if (user?.uid) ownerIds.push(user.uid);
    if (trainerId) ownerIds.push(trainerId);
    return visibleExercisesScope(ownerIds);
  }, [user?.uid, trainerId]);

  // Search reaches the server only after a pause in typing.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  const libraryFilters = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);

  const { exercises, isLoading, isLoadingMore, error, hasMore, totalFiltered, queryKey, loadMore, refetch } =
    useExerciseLibrary(libraryFilters, open && step === 'results' && !!user?.uid && !isProfileLoading, scope);

  const reset = () => {
    setStep('body');
    setFilters(EMPTY_EXERCISE_FILTERS);
    setDebouncedSearch('');
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const pickMuscle = (muscle: MuscleGroupName | 'all') => {
    setFilters(current => ({ ...current, muscleGroup: muscle }));
    setStep('results');
  };

  const pickExercise = (exerciseId: string) => {
    onAddExercise(exerciseId);
    handleOpenChange(false);
  };

  // Infinite scroll: near the bottom of the list, bring in the next page.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300 && hasMore && !isLoadingMore) loadMore();
  }, [hasMore, isLoadingMore, loadMore]);

  // New search or filters start from the top of the list.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [queryKey]);

  // A page that doesn't fill the container never scrolls — fetch the next one right away.
  useEffect(() => {
    handleScroll();
  }, [handleScroll, exercises.length]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button size="icon" className="hero-ember h-12 w-12 rounded-full text-white shadow-glow transition-transform hover:opacity-95 active:scale-90">
          <PlusCircle className="h-6 w-6" />
          <span className="absolute bottom-0 text-xs">Dodaj kolejne ćwiczenie</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="flex h-[85vh] flex-col gap-3 rounded-t-[2rem] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2">
            {step === 'results' && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-ml-2 h-9 w-9 shrink-0"
                aria-label="Wróć do wyboru partii ciała"
                onClick={() => setStep('body')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <SheetTitle className="font-headline">Wybierz ćwiczenie</SheetTitle>
          </div>
          <SheetDescription>
            {step === 'body' ? 'Zacznij od partii ciała, którą chcesz trenować.' : 'Znajdź i dodaj ćwiczenie do swojego treningu.'}
          </SheetDescription>
        </SheetHeader>

        {step === 'body' ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {muscleGroupOptions.map(option => (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  className="h-12 justify-start rounded-2xl px-4 font-semibold"
                  onClick={() => pickMuscle(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Button type="button" variant="ghost" className="mt-1 h-10 rounded-full text-muted-foreground" onClick={() => pickMuscle('all')}>
              Pokaż wszystkie ćwiczenia
            </Button>
          </div>
        ) : (
          <>
            <ExerciseFilters
              filters={filters}
              onChange={setFilters}
              muscleGroupOptions={muscleGroupOptions}
              resultCount={isLoading ? undefined : totalFiltered}
            />

            <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[4.25rem] w-full rounded-2xl" />)
              ) : error ? (
                <div className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
                  <p className="text-sm">Nie udało się pobrać ćwiczeń.</p>
                  <Button type="button" variant="outline" size="sm" onClick={refetch}>
                    Spróbuj ponownie
                  </Button>
                </div>
              ) : exercises.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
                  <Dumbbell className="h-6 w-6" />
                  <p className="text-sm">Brak wyników — zmień filtry lub wyszukiwanie.</p>
                </div>
              ) : (
                <>
                  {exercises.map(exercise => (
                    <ExerciseRow key={exercise.id} exercise={exercise} onPick={pickExercise} />
                  ))}
                  {isLoadingMore && (
                    <div className="flex justify-center py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
