import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '@/hooks/useCollection';
import { useDeleteDoc } from '@/hooks/useMutation';
import { useAuth } from '@/contexts/AuthContext';
import { Workout, TrainingLevel, Exercise } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Dumbbell, Clock, Signal, Search, Plus, Edit, Trash2, BarChart } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export type WorkoutsListRole = 'trainer' | 'athlete' | 'admin';

export interface WorkoutsListViewProps {
    /** The role determines query filters and UI variations */
    role: WorkoutsListRole;
    /** URL for creating new workouts */
    createHref: string;
    /** Base path for workout details (e.g., '/trainer/workouts' - id will be appended) */
    detailsBasePath: string;
    /** Page title */
    title?: string;
    /** Page description */
    description?: string;
    /** Show search input (default: true for admin, false for others) */
    showSearch?: boolean;
    /** Show delete button (default: true for admin) */
    showDelete?: boolean;
    /** Show owner badge for athlete view */
    showOwnerBadge?: boolean;
    /** Button text for create action */
    createButtonText?: string;
    /** Button text for card action */
    cardActionText?: string;
    /** Empty state message */
    emptyMessage?: string;
    /** Empty state description */
    emptyDescription?: string;
}

/**
 * Shared component for displaying workout lists.
 * Handles different configurations for trainer, athlete, and admin roles.
 */
