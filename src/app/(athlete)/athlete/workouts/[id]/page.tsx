'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useUser, useCreateDoc } from '@/lib/db-hooks';
import { Workout, ExerciseSeries, SetType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Signal, Dumbbell, Play, Calendar, ArrowRight, Repeat, Timer, Edit, Copy } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { type ExerciseType } from '@/lib/set-type-config';
import { useToast } from '@/hooks/use-toast';

import { ScheduleWorkoutDialog } from '@/components/workouts/ScheduleWorkoutDialog';

export default function WorkoutDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const { toast } = useToast();
    const id = params?.id as string;
    const { hasActiveWorkout, activeWorkout } = useActiveWorkout();
    const [isCopying, setIsCopying] = useState(false);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);

    const { data: workout, isLoading } = useDoc<Workout>('workouts', id);
    const { createDoc } = useCreateDoc();

    // Check if user owns this workout
    const isOwner = user && workout && (workout.ownerId === user.uid || workout.ownerId === 'public');
    const canEdit = user && workout && workout.ownerId === user.uid;

    const handleCopyAndEdit = async () => {
        if (!workout || !user) return;

        setIsCopying(true);
        try {
            // Create a copy of the workout for the user
            const workoutCopy: Omit<Workout, 'id'> = {
                ...workout,
                name: `${workout.name} (kopia)`,
                ownerId: user.uid,
                sourceWorkoutId: workout.id, // Track the original workout
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            // Remove the id from the copy
            delete (workoutCopy as any).id;

            const result = await createDoc('workouts', workoutCopy);
            toast({
                title: 'Sukces',
                description: 'Utworzono kopię treningu',
            });
            router.push(`/athlete/workouts/${result.id}/edit`);
        } catch (error) {
            console.error('Error copying workout:', error);
            toast({
                title: 'Błąd',
                description: 'Nie udało się skopiować treningu',
                variant: 'destructive',
            });
        } finally {
            setIsCopying(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-8 space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        );
    }

    if (!workout) {
        return (
            <div className="container mx-auto p-4 md:p-8 text-center py-20">
                <h2 className="text-2xl font-bold mb-4">Nie znaleziono treningu</h2>
                <p className="text-muted-foreground mb-6">Trening o podanym ID nie istnieje lub został usunięty.</p>
                <Button onClick={() => router.back()}>Wróć</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-8 pb-24">
            {/* Header */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex justify-between items-start">
                    <Button
                        variant="ghost"
                        className="w-fit pl-0 hover:bg-transparent hover:text-primary"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Wróć do listy
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Edit/Copy buttons */}
                        {canEdit ? (
                            <Button
                                variant="outline"
                                onClick={() => router.push(`/athlete/workouts/${id}/edit`)}
                            >
                                <Edit className="mr-2 h-4 w-4" /> Edytuj
                            </Button>
                        ) : workout && workout.ownerId !== user?.uid && (
                            <Button
                                variant="outline"
                                onClick={handleCopyAndEdit}
                                disabled={isCopying}
                            >
                                <Copy className="mr-2 h-4 w-4" />
                                {isCopying ? 'Kopiowanie...' : 'Skopiuj i edytuj'}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Start workout button row */}
                <div className="flex justify-end">
                    {hasActiveWorkout ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            disabled
                                            className="bg-muted text-muted-foreground cursor-not-allowed"
                                        >
                                            <Play className="mr-2 h-4 w-4" /> Rozpocznij Trening
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/athlete/log?logId=${activeWorkout?.id}`)}
                                            className="text-primary"
                                        >
                                            <ArrowRight className="mr-2 h-4 w-4" /> Wróć do aktywnego treningu
                                        </Button>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Masz aktywny trening. Zakończ go przed rozpoczęciem nowego.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        <Button
                            onClick={() => router.push(`/athlete/log?workoutId=${id}`)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                        >
                            <Play className="mr-2 h-4 w-4" /> Rozpocznij Trening
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        className="ml-2"
                        onClick={() => setIsScheduleOpen(true)}
                    >
                        <Calendar className="mr-2 h-4 w-4" /> Zaplanuj trening
                    </Button>
                </div>

                {workout && (
                    <ScheduleWorkoutDialog
                        workout={workout}
                        open={isScheduleOpen}
                        onOpenChange={setIsScheduleOpen}
                    />
                )}

                <div className="relative h-48 md:h-64 w-full rounded-xl overflow-hidden bg-muted">
                    {workout.imageUrl ? (
                        <Image
                            src={workout.imageUrl}
                            alt={workout.name}
                            fill
                            className="object-cover"
                            priority
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground bg-secondary/30">
                            <Dumbbell className="h-16 w-16 opacity-20" />
                        </div>
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                        <Badge variant="secondary" className="backdrop-blur-md bg-background/80">
                            {workout.level}
                        </Badge>
                        {workout.ownerId === 'public' && (
                            <Badge variant="secondary" className="backdrop-blur-md bg-background/80">
                                Publiczny
                            </Badge>
                        )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{workout.name}</h1>
                        <div className="flex items-center gap-4 text-white/80 text-sm">
                            <span className="flex items-center"><Clock className="h-4 w-4 mr-1" /> {workout.durationMinutes} min</span>
                            <span className="flex items-center"><Dumbbell className="h-4 w-4 mr-1" /> {workout.exerciseSeries.length} ćwiczeń</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description if exists */}
            {workout.description && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-2">Opis</h3>
                    <p className="text-muted-foreground">{workout.description}</p>
                </div>
            )}

            {/* Exercises List */}
            <div className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-primary" />
                    Lista Ćwiczeń
                </h3>

                <div className="grid gap-4">
                    {workout.exerciseSeries.map((series, index) => (
                        <Card key={index} className="overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary transition-colors">
                            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
                                {/* Exercise Image/Icon */}
                                <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 rounded-lg overflow-hidden bg-secondary/30 flex items-center justify-center">
                                    {series.exercise.mediaUrl || series.exercise.image ? (
                                        <Image
                                            src={series.exercise.mediaUrl || series.exercise.image || ''}
                                            alt={series.exercise.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <Dumbbell className="h-8 w-8 text-muted-foreground/40" />
                                    )}
                                    <div className="absolute top-1 left-1 bg-background/80 backdrop-blur text-[10px] font-mono px-1.5 py-0.5 rounded">
                                        #{index + 1}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-semibold text-lg">{series.exercise.name}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {series.exercise.mainMuscleGroups.map(mg => mg.name).join(', ')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                                        <div className="bg-secondary/20 p-2 rounded text-center">
                                            <p className="text-xs text-muted-foreground uppercase">Serie</p>
                                            <p className="font-semibold">{series.sets.length}</p>
                                        </div>
                                        <div className="bg-secondary/20 p-2 rounded text-center">
                                            <p className="text-xs text-muted-foreground uppercase">Tempo</p>
                                            <p className="font-semibold">{series.tempo || '-'}</p>
                                        </div>
                                        {/* Dynamic display based on exercise type */}
                                        {(() => {
                                            const exerciseType: ExerciseType = series.exercise.type || 'weight';

                                            if (exerciseType === 'weight') {
                                                return (
                                                    <div className="bg-secondary/20 p-2 rounded text-center col-span-2 sm:col-span-2">
                                                        <p className="text-xs text-muted-foreground uppercase flex items-center justify-center gap-1">
                                                            <Dumbbell className="h-3 w-3" /> Zakres powtórzeń
                                                        </p>
                                                        <p className="font-semibold">
                                                            {series.sets.length > 0 && series.sets.some(s => s.reps !== undefined)
                                                                ? `${Math.min(...series.sets.filter(s => s.reps !== undefined).map(s => s.reps!))} - ${Math.max(...series.sets.filter(s => s.reps !== undefined).map(s => s.reps!))}`
                                                                : '-'
                                                            }
                                                        </p>
                                                    </div>
                                                );
                                            } else if (exerciseType === 'reps') {
                                                return (
                                                    <div className="bg-secondary/20 p-2 rounded text-center col-span-2 sm:col-span-2">
                                                        <p className="text-xs text-muted-foreground uppercase flex items-center justify-center gap-1">
                                                            <Repeat className="h-3 w-3" /> Zakres powtórzeń
                                                        </p>
                                                        <p className="font-semibold">
                                                            {series.sets.length > 0 && series.sets.some(s => s.reps !== undefined)
                                                                ? `${Math.min(...series.sets.filter(s => s.reps !== undefined).map(s => s.reps!))} - ${Math.max(...series.sets.filter(s => s.reps !== undefined).map(s => s.reps!))}`
                                                                : '-'
                                                            }
                                                        </p>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="bg-secondary/20 p-2 rounded text-center col-span-2 sm:col-span-2">
                                                        <p className="text-xs text-muted-foreground uppercase flex items-center justify-center gap-1">
                                                            <Timer className="h-3 w-3" /> Zakres czasu
                                                        </p>
                                                        <p className="font-semibold">
                                                            {series.sets.length > 0 && series.sets.some(s => s.duration !== undefined)
                                                                ? `${Math.min(...series.sets.filter(s => s.duration !== undefined).map(s => s.duration!))} - ${Math.max(...series.sets.filter(s => s.duration !== undefined).map(s => s.duration!))} sek.`
                                                                : '-'
                                                            }
                                                        </p>
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>

                                    {/* Exercise type badge */}
                                    <div className="mt-2">
                                        <Badge variant="outline" className="text-xs gap-1">
                                            {series.exercise.type === 'weight' && <Dumbbell className="h-3 w-3" />}
                                            {series.exercise.type === 'reps' && <Repeat className="h-3 w-3" />}
                                            {series.exercise.type === 'duration' && <Timer className="h-3 w-3" />}
                                            {series.exercise.type === 'weight' ? 'Na ciężar' : series.exercise.type === 'reps' ? 'Na powtórzenia' : series.exercise.type === 'duration' ? 'Na czas' : 'Na ciężar'}
                                        </Badge>
                                    </div>

                                    {series.tip && (
                                        <div className="mt-3 text-sm bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 p-2 rounded border border-yellow-500/20">
                                            <span className="font-semibold mr-1">Wskazówka:</span> {series.tip}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
