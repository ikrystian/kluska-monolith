'use client';

import type { ReactNode } from 'react';
import { Dumbbell, Repeat, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSetTypeConfig } from '@/lib/set-type-config';
import type { ExerciseSeries, PlannedWorkout, WorkoutSet } from '@/lib/types';

type ExerciseKind = 'weight' | 'reps' | 'duration';

const KIND_ICON = {
    weight: Dumbbell,
    reps: Repeat,
    duration: Timer,
} as const;

function exerciseKind(series: ExerciseSeries): ExerciseKind {
    const type = series.exercise?.type;
    return type === 'reps' || type === 'duration' ? type : 'weight';
}

function plural(count: number, one: string, few: string, many: string): string {
    if (count === 1) return one;
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

/** Polish plural for "seria / serie / serii". */
export function seriesLabel(count: number): string {
    return plural(count, 'seria', 'serie', 'serii');
}

/** Polish plural for "ćwiczenie / ćwiczenia / ćwiczeń". */
export function exercisesLabel(count: number): string {
    return plural(count, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń');
}

/** Compact per-set readout, e.g. "80 × 8", "45 s", "12". */
function formatSet(set: WorkoutSet, kind: ExerciseKind): string {
    if (kind === 'duration') return `${set.duration ?? 0} s`;
    if (kind === 'reps') return `${set.reps ?? 0}`;
    return `${set.weight ?? 0} × ${set.reps ?? 0}`;
}

export interface LoggedWorkoutStats {
    exerciseCount: number;
    setCount: number;
    volume: number;
}

/** Totals shown in the workout summary header. */
export function getLoggedWorkoutStats(exercises: ExerciseSeries[] | undefined): LoggedWorkoutStats {
    const list = exercises ?? [];
    let setCount = 0;
    let volume = 0;
    for (const series of list) {
        const kind = exerciseKind(series);
        for (const set of series.sets ?? []) {
            setCount += 1;
            if (kind === 'weight') volume += (set.reps ?? 0) * (set.weight ?? 0);
        }
    }
    return { exerciseCount: list.length, setCount, volume };
}

function ExerciseRow({
    index,
    name,
    meta,
    trailing,
    children,
}: {
    index: number;
    name: string;
    meta?: string;
    trailing?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <li className="rounded-xl border border-border/60 bg-card/60 p-3">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-secondary font-headline text-xs font-bold text-primary">
                    {index}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm font-semibold leading-snug">{name}</p>
                        {trailing != null && (
                            <div className="shrink-0 text-right leading-tight">{trailing}</div>
                        )}
                    </div>
                    {meta && <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>}
                    {children}
                </div>
            </div>
        </li>
    );
}

function EmptyExercises({ text }: { text: string }) {
    return (
        <p className="rounded-xl border border-dashed border-border bg-card/40 p-4 text-center text-xs text-muted-foreground">
            {text}
        </p>
    );
}

/** Ćwiczenia z ukończonego treningu (pełne dane serii). */
export function LoggedExerciseList({ exercises }: { exercises: ExerciseSeries[] | undefined }) {
    if (!exercises || exercises.length === 0) {
        return <EmptyExercises text="Ten trening nie ma zapisanych ćwiczeń." />;
    }

    const legendTypes = new Map<string, ReturnType<typeof getSetTypeConfig>>();
    exercises.forEach(ex => ex.sets?.forEach(set => {
        const cfg = getSetTypeConfig(set.type);
        if (!legendTypes.has(cfg.shortName)) legendTypes.set(cfg.shortName, cfg);
    }));

    return (
        <div className="space-y-2">
            <ol className="max-h-[52vh] space-y-2 overflow-y-auto pr-0.5 no-scrollbar">
                {exercises.map((series, i) => {
                    const kind = exerciseKind(series);
                    const sets = series.sets ?? [];
                    const Icon = KIND_ICON[kind];
                    const muscles = series.exercise?.mainMuscleGroups
                        ?.map(mg => mg.name)
                        .filter(Boolean)
                        .join(', ');
                    const volume = kind === 'weight'
                        ? sets.reduce((acc, s) => acc + (s.reps ?? 0) * (s.weight ?? 0), 0)
                        : 0;

                    return (
                        <ExerciseRow
                            key={i}
                            index={i + 1}
                            name={series.exercise?.name || 'Nieznane ćwiczenie'}
                            meta={[muscles, `${sets.length} ${seriesLabel(sets.length)}`]
                                .filter(Boolean)
                                .join(' · ')}
                            trailing={
                                volume > 0 ? (
                                    <>
                                        <p className="font-mono text-sm font-bold tabular-nums">
                                            {volume.toLocaleString('pl-PL')}
                                        </p>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">kg</p>
                                    </>
                                ) : (
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                )
                            }
                        >
                            {sets.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {sets.map((set, si) => {
                                        const cfg = getSetTypeConfig(set.type);
                                        return (
                                            <span
                                                key={si}
                                                title={cfg.name}
                                                className={cn(
                                                    'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums',
                                                    cfg.bgColorClass,
                                                    cfg.colorClass,
                                                    cfg.borderColorClass,
                                                )}
                                            >
                                                {formatSet(set, kind)}
                                                {set.rpe != null && (
                                                    <span className="font-sans font-normal opacity-70">RPE {set.rpe}</span>
                                                )}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </ExerciseRow>
                    );
                })}
            </ol>

            {legendTypes.size > 1 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 pt-1 text-[10px] text-muted-foreground">
                    {Array.from(legendTypes.values()).map(cfg => (
                        <span key={cfg.shortName} className="inline-flex items-center gap-1">
                            <span className={cn('h-2 w-2 rounded-full bg-current', cfg.colorClass)} />
                            {cfg.shortName}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Ćwiczenia z zaplanowanego treningu (dane w formie tekstowej). */
export function PlannedExerciseList({ exercises }: { exercises: PlannedWorkout['exercises'] | undefined }) {
    if (!exercises || exercises.length === 0) {
        return <EmptyExercises text="Ten plan nie zawiera jeszcze ćwiczeń." />;
    }

    return (
        <ol className="max-h-[52vh] space-y-2 overflow-y-auto pr-0.5 no-scrollbar">
            {exercises.map((ex, i) => {
                const primary = ex.sets && ex.reps
                    ? `${ex.sets} × ${ex.reps}`
                    : ex.sets
                        ? `${ex.sets} ${seriesLabel(Number(ex.sets) || 0)}`
                        : ex.duration
                            ? ex.duration
                            : ex.reps
                                ? `${ex.reps} powt.`
                                : null;

                return (
                    <ExerciseRow
                        key={i}
                        index={i + 1}
                        name={ex.name || 'Ćwiczenie'}
                        meta={ex.rest ? `Przerwa ${ex.rest}` : undefined}
                        trailing={
                            primary ? (
                                <p className="font-mono text-sm font-bold tabular-nums">{primary}</p>
                            ) : null
                        }
                    />
                );
            })}
        </ol>
    );
}
