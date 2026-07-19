import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Eye, Search, Check, Dumbbell } from 'lucide-react';
import { Exercise, MuscleGroupName } from '@/lib/types';
import { ExerciseType } from '@/lib/set-type-config';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/api-client';
import { ExercisePreviewCard } from './ExercisePreviewCard';

interface ExerciseSelectorProps {
    exercises: Exercise[];
    selectedId?: string;
    onSelect: (exerciseId: string) => void;
}

const TYPE_FILTERS: { value: ExerciseType | 'all'; label: string }[] = [
    { value: 'all', label: 'Wszystkie' },
    { value: 'weight', label: 'Ciężar' },
    { value: 'reps', label: 'Powtórzenia' },
    { value: 'duration', label: 'Czas' },
];

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors',
                active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary/40 text-muted-foreground active:scale-95'
            )}
        >
            {children}
        </button>
    );
}

export function ExerciseSelector({ exercises, selectedId, onSelect }: ExerciseSelectorProps) {
    const [search, setSearch] = useState('');
    const [filterMuscle, setFilterMuscle] = useState<MuscleGroupName | 'all'>('all');
    const [filterType, setFilterType] = useState<ExerciseType | 'all'>('all');
    const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);

    const filteredExercises = useMemo(() => {
        return exercises.filter(ex => {
            const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
            const matchesMuscle = filterMuscle === 'all' ||
                ex.mainMuscleGroups?.some(mg => mg.name === filterMuscle);
            const matchesType = filterType === 'all' || (ex.type || 'weight') === filterType;
            return matchesSearch && matchesMuscle && matchesType;
        });
    }, [exercises, search, filterMuscle, filterType]);

    // Only offer muscle groups that actually occur in the catalog, so the chip
    // row stays short and every chip leads to results.
    const availableMuscles = useMemo(() => {
        const present = new Set<MuscleGroupName>();
        exercises.forEach(ex => ex.mainMuscleGroups?.forEach(mg => present.add(mg.name)));
        return Object.values(MuscleGroupName).filter(mg => present.has(mg));
    }, [exercises]);

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Szukaj ćwiczenia..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    inputMode="search"
                    className="h-11 pl-9 text-base"
                />
            </div>

            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                {TYPE_FILTERS.map(f => (
                    <FilterChip key={f.value} active={filterType === f.value} onClick={() => setFilterType(f.value)}>
                        {f.label}
                    </FilterChip>
                ))}
            </div>

            {availableMuscles.length > 0 && (
                <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                    <FilterChip active={filterMuscle === 'all'} onClick={() => setFilterMuscle('all')}>
                        Wszystkie grupy
                    </FilterChip>
                    {availableMuscles.map(mg => (
                        <FilterChip key={mg} active={filterMuscle === mg} onClick={() => setFilterMuscle(mg)}>
                            {mg}
                        </FilterChip>
                    ))}
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border">
                <div className="space-y-1 p-1.5">
                    {filteredExercises.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
                            <Dumbbell className="h-6 w-6" />
                            <p className="text-sm">Brak wyników — zmień filtry lub wyszukiwanie.</p>
                        </div>
                    ) : (
                        filteredExercises.map(exercise => {
                            const isSelected = selectedId === exercise.id;
                            const mediaUrl = resolveMediaUrl(exercise.mediaUrl);
                            return (
                                <div
                                    key={exercise.id}
                                    role="button"
                                    tabIndex={0}
                                    className={cn(
                                        'flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors',
                                        'active:bg-secondary/70 hover:bg-secondary/50',
                                        isSelected && 'bg-primary/10 ring-1 ring-primary'
                                    )}
                                    onClick={() => onSelect(exercise.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onSelect(exercise.id);
                                        }
                                    }}
                                >
                                    {mediaUrl ? (
                                        <img
                                            src={mediaUrl}
                                            alt=""
                                            loading="lazy"
                                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
                                            <Dumbbell className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{exercise.name}</p>
                                        <div className="mt-0.5 flex flex-wrap gap-1">
                                            {exercise.mainMuscleGroups?.slice(0, 2).map(mg => (
                                                <Badge key={mg.name} variant="secondary" className="h-4 px-1 py-0 text-[10px]">
                                                    {mg.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    {isSelected && <Check className="h-5 w-5 shrink-0 text-primary" />}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 shrink-0 text-muted-foreground"
                                        aria-label={`Podgląd: ${exercise.name}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewExercise(exercise);
                                        }}
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <Dialog open={!!previewExercise} onOpenChange={(open) => !open && setPreviewExercise(null)}>
                <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-2xl p-0">
                    {previewExercise && (
                        <>
                            <DialogTitle className="sr-only">{previewExercise.name}</DialogTitle>
                            <ExercisePreviewCard
                                exercise={previewExercise}
                                onClose={() => setPreviewExercise(null)}
                                onSelect={() => {
                                    onSelect(previewExercise.id);
                                    setPreviewExercise(null);
                                }}
                            />
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