export function WorkoutsListView({
    role,
    createHref,
    detailsBasePath,
    title,
    description,
    showSearch,
    showDelete,
    showOwnerBadge,
    createButtonText = 'Utwórz Trening',
    cardActionText,
    emptyMessage = 'Brak treningów',
    emptyDescription,
}: WorkoutsListViewProps) {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const { mutate: deleteDoc, isPending: _isDeleting } = useDeleteDoc('workouts');
    const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);

    // Determine default values based on role
    const defaultTitle = {
        trainer: 'Baza Treningów',
        athlete: 'Moje Treningi',
        admin: 'Wszystkie Treningi',
    }[role];

    const defaultDescription = {
        trainer: 'Zarządzaj treningami, które możesz przypisywać podopiecznym.',
        athlete: 'Przeglądaj i zarządzaj swoimi planami treningowymi.',
        admin: 'Zarządzaj wszystkimi treningami w systemie.',
    }[role];

    const defaultCardActionText = {
        trainer: 'Edytuj',
        athlete: 'Szczegóły',
        admin: 'Edytuj',
    }[role];

    const defaultEmptyDescription = {
        trainer: 'Nie stworzyłeś jeszcze żadnych treningów.',
        athlete: 'Nie masz jeszcze żadnych treningów. Utwórz pierwszy!',
        admin: 'Brak treningów w systemie.',
    }[role];

    // Determine query filter based on role
    const getQueryFilter = () => {
        if (!user) return undefined;

        switch (role) {
            case 'trainer':
                return { ownerId: user.id };
            case 'athlete':
                return {
                    $or: [
                        { ownerId: 'public' },
                        { ownerId: user.id }
                    ]
                };
            case 'admin':
                return undefined; // Fetch all workouts
            default:
                return undefined;
        }
    };

    const { data: workouts, isLoading, refetch } = useCollection<Workout>(
        user ? 'workouts' : null,
        { query: getQueryFilter() }
    );

    // Fetch exercises to check if any exist (only for trainer)
    const { data: exercises, isLoading: exercisesLoading } = useCollection<Exercise>(
        role === 'trainer' && user?.id ? 'exercises' : null,
        {
            query: role === 'trainer' && user?.id ? { ownerId: { $in: ['public', user.id] } } : undefined,
            limit: 1
        }
    );

    // Apply search filter for admin
    const filteredWorkouts = (showSearch ?? role === 'admin') && searchTerm
        ? workouts?.filter(workout =>
            workout.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : workouts;

    const handleDeleteWorkout = async () => {
        if (!workoutToDelete) return;
        deleteDoc(
            workoutToDelete.id,
            {
                onSuccess: () => {
                    toast.success('Trening został usunięty.');
                    setWorkoutToDelete(null);
                    refetch();
                },
                onError: () => {
                    toast.error('Nie udało się usunąć treningu.');
                }
            }
        );
    };

    const getLevelBadge = (level: TrainingLevel) => {
        switch (level) {
            case TrainingLevel.Beginner:
                return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Początkujący</Badge>;
            case TrainingLevel.Intermediate:
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Średniozaawansowany</Badge>;
            case TrainingLevel.Advanced:
                return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">Zaawansowany</Badge>;
            default:
                return <Badge variant="outline">{level}</Badge>;
        }
    };

    const shouldShowSearch = showSearch ?? role === 'admin';
    const shouldShowDelete = showDelete ?? role === 'admin';
    const shouldShowOwnerBadge = showOwnerBadge ?? role === 'athlete';

    // Check if trainer has no exercises
    const showNoExercisesMessage = role === 'trainer' && !exercisesLoading && exercises && exercises.length === 0;

    if (showNoExercisesMessage) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <Card className="border-dashed border-2">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                            <Dumbbell className="w-12 h-12 text-primary" />
                        </div>
                        <CardTitle className="text-xl mb-2">Najpierw dodaj ćwiczenia</CardTitle>
                        <CardDescription className="max-w-md mx-auto">
                            Twój trening składa się z pojedynczych ćwiczeń.
                            Aby utworzyć trening, najpierw musisz dodać ćwiczenia do swojej bazy.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-8">
                        <Link to="/trainer/exercises">
                            <Button size="lg" className="mt-4">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Dodaj pierwsze ćwiczenie
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">{title ?? defaultTitle}</h1>
                    <p className="text-muted-foreground">{description ?? defaultDescription}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {shouldShowSearch && (
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Szukaj treningów..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                    <Link to={createHref}>
                        <Button>
                            {role === 'admin' ? (
                                <Plus className="mr-2 h-4 w-4" />
                            ) : (
                                <PlusCircle className="mr-2 h-4 w-4" />
                            )}
                            {role === 'admin' ? 'Nowy Trening' : createButtonText}
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {isLoading ? (
                    Array.from({ length: role === 'admin' ? 8 : 6 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            {role !== 'admin' && <Skeleton className="h-48 w-full" />}
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            {role === 'admin' && (
                                <CardContent>
                                    <Skeleton className="h-4 w-full" />
                                </CardContent>
                            )}
                        </Card>
                    ))
                ) : filteredWorkouts && filteredWorkouts.length > 0 ? (
                    filteredWorkouts.map((workout) => (
                        <Card key={workout.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                            {/* Image section - not shown for admin */}
                            {role !== 'admin' && (
                                <div className="relative h-48 w-full bg-muted">
                                    {workout.imageUrl ? (
                                        <img
                                            src={workout.imageUrl}
                                            alt={workout.name}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            <Dumbbell className="h-12 w-12 opacity-20" />
                                        </div>
                                    )}
                                    {/* Owner badge for athlete view */}
                                    {shouldShowOwnerBadge && (
                                        <div className="absolute top-2 right-2">
                                            {workout.ownerId === 'public' ? (
                                                <Badge variant="secondary">Publiczny</Badge>
                                            ) : (
                                                <Badge variant="default">Mój</Badge>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <CardHeader>
                                <CardTitle className={role === 'admin' ? 'font-headline' : 'line-clamp-1'}>
                                    {workout.name}
                                </CardTitle>
                                {role === 'admin' ? (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {getLevelBadge(workout.level)}
                                    </div>
                                ) : (
                                    <CardDescription className="flex items-center gap-2">
                                        <Signal className="h-3 w-3" /> {workout.level}
                                    </CardDescription>
                                )}
                            </CardHeader>

                            <CardContent className="flex-grow flex flex-col">
                                <div className="flex items-center text-sm text-muted-foreground mb-2">
                                    <Clock className="h-4 w-4 mr-1" /> {workout.durationMinutes} min
                                    {role === 'admin' && (
                                        <>
                                            <span className="mx-2">•</span>
                                            <BarChart className="mr-1 h-4 w-4" />
                                        </>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {workout.exerciseSeries?.length || 0} ćwiczeń
                                </p>
                            </CardContent>

                            <CardFooter className={role === 'admin' ? '' : ''}>
                                {shouldShowDelete ? (
                                    <div className="mt-auto flex gap-2 w-full">
                                        <Button variant="outline" size="sm" className="w-full" asChild>
                                            <Link to={`${detailsBasePath}/${workout.id}`}>
                                                <Edit className="mr-2 h-3 w-3" />
                                                {cardActionText ?? defaultCardActionText}
                                            </Link>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={() => setWorkoutToDelete(workout)}
                                                >
                                                    <Trash2 className="mr-2 h-3 w-3" />
                                                    Usuń
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Czy na pewno chcesz usunąć ten trening?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Tej operacji nie można cofnąć.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel onClick={() => setWorkoutToDelete(null)}>Anuluj</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={handleDeleteWorkout}
                                                        className="bg-destructive hover:bg-destructive/90"
                                                    >
                                                        Usuń
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ) : (
                                    <Link to={`${detailsBasePath}/${workout.id}`} className="w-full">
                                        <Button variant="outline" className="w-full">
                                            {role === 'trainer' && <Edit className="mr-2 h-3 w-3" />}
                                            {cardActionText ?? defaultCardActionText}
                                        </Button>
                                    </Link>
                                )}
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    role === 'admin' ? (
                        <Card className="sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-20">
                            <p>{emptyMessage}</p>
                        </Card>
                    ) : (
                        <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
                            <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">{emptyMessage}</h3>
                            <p className="text-muted-foreground mb-4">{emptyDescription ?? defaultEmptyDescription}</p>
                            <Link to={createHref}>
                                <Button variant="outline">{createButtonText}</Button>
                            </Link>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
