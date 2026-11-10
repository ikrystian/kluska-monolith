import { useEffect, useMemo, useRef, useState } from 'react';
import { Dumbbell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ExerciseFilters } from '@/components/shared/exercises/ExerciseFilters';
import {
  ExerciseResults,
  type ExerciseResultsHandle,
  ViewModeToggle,
  useExerciseViewMode,
} from '@/components/shared/exercises/ExerciseResults';
import { ExercisePreviewPager } from '@/components/workout/ExercisePreviewPager';
import { EMPTY_EXERCISE_FILTERS, useExerciseLibrary, visibleExercisesScope } from '@/hooks/useExerciseLibrary';
import { useFavoriteExercises } from '@/hooks/useFavoriteExercises';
import { useDoc, useUser } from '@/lib/db-hooks';
import { MuscleGroupName } from '@/lib/types';
import type { Exercise, UserProfile } from '@/lib/types';

const muscleGroupOptions = Object.values(MuscleGroupName).map(name => ({ label: name, value: name }));

const noop = () => undefined;

export interface AddExerciseSheetProps {
  onAddExercise: (exerciseId: string, exercise?: Exercise) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
}

/**
 * Picker for adding an exercise to the workout. It looks and filters like the
 * exercise library screen (same cards, list/grid toggle, favourites first),
 * loading 30 exercises at a time as the list scrolls. Tapping a result opens
 * its details first; it is added from there.
 */
export function AddExerciseSheet({
  onAddExercise,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  title = 'Wybierz ćwiczenie',
  description = 'Ulubione na górze, potem najpopularniejsze.',
}: AddExerciseSheetProps) {
  const { user } = useUser();
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>('users', user?.uid || null);
  const { favoriteIds, favoriteSet, toggleFavorite } = useFavoriteExercises();

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const [filters, setFilters] = useState(EMPTY_EXERCISE_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useExerciseViewMode();
  /**
   * The order the preview pages through, fixed when it opens: starring an
   * exercise moves it to the top of the list, which must not shift the page
   * the athlete is on. Pages loaded meanwhile are appended.
   */
  const [preview, setPreview] = useState<{ list: Exercise[]; index: number } | null>(null);
  const resultsRef = useRef<ExerciseResultsHandle>(null);

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
    useExerciseLibrary(libraryFilters, open && !!user?.uid && !isProfileLoading, scope, favoriteIds);

  const handleOpenChange = (next: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
    if (!next) {
      setFilters(EMPTY_EXERCISE_FILTERS);
      setDebouncedSearch('');
      setPreview(null);
    }
  };

  const pickExercise = (exerciseId: string, exercise?: Exercise) => {
    const resolvedExercise = exercise || preview?.list.find(e => e.id === exerciseId) || exercises.find(e => e.id === exerciseId);
    onAddExercise(exerciseId, resolvedExercise);
    handleOpenChange(false);
  };

  // Back on the list, keep the last previewed exercise in sight.
  const closePreview = () => {
    const id = preview?.list[preview.index]?.id;
    setPreview(null);
    if (id) resultsRef.current?.scrollToExercise(id);
  };

  useEffect(() => {
    setPreview(current => {
      if (!current) return current;
      const known = new Set(current.list.map(ex => ex.id));
      const added = exercises.filter(ex => !known.has(ex.id));
      return added.length ? { ...current, list: [...current.list, ...added] } : current;
    });
  }, [exercises]);

  // Paging through the preview pulls in the next page before reaching its end.
  useEffect(() => {
    if (preview && preview.index >= preview.list.length - 3 && hasMore && !isLoadingMore) loadMore();
  }, [preview, hasMore, isLoadingMore, loadMore]);

  const handleToggleFavorite = (exercise: Exercise) => void toggleFavorite(exercise.id);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {trigger !== undefined ? (
        trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null
      ) : (
        <SheetTrigger asChild>
          <Button type="button" variant="secondary" className="h-11 shrink-0 gap-1.5 px-3 text-sm" aria-label="Dodaj ćwiczenie">
            <Plus className="h-5 w-5" /> Ćwiczenie
          </Button>
        </SheetTrigger>
      )}
      <SheetContent
        side="bottom"
        className="flex h-[88dvh] flex-col gap-3 px-4"
        onEscapeKeyDown={(e) => {
          // Escape (and Android back) leaves the preview before the sheet.
          if (!preview) return;
          e.preventDefault();
          closePreview();
        }}
      >
        <SheetHeader>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle>{title}</SheetTitle>
              {description && <SheetDescription>{description}</SheetDescription>}
            </div>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </SheetHeader>

        <ExerciseFilters
          filters={filters}
          onChange={setFilters}
          muscleGroupOptions={muscleGroupOptions}
          resultCount={isLoading ? undefined : totalFiltered}
        />

        <ExerciseResults
          ref={resultsRef}
          exercises={exercises}
          viewMode={viewMode}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          error={error}
          hasMore={hasMore}
          loadMore={loadMore}
          queryKey={queryKey}
          onRetry={refetch}
          getCardProps={(exercise, index) => ({
            userId: user?.uid,
            canEdit: false,
            canDelete: false,
            showProgress: false,
            showOwnerBadge: false,
            onEdit: noop,
            onDelete: noop,
            onShowProgress: noop,
            onClick: () => setPreview({ list: exercises, index }),
            isFavorite: favoriteSet.has(exercise.id),
            onToggleFavorite: handleToggleFavorite,
          })}
          empty={
            <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
              <Dumbbell className="h-6 w-6" />
              <p className="text-sm">Brak wyników — zmień filtry lub wyszukiwanie.</p>
            </div>
          }
        />

        {preview && (
          <ExercisePreviewPager
            exercises={preview.list}
            index={preview.index}
            onIndexChange={(index) => setPreview(current => current && { ...current, index })}
            onAdd={pickExercise}
            onClose={closePreview}
            totalCount={totalFiltered}
            isLoadingMore={isLoadingMore}
            isFavorite={(id) => favoriteSet.has(id)}
            onToggleFavorite={(id) => void toggleFavorite(id)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
