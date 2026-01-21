import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { Exercise, MuscleGroupName } from '@/lib/types';
import { ExerciseType } from '@/lib/set-type-config';
import { cn } from '@/lib/utils';
import { ExercisePreviewCard } from './ExercisePreviewCard';

interface ExerciseSelectorProps {
    exercises: Exercise[];
    selectedId?: string;
    onSelect: (exerciseId: string) => void;
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
            // Note: Exercise type might not be directly on Exercise object depending on schema, 
            // but CreateWorkout assumes it is or defaults to 'weight'.
            // Checking Exercise interface in src/models/types/exercise.ts would be ideal, 
            // but based on CreateWorkout.tsx line 226: const exerciseType: ExerciseType = selectedExercise?.type || 'weight';
            // It seems 'type' is on Exercise.
            const matchesType = filterType === 'all' || (ex.type || 'weight') === filterType;
            return matchesSearch && matchesMuscle && matchesType;
        });
    }, [exercises, search, filterMuscle, filterType]);

    return (
        <div className="space-y-4">
            {/* Filtry */}
            <div className="flex gap-2 flex-wrap">
                <Input
                    placeholder="Szukaj ćwiczenia..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 min-w-[200px]"
                />
                <Select value={filterMuscle} onValueChange={(val) => setFilterMuscle(val as MuscleGroupName | 'all')}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Grupa mięśniowa" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Wszystkie grupy</SelectItem>
                        {Object.values(MuscleGroupName).map(mg => (
                            <SelectItem key={mg} value={mg}>{mg}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={(val) => setFilterType(val as ExerciseType | 'all')}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Typ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Wszystkie typy</SelectItem>
                        <SelectItem value="weight">Na ciężar</SelectItem>
                        <SelectItem value="reps">Na powtórzenia</SelectItem>
                        <SelectItem value="duration">Na czas</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Lista ćwiczeń */}
            <ScrollArea className="h-[300px] border rounded-md">
                <div className="p-2 space-y-1">
                    {filteredExercises.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">Brak wyników</div>
                    ) : (
                        filteredExercises.map(exercise => (
                            <div
                                key={exercise.id}
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                    "hover:bg-secondary/50",
                                    selectedId === exercise.id && "bg-primary/10 border border-primary"
                                )}
                                onClick={() => onSelect(exercise.id)}
                                onMouseEnter={() => setPreviewExercise(exercise)}
                            >
                                {exercise.mediaUrl && (
                                    <img
                                        src={exercise.mediaUrl}
                                        alt={exercise.name}
                                        className="w-12 h-12 object-cover rounded"
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{exercise.name}</p>
                                    <div className="flex gap-1 flex-wrap">
                                        {exercise.mainMuscleGroups?.slice(0, 2).map(mg => (
                                            <Badge key={mg.name} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                                {mg.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewExercise(exercise);
                                    }}
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Podgląd ćwiczenia */}
            {previewExercise && (
                <ExercisePreviewCard
                    exercise={previewExercise}
                    onClose={() => setPreviewExercise(null)}
                    onSelect={() => {
                        onSelect(previewExercise.id);
                        setPreviewExercise(null);
                    }}
                />
            )}
        </div>
    );
}
