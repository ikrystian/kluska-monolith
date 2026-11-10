'use client';

import { useState, useEffect, useMemo } from 'react';
import { Exercise, MuscleGroupName } from '@/lib/types';
import { useUser, useUpdateDoc, useDeleteDoc, useCreateDoc } from '@/lib/db-hooks';
import { EMPTY_EXERCISE_FILTERS, useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { useFavoriteExercises } from '@/hooks/useFavoriteExercises';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, PlusCircle, Dumbbell, Loader2, Trash2 } from 'lucide-react';

import { ExerciseFilters } from './ExerciseFilters';
import { ExerciseFormDialog } from './ExerciseForm';
import { ProgressDialog } from './ProgressDialog';
import { ExerciseDetailDialog } from './ExerciseDetailDialog';
import { ExerciseResults, ViewModeToggle, useExerciseViewMode } from './ExerciseResults';
import { ExercisesListViewProps, ExerciseFormData, roleDefaults } from './types';

export function ExercisesListView(props: ExercisesListViewProps) {
  const { role } = props;
  const defaults = roleDefaults[role];

  // Merge props with defaults
  const canCreate = props.canCreate ?? defaults.canCreate ?? false;
  const canEdit = props.canEdit ?? defaults.canEdit ?? false;
  const canDelete = props.canDelete ?? defaults.canDelete ?? false;
  const showProgress = props.showProgress ?? defaults.showProgress ?? false;
  const showOwnerBadge = props.showOwnerBadge ?? defaults.showOwnerBadge ?? false;
  const showBulkDelete = props.showBulkDelete ?? defaults.showBulkDelete ?? false;
  const title = props.title ?? defaults.title ?? 'Biblioteka Ćwiczeń';
  const emptyMessage = props.emptyMessage ?? defaults.emptyMessage ?? 'Nie znaleziono żadnych ćwiczeń.';

  const { user } = useUser();
  const { toast } = useToast();
  const { updateDoc } = useUpdateDoc();
  const { deleteDoc } = useDeleteDoc();
  const { createDoc } = useCreateDoc();

  const [filters, setFilters] = useState(EMPTY_EXERCISE_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isFormDialogOpen, setFormDialogOpen] = useState(false);
  const [isProgressDialogOpen, setProgressDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setDetailDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [viewMode, setViewMode] = useExerciseViewMode();
  // Ulubione są osobiste — tylko sportowiec ma je na liście (trener/admin zarządza bazą).
  const { favoriteIds, favoriteSet, toggleFavorite } = useFavoriteExercises();
  const showFavorites = role === 'athlete';

  // Wyszukiwanie trafia do serwera dopiero po chwili bez pisania.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  const libraryFilters = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);

  // Serwerowa biblioteka: pierwsze 30 ćwiczeń + infinite scroll, filtrowanie po stronie serwera.
  const {
    exercises,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    totalAll,
    totalFiltered,
    queryKey,
    loadMore,
    refetch: refetchExercises,
  } = useExerciseLibrary(libraryFilters, !!user?.uid, undefined, showFavorites ? favoriteIds : undefined);

  const allExercises = exercises;
  const filteredExercises = exercises;

  const muscleGroupOptions = Object.values(MuscleGroupName).map((name) => ({
    label: name,
    value: name,
  }));

  // Handlers
  const handleEdit = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setFormDialogOpen(true);
  };

  const handleDelete = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setDeleteDialogOpen(true);
  };

  const handleShowProgress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setProgressDialogOpen(true);
  };

  const handleShowDetail = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setDetailDialogOpen(true);
  };

  const canEditExercise = (exercise: Exercise) =>
    canEdit && (exercise.ownerId === user?.uid || role === 'admin');

  const handleDetailEdit = (exercise: Exercise) => {
    setDetailDialogOpen(false);
    handleEdit(exercise);
  };

  const handleDetailProgress = (exercise: Exercise) => {
    setDetailDialogOpen(false);
    handleShowProgress(exercise);
  };

  const handleCreate = () => {
    setSelectedExercise(null);
    setFormDialogOpen(true);
  };

  const handleFormSubmit = async (data: ExerciseFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    const mainMuscleGroups = data.mainMuscleGroups.map((name) => ({ name: name as MuscleGroupName }));
    const secondaryMuscleGroups = (data.secondaryMuscleGroups || []).map((name) => ({
      name: name as MuscleGroupName,
    }));

    try {
      if (selectedExercise) {
        const updatedData = {
          name: data.name,
          mainMuscleGroups,
          secondaryMuscleGroups,
          instructions: data.instructions || data.description,
          mediaUrl: data.mediaUrl,
          type: data.type,
          description: data.instructions || data.description,
          muscleGroup: data.mainMuscleGroups[0],
          image: data.mediaUrl,
          imageHint: data.name.toLowerCase(),
        };
        await updateDoc('exercises', selectedExercise.id, updatedData);
        toast({ title: "Sukces!", description: "Ćwiczenie zostało zaktualizowane." });
      } else {
        const newExerciseData = {
          name: data.name,
          mainMuscleGroups,
          secondaryMuscleGroups,
          instructions: data.instructions || data.description,
          mediaUrl: data.mediaUrl,
          type: data.type,
          description: data.instructions || data.description,
          muscleGroup: data.mainMuscleGroups[0],
          image: data.mediaUrl,
          imageHint: data.name.toLowerCase(),
          ownerId: role === 'admin' ? 'public' : user.uid,
        };
        await createDoc('exercises', newExerciseData);
        toast({ title: "Sukces!", description: "Nowe ćwiczenie zostało dodane." });
      }
      setFormDialogOpen(false);
      setSelectedExercise(null);
      refetchExercises();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zapisać ćwiczenia.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExercise) return;
    setIsSubmitting(true);

    try {
      await deleteDoc('exercises', selectedExercise.id);
      toast({ title: "Sukces!", description: "Ćwiczenie zostało usunięte." });
      setSelectedExercise(null);
      setDeleteDialogOpen(false);
      refetchExercises();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się usunąć ćwiczenia.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!allExercises || allExercises.length === 0) return;
    setIsSubmitting(true);

    try {
      await Promise.all(allExercises.map((ex) => deleteDoc('exercises', ex.id)));
      toast({
        title: "Sukces!",
        description: `Usunięto ${allExercises.length} ćwiczeń.`,
      });
      setBulkDeleteDialogOpen(false);
      refetchExercises();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się usunąć ćwiczeń.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFavorite = (exercise: Exercise) => void toggleFavorite(exercise.id);

  const countLabel = isLoading
    ? 'Ładowanie…'
    : totalFiltered === totalAll
      ? `${totalAll} ćwiczeń w bazie`
      : `${totalFiltered} z ${totalAll} ćwiczeń`;

  return (
    <div className="page h-full flex flex-col">
      <div className="mb-3 flex flex-shrink-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-muted-foreground">{countLabel}</p>
          <div className="flex flex-shrink-0 items-center gap-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            {showBulkDelete && allExercises && allExercises.length > 0 && (
              <Button
                onClick={() => setBulkDeleteDialogOpen(true)}
                variant="destructive"
                className="h-10 rounded-full"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Usuń wszystkie ({allExercises.length})</span>
              </Button>
            )}
            {canCreate && (
              <Button onClick={handleCreate} className="h-10 w-10 p-0">
                <Plus className="h-5 w-5" />
                <span className="sr-only">Dodaj ćwiczenie</span>
              </Button>
            )}
          </div>
        </div>
        <ExerciseFilters
          filters={filters}
          onChange={setFilters}
          muscleGroupOptions={muscleGroupOptions}
          resultCount={isLoading ? undefined : totalFiltered}
        />
      </div>

      <ExerciseResults
        exercises={filteredExercises}
        viewMode={viewMode}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        error={error}
        hasMore={hasMore}
        loadMore={loadMore}
        queryKey={queryKey}
        onRetry={refetchExercises}
        getCardProps={(exercise) => ({
          userId: user?.uid,
          canEdit,
          canDelete,
          showProgress,
          showOwnerBadge,
          onEdit: handleEdit,
          onDelete: handleDelete,
          onShowProgress: handleShowProgress,
          onClick: handleShowDetail,
          allowNonOwnerEdit: role === 'admin',
          allowNonOwnerDelete: role === 'admin',
          isFavorite: favoriteSet.has(exercise.id),
          onToggleFavorite: showFavorites ? handleToggleFavorite : undefined,
        })}
        empty={
          <Card className="flex flex-col items-center justify-center rounded-2xl border-dashed py-16">
            <CardContent className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Dumbbell className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-headline text-xl font-semibold mb-2">Brak ćwiczeń</h3>
              <p className="mx-auto mb-4 max-w-sm text-sm text-muted-foreground">{emptyMessage}</p>
              {canCreate && (
                <Button variant="outline"  onClick={handleCreate}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Dodaj Ćwiczenie
                </Button>
              )}
            </CardContent>
          </Card>
        }
      />

      {/* Form Dialog */}
      <ExerciseFormDialog
        exercise={selectedExercise}
        isOpen={isFormDialogOpen}
        onClose={() => {
          setFormDialogOpen(false);
          setSelectedExercise(null);
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        muscleGroupOptions={muscleGroupOptions}
        showImageUpload={canCreate || role === 'admin'}
      />

      {/* Progress Dialog */}
      {showProgress && (
        <ProgressDialog
          exercise={selectedExercise}
          userId={user?.uid}
          open={isProgressDialogOpen}
          onOpenChange={setProgressDialogOpen}
        />
      )}

      {/* Detail Dialog */}
      <ExerciseDetailDialog
        exercise={selectedExercise}
        open={isDetailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onShowProgress={showProgress ? handleDetailProgress : undefined}
        onEdit={selectedExercise && canEditExercise(selectedExercise) ? handleDetailEdit : undefined}
        isFavorite={!!selectedExercise && favoriteSet.has(selectedExercise.id)}
        onToggleFavorite={showFavorites ? handleToggleFavorite : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć to ćwiczenie?</AlertDialogTitle>
            <AlertDialogDescription>
              Tej operacji nie można cofnąć. To spowoduje trwałe usunięcie ćwiczenia
              <span className="font-semibold"> &quot;{selectedExercise?.name}&quot; </span>
              z bazy danych.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedExercise(null)} disabled={isSubmitting}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć WSZYSTKIE ćwiczenia?</AlertDialogTitle>
            <AlertDialogDescription>
              Tej operacji nie można cofnąć. To spowoduje trwałe usunięcie
              <span className="font-semibold"> {allExercises?.length || 0} ćwiczeń </span>
              z bazy danych.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń wszystkie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}