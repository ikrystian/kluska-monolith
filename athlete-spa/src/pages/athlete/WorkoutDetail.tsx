import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDoc, useUser, useCreateDoc } from '@/lib/db-hooks';
import { Workout, type ExerciseSeries } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowLeft, ArrowRight, Calendar, ChevronDown, Clock, Copy, Dumbbell, Edit, Flame, Layers, Lightbulb, Play,
} from 'lucide-react';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { tint } from '@/components/profile/profile-ui';
import { ScheduleWorkoutDialog } from '@/components/workouts/ScheduleWorkoutDialog';
import {
    exerciseCount, exerciseTypeInfo, levelColor, levelLabel, seriesTarget, topWeight, totalSets,
} from '@/components/workouts/workout-format';

export default function WorkoutDetailsPage() {
    const params = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useUser();
    const { toast } = useToast();
    const id = params.id as string;
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
            navigate(`/athlete/workouts/${result.id}/edit`);
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
            <div className="page space-y-5">
                <Skeleton className="h-72 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
        );
    }

    if (!workout) {
        return (
            <div className="page py-20 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary">
                    <Dumbbell className="h-6 w-6 text-muted-foreground" />
                </span>
                <h2 className="mt-4 font-headline text-2xl font-bold">Nie znaleziono treningu</h2>
                <p className="mb-6 mt-1 text-muted-foreground">Trening o podanym ID nie istnieje lub został usunięty.</p>
                <Button  onClick={() => navigate(-1)}>Wróć</Button>
            </div>
        );
    }

    const color = levelColor(workout.level);
    const isPublic = workout.ownerId === 'public';
    const sets = totalSets(workout.exerciseSeries);

    return (
        <div className="page space-y-4">
            {/* Hero: what it is, and the one thing to do with it */}
            <section className="overflow-hidden rounded-2xl bg-primary text-primary-foreground">
                {workout.imageUrl && <img src={workout.imageUrl} alt="" className="h-40 w-full object-cover" />}
                <div className="p-4">
                    <p className="text-[13px] font-semibold opacity-80">
                        {levelLabel(workout.level)}
                        {isPublic ? ' · Publiczny' : ''}
                    </p>
                    <h1 className="mt-1 line-clamp-2 font-display text-[3.25rem] font-bold uppercase leading-[0.95]">{workout.name}</h1>
                    <p className="mt-1.5 text-sm font-medium opacity-80">
                        {workout.durationMinutes} min · {workout.exerciseSeries.length} ćw. · {sets} serii
                    </p>
                    <Button
                        onClick={() => navigate(hasActiveWorkout ? `/athlete/log?logId=${activeWorkout?.id}` : `/athlete/log?workoutId=${id}`)}
                        className="mt-4 w-full bg-primary-foreground text-primary active:bg-primary-foreground/85"
                    >
                        <Play className="fill-current" />
                        {hasActiveWorkout ? 'Wróć do treningu w toku' : 'Rozpocznij trening'}
                    </Button>
                </div>
            </section>

            {/* Actions */}
            <section>
                <div className="grid grid-cols-2 gap-2.5">
                    <Button
                        variant="secondary"
                        className="h-11"
                        onClick={() => setIsScheduleOpen(true)}
                    >
                        <Calendar className="h-4 w-4" /> Zaplanuj
                    </Button>
                    {canEdit ? (
                        <Button
                            variant="outline"
                            className="h-11"
                            onClick={() => navigate(`/athlete/workouts/${id}/edit`)}
                        >
                            <Edit className="h-4 w-4" /> Edytuj
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            className="h-11"
                            onClick={handleCopyAndEdit}
                            disabled={isCopying || !user}
                        >
                            <Copy className="h-4 w-4" />
                            {isCopying ? 'Kopiowanie…' : 'Kopiuj i edytuj'}
                        </Button>
                    )}
                </div>
            </section>

            <ScheduleWorkoutDialog workout={workout} open={isScheduleOpen} onOpenChange={setIsScheduleOpen} />

            {workout.description && (
                <section>
                    <h2 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">Opis</h2>
                    <p className="rounded-2xl bg-card p-4 text-sm leading-relaxed text-muted-foreground">
                        {workout.description}
                    </p>
                </section>
            )}

            {/* Exercises */}
            <section>
                <h2 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
                    Plan · {exerciseCount(workout.exerciseSeries.length)}
                </h2>
                <ol className="space-y-3">
                    {workout.exerciseSeries.map((series, index) => (
                        <ExerciseRow key={index} series={series} index={index} color={color} />
                    ))}
                </ol>
            </section>
        </div>
    );
}

