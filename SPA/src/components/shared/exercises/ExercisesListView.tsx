import { useState } from 'react';
import { Exercise, MuscleGroupName } from '@/types';
import { useCollection } from '@/hooks/useCollection';
import { useDeleteDoc } from '@/hooks/useMutation';
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
import { ExercisesListViewProps, roleDefaults } from './types';

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
    const { mutate: deleteDoc, isPending: isDeleting } = useDeleteDoc('exercises');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

    // Fetch exercises based on role
    const getExerciseQuery = () => {
        if (!user?.id) return undefined;

        if (role === 'admin') {
            return undefined; // Admin sees all
        }

        // Athlete and Trainer see public + own exercises
        return { ownerId: { $in: ['public', user.id] } };
    };

    const { data: exercises, isLoading: exercisesLoading, refetch: refetchExercises } = useCollection<Exercise>(
        user?.id ? 'exercises' : null,
        { query: getExerciseQuery() }
    );

    // Combine all exercises (simplified - no workout plan exercises for now)
    const allExercises = exercises ?? [];

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
        // TODO: Open form dialog for editing
        toast.info('Edycja ćwiczenia będzie dostępna wkrótce');
    };

    const handleDelete = (exercise: Exercise) => {
        setSelectedExercise(exercise);
        setDeleteDialogOpen(true);
    };

    const handleShowProgress = (exercise: Exercise) => {
        setSelectedExercise(exercise);
        // TODO: Open progress dialog
        toast.info('Widok postępu będzie dostępny wkrótce');
    };

    const handleCreate = () => {
        setSelectedExercise(null);
        // TODO: Open form dialog for creating
        toast.info('Dodawanie ćwiczeń będzie dostępne wkrótce');
    };

    const handleDeleteConfirm = async () => {
        if (!selectedExercise) return;

        deleteDoc(
            selectedExercise.id,
            {
                onSuccess: () => {
                    toast.success('Ćwiczenie zostało usunięte.');
                    setSelectedExercise(null);
                    setDeleteDialogOpen(false);
                    refetchExercises();
                },
                onError: () => {
                    toast.error('Nie udało się usunąć ćwiczenia.');
                }
            }
        );
    };

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

            {/* Exercise List */}
            {exercisesLoading ? (
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
                <div className="flex flex-col gap-2 overflow-auto">
                    {filteredExercises.map((exercise) => (
                        <ExerciseCardHorizontal
                            key={exercise.id}
                            exercise={exercise}
                            userId={user?.id}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            showProgress={showProgress}
                            showOwnerBadge={showOwnerBadge}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onShowProgress={handleShowProgress}
                        />
                    ))}
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
                        <AlertDialogCancel onClick={() => setSelectedExercise(null)} disabled={isDeleting}>
                            Anuluj
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Usuń
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
