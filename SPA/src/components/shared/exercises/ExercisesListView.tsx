import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Exercise, MuscleGroupName, MuscleGroup, WorkoutPlan } from '@/types';
import { useCollection, useUpdateDoc, useDeleteDoc, useCreateDoc } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
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
import { toast } from 'sonner';
import { PlusCircle, Dumbbell, Loader2 } from 'lucide-react';

import { ExerciseCardHorizontal } from './ExerciseCardHorizontal';
import { ExerciseFilters } from './ExerciseFilters';
import { ExerciseFormDialog } from './ExerciseForm';
import { ProgressDialog } from './ProgressDialog';
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
    const title = props.title ?? defaults.title ?? 'Biblioteka Ćwiczeń';
    const emptyMessage = props.emptyMessage ?? defaults.emptyMessage ?? 'Nie znaleziono żadnych ćwiczeń.';

    const { user } = useAuth();
    const userId = user?.id;

    const { mutateAsync: updateDoc } = useUpdateDoc<Exercise>('exercises');
    const { mutateAsync: deleteDoc } = useDeleteDoc('exercises');
    const { mutateAsync: createDoc } = useCreateDoc<Exercise>('exercises');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');
    const [isFormDialogOpen, setFormDialogOpen] = useState(false);
    const [isProgressDialogOpen, setProgressDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

    // Fetch exercises based on role
    const getExerciseQuery = () => {
        if (!userId) return undefined;

        if (role === 'admin') {
            return undefined; // Admin sees all
        }

        // Athlete and Trainer see public + own exercises
        return { ownerId: { $in: ['public', userId] } };
    };

    const { data: exercises, isLoading: exercisesLoading, refetch: refetchExercises } = useCollection<Exercise>(
        userId ? 'exercises' : null,
        { query: getExerciseQuery() }
    );

    // For athletes, also fetch exercises from assigned workout plans
    const { data: assignedPlans } = useCollection<WorkoutPlan>(
        role === 'athlete' && userId ? 'workoutPlans' : null,
        {
            query: role === 'athlete' && userId ? { assignedAthleteIds: { $in: [userId] } } : undefined,
            enabled: role === 'athlete' && !!userId,
        }
    );

    const exerciseIdsFromPlans = useMemo(() => {
        const ids = new Set<string>();
        if (assignedPlans) {
            assignedPlans.forEach(plan => {
                plan.workoutDays?.forEach(day => {
                    day.exercises?.forEach(ex => {
                        if (ex.exerciseId) ids.add(ex.exerciseId);
                    });
                });
            });
        }
        return Array.from(ids);
    }, [assignedPlans]);

    const { data: planExercises } = useCollection<Exercise>(
        role === 'athlete' && exerciseIdsFromPlans.length > 0 ? 'exercises' : null,
        {
            query: exerciseIdsFromPlans.length > 0 ? { id: { $in: exerciseIdsFromPlans } } : undefined,
            enabled: exerciseIdsFromPlans.length > 0,
        }
    );

    // Combine all exercises
    const allExercises = useMemo(() => {
        const combined = new Map<string, Exercise>();
        exercises?.forEach(ex => combined.set(ex.id, ex));
        planExercises?.forEach(ex => combined.set(ex.id, ex));
        return Array.from(combined.values());
    }, [exercises, planExercises]);

    const isLoading = exercisesLoading;

    // Filter exercises
    const filteredExercises = allExercises?.filter((exercise) => {
        const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exercise.mainMuscleGroups?.some(mg => mg.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            exercise.muscleGroup?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesMuscleGroup = selectedMuscleGroup === 'all' ||
            exercise.mainMuscleGroups?.some(mg => mg.name === selectedMuscleGroup) ||
            exercise.muscleGroup === selectedMuscleGroup;

        return matchesSearch && matchesMuscleGroup;
    });

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
                await updateDoc({ id: selectedExercise.id, data: updatedData });
                toast.success("Ćwiczenie zostało zaktualizowane.");
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
                    ownerId: role === 'admin' ? 'public' : userId,
                };
                await createDoc(newExerciseData as Partial<Exercise>);
                toast.success("Nowe ćwiczenie zostało dodane.");
            }
            setFormDialogOpen(false);
            setSelectedExercise(null);
            refetchExercises();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Nie udało się zapisać ćwiczenia.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!selectedExercise) return;
        setIsSubmitting(true);

        try {
            await deleteDoc(selectedExercise.id);
            toast.success("Ćwiczenie zostało usunięte.");
            setSelectedExercise(null);
            setDeleteDialogOpen(false);
            refetchExercises();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Nie udało się usunąć ćwiczenia.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Virtualization setup
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredExercises?.length ?? 0,
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
                                        userId={userId}
                                        canEdit={canEdit}
                                        canDelete={canDelete}
                                        showProgress={showProgress}
                                        showOwnerBadge={showOwnerBadge}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        onShowProgress={handleShowProgress}
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
                    userId={userId}
                    open={isProgressDialogOpen}
                    onOpenChange={setProgressDialogOpen}
                />
            )}

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
        </div>
    );
}