function Stat({
    icon: Icon, value, unit, label, color,
}: { icon: typeof Clock; value: string; unit: string; label: string; color: string }) {
    return (
        <div className="flex flex-col items-center gap-1 px-2">
            <span className="grid h-8 w-8 place-items-center rounded-full" style={{ backgroundColor: tint(color, 15), color }}>
                <Icon className="h-4 w-4" />
            </span>
            <p className="font-display text-4xl font-bold leading-none tabular-nums">
                {value}
                {unit && <span className="ml-0.5 font-headline text-xs font-bold text-muted-foreground">{unit}</span>}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        </div>
    );
}

function ExerciseRow({ series, index, color }: { series: ExerciseSeries; index: number; color: string }) {
    const [open, setOpen] = useState(false);
    const { exercise } = series;
    const target = seriesTarget(series);
    const weight = topWeight(series);
    const { icon: TypeIcon, label: typeLabel } = exerciseTypeInfo(exercise.type);
    const media = exercise.mediaUrl || exercise.image;
    const muscles = exercise.mainMuscleGroups?.map(mg => mg.name).join(', ');
    const isDuration = exercise.type === 'duration';

    return (
        <li className="overflow-hidden rounded-2xl bg-card">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary/40"
            >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-secondary/60">
                    {media ? (
                        <img src={media} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                        <div className="grid h-full w-full place-items-center">
                            <TypeIcon className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                    )}
                    <span className="absolute left-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[11px] font-bold tabular-nums text-background">
                        {index + 1}
                    </span>
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate font-headline text-base font-bold">{exercise.name}</p>
                    {muscles && <p className="truncate text-xs text-muted-foreground">{muscles}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold tabular-nums">
                        <span style={{ color }}>
                            {target.sets} × {target.value}
                            {isDuration ? ' s' : ''}
                        </span>
                        {weight !== null && <span className="text-muted-foreground">do {weight} kg</span>}
                        {series.tempo && (
                            <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                                <Flame className="h-3 w-3" /> {series.tempo}
                            </span>
                        )}
                    </div>
                </div>

                <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
            </button>

            {open && (
                <div className="space-y-3 border-t border-border/60 bg-secondary/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <TypeIcon className="h-3.5 w-3.5" /> {typeLabel}
                    </div>
                    <div className="overflow-hidden rounded-xl bg-card text-sm">
                        <div className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 border-b border-border/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                            <span>#</span>
                            <span>{isDuration ? 'Czas' : 'Powt.'}</span>
                            <span>{exercise.type === 'weight' || !exercise.type ? 'Ciężar' : ''}</span>
                            <span className="text-right">Przerwa</span>
                        </div>
                        {series.sets.map((set, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 px-3 py-2 tabular-nums even:bg-secondary/30"
                            >
                                <span className="text-muted-foreground">{i + 1}</span>
                                <span className="font-semibold">
                                    {isDuration ? (set.duration !== undefined ? `${set.duration} s` : '–') : (set.reps ?? '–')}
                                </span>
                                <span>
                                    {set.weight
                                        ? set.weightUnit === 'rpe' ? `RPE ${set.weight}` : `${set.weight} kg`
                                        : set.rpe ? `RPE ${set.rpe}` : ''}
                                </span>
                                <span className="text-right text-muted-foreground">
                                    {set.restTimeSeconds ? `${set.restTimeSeconds} s` : '–'}
                                </span>
                            </div>
                        ))}
                    </div>
                    {series.tip && (
                        <div className="flex gap-2 rounded-xl border border-food/20 bg-food/10 p-3 text-sm text-food">
                            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>{series.tip}</p>
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}
