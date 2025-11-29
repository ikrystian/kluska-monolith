'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCollection, useDeleteDoc } from '@/lib/db-hooks';
import { Workout, TrainingLevel } from '@/lib/types';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, Edit, Trash2, Clock, BarChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

export default function AdminWorkoutsPage() {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const { data: workouts, isLoading, refetch } = useCollection<Workout>('workouts');
    const { deleteDoc, isLoading: isDeleting } = useDeleteDoc();
    const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);

    const filteredWorkouts = workouts?.filter(
        (workout) =>
            workout.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDeleteWorkout = async () => {
        if (!workoutToDelete) return;
        try {
            await deleteDoc('workouts', workoutToDelete.id);
            toast({ title: "Sukces!", description: "Trening został usunięty.", variant: 'destructive' });
            setWorkoutToDelete(null);
            refetch();
        } catch (error) {
            toast({
                title: "Błąd",
                description: "Nie udało się usunąć treningu.",
                variant: "destructive"
            });
        }
    };

    const getLevelBadge = (level: TrainingLevel) => {
        switch (level) {
            case TrainingLevel.Beginner: return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Początkujący</Badge>;
            case TrainingLevel.Intermediate: return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Średniozaawansowany</Badge>;
            case TrainingLevel.Advanced: return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">Zaawansowany</Badge>;
            default: return <Badge variant="outline">{level}</Badge>;
        }
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="font-headline text-3xl font-bold">Wszystkie Treningi</h1>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                    <Button asChild>
                        <Link href="/admin/workouts/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Nowy Trening
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {isLoading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                        <Card key={index} className="overflow-hidden">
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/4" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-full" />
                            </CardContent>
                        </Card>
                    ))
                ) : filteredWorkouts && filteredWorkouts.length > 0 ? (
                    filteredWorkouts.map((workout) => (
                        <Card key={workout.id} className="overflow-hidden transition-all hover:shadow-lg flex flex-col">
                            <CardHeader>
                                <CardTitle className="font-headline">{workout.name}</CardTitle>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {getLevelBadge(workout.level)}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col">
                                <div className="flex items-center text-sm text-muted-foreground mb-4">
                                    <Clock className="mr-1 h-4 w-4" />
                                    {workout.durationMinutes} min
                                    <span className="mx-2">•</span>
                                    <BarChart className="mr-1 h-4 w-4" />
                                    {workout.exerciseSeries?.length || 0} ćwiczeń
                                </div>

                                <div className="mt-auto flex gap-2">
                                    <Button variant="outline" size="sm" className="w-full" asChild>
                                        <Link href={`/admin/workouts/${workout.id}`}>
                                            <Edit className="mr-2 h-3 w-3" />
                                            Edytuj
                                        </Link>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" className="w-full" onClick={() => setWorkoutToDelete(workout)}>
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
                                                <AlertDialogAction onClick={handleDeleteWorkout} className="bg-destructive hover:bg-destructive/90">Usuń</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card className="sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-20">
                        <p>Brak treningów w systemie.</p>
                    </Card>
                )}
            </div>
        </div>
    );
}
