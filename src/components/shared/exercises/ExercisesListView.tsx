'use client';

import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Exercise, MuscleGroupName, MuscleGroup } from '@/lib/types';
import { useCollection, useUser, useUpdateDoc, useDeleteDoc, useCreateDoc } from '@/lib/db-hooks';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Dumbbell, Loader2, Trash2, Download } from 'lucide-react';

import { ExerciseCardHorizontal } from './ExerciseCardHorizontal';
import { ExerciseFilters } from './ExerciseFilters';
import { ExerciseFormDialog } from './ExerciseForm';
import { ProgressDialog } from './ProgressDialog';
import { ExerciseDetailDialog } from './ExerciseDetailDialog';
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
  const showImport = props.showImport ?? defaults.showImport ?? false;
  const title = props.title ?? defaults.title ?? 'Biblioteka Ćwiczeń';
  const emptyMessage = props.emptyMessage ?? defaults.emptyMessage ?? 'Nie znaleziono żadnych ćwiczeń.';

  const { user } = useUser();
  const { toast } = useToast();
  const { updateDoc } = useUpdateDoc();
  const { deleteDoc } = useDeleteDoc();
  const { createDoc } = useCreateDoc();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');
  const [isFormDialogOpen, setFormDialogOpen] = useState(false);
  const [isProgressDialogOpen, setProgressDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setDetailDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Fetch all exercises from the library
  const { data: exercises, isLoading, refetch: refetchExercises } = useCollection<Exercise>(
    user?.uid ? 'exercises' : null
  );

  const allExercises = useMemo(() => {
    return exercises ?? [];
  }, [exercises]);

  // Filter exercises
  const filteredExercises = useMemo(() => {
    if (!allExercises) return [];
    return allExercises.filter((exercise) => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.mainMuscleGroups?.some(mg => mg.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        exercise.muscleGroup?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMuscleGroup = selectedMuscleGroup === 'all' ||
        exercise.mainMuscleGroups?.some(mg => mg.name === selectedMuscleGroup) ||
        exercise.muscleGroup === selectedMuscleGroup;

      return matchesSearch && matchesMuscleGroup;
    });
  }, [allExercises, searchTerm, selectedMuscleGroup]);

  const muscleGroupOptions = Object.values(MuscleGroupName).map(name => ({ label: name, value: name }));

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

  const handleCreate = () => {
    setSelectedExercise(null);
    setFormDialogOpen(true);
  };

  const handleFormSubmit = async (data: ExerciseFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    // Map strings back to MuscleGroup objects
    const mainMuscleGroups: MuscleGroup[] = data.mainMuscleGroups.map(name => ({ name: name as MuscleGroupName }));
    const secondaryMuscleGroups: MuscleGroup[] = (data.secondaryMuscleGroups || []).map(name => ({ name: name as MuscleGroupName }));

    try {
      if (selectedExercise) {
        // Update existing exercise
        const updatedData = {
          name: data.name,
          mainMuscleGroups,
          secondaryMuscleGroups,
          instructions: data.instructions || data.description,
          mediaUrl: data.mediaUrl,
          type: data.type,
          description: data.instructions || data.description,
          // Legacy support
          muscleGroup: data.mainMuscleGroups[0],
          image: data.mediaUrl,
          imageHint: data.name.toLowerCase(),
        };
        await updateDoc('exercises', selectedExercise.id, updatedData);
        toast({ title: "Sukces!", description: "Ćwiczenie zostało zaktualizowane." });
      } else {
        // Create new exercise
        const newExerciseData = {
          name: data.name,
          mainMuscleGroups,
          secondaryMuscleGroups,
          instructions: data.instructions || data.description,
          mediaUrl: data.mediaUrl,
          type: data.type,
          description: data.instructions || data.description,
          // Legacy support
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
      // Delete all exercises
      await Promise.all(allExercises.map(ex => deleteDoc('exercises', ex.id)));
      toast({
        title: "Sukces!",
        description: `Usunięto ${allExercises.length} ćwiczeń.`
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

  const handleImportConfirm = async () => {
    setIsImporting(true);

    try {
      const response = await fetch('/api/admin/exercises/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Nie udało się zaimportować ćwiczeń (HTTP ${response.status}).`);
      }

      toast({
        title: "Sukces!",
        description: `Zaimportowano ${result.inserted} ćwiczeń. Pominięto ${result.skipped} istniejących (duplikatów).`,
      });
      setImportDialogOpen(false);
      refetchExercises();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zaimportować ćwiczeń.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Virtualization setup: virtualize all filtered exercises smoothly
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredExercises.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 128, // 120px height + 8px gap
    overscan: 5,
  });

  return (
    <div className="container mx-auto p-4 md:p-8 h-full flex flex-col">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between flex-shrink-0">
        <h1 className="font-headline text-3xl font-bold">{title}</h1>
        <div className="flex gap-2 flex-wrap">
          <ExerciseFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedMuscleGroup={selectedMuscleGroup}
            onMuscleGroupChange={setSelectedMuscleGroup}
            muscleGroupOptions={muscleGroupOptions}
          />
          {showBulkDelete && allExercises && allExercises.length > 0 && (
            <Button
              onClick={() => setBulkDeleteDialogOpen(true)}
              variant="destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń wszystkie ({allExercises.length})
            </Button>
          )}
          {showImport && (
            <Button
              onClick={() => setImportDialogOpen(true)}
              variant="outline"
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Importuj ćwiczenia
            </Button>
          )}
          {canCreate && (
            <Button onClick={handleCreate}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Dodaj ćwiczenie
            </Button>
          )}
        </div>
      </div>

      {/* Virtualized List Container */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-stretch bg-card border rounded-lg overflow-hidden h-[120px]">
              <Skeleton className="w-[100px] h-full flex-shrink-0" />
              <div className="flex-1 p-4 flex flex-col justify-center gap-2">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex gap-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredExercises && filteredExercises.length > 0 ? (
        <div
          ref={parentRef}
          className="flex-1 overflow-auto min-h-0"
          style={{ contain: 'strict' }}
          id="exercise-full-list"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const exercise = filteredExercises[virtualRow.index];
              if (!exercise) return null;
              return (
                <div
                  key={exercise.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="pb-2"
                >
                  <ExerciseCardHorizontal
                    exercise={exercise}
                    userId={user?.uid}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    showProgress={showProgress}
                    showOwnerBadge={showOwnerBadge}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onShowProgress={handleShowProgress}
                    onClick={handleShowDetail}
                    allowNonOwnerEdit={role === 'admin'}
                    allowNonOwnerDelete={role === 'admin'}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center border-dashed py-20">
          <CardContent className="text-center">
            <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-headline text-xl font-semibold mb-2">Brak ćwiczeń</h3>
            <p className="text-muted-foreground mb-4">{emptyMessage}</p>
            {canCreate && (
              <Button variant="outline" onClick={handleCreate}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Dodaj Ćwiczenie
              </Button>
            )}
          </CardContent>
        </Card>
      )}

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
            <AlertDialogCancel disabled={isSubmitting}>
              Anuluj
            </AlertDialogCancel>
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

      {/* Import Exercises Confirmation Dialog */}
      <AlertDialog open={isImportDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importuj ćwiczenia z biblioteki openGym?</AlertDialogTitle>
            <AlertDialogDescription>
              Importuje wszystkie ćwiczenia z pliku <b>opengym-exercises-pl.json</b>
              do bazy danych, zachowując obecną strukturę ćwiczeń.
              Ćwiczenia, które już istnieją (po nazwie), zostaną pominięte.
              Import może potrwać kilka chwil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImportConfirm}
              disabled={isImporting}
            >
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isImporting ? 'Importowanie...' : 'Importuj'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}