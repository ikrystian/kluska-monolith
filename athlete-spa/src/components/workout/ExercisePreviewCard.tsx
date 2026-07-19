import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { Exercise } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/api-client';

interface ExercisePreviewCardProps {
    exercise: Exercise;
    onClose: () => void;
    onSelect: () => void;
}

export function ExercisePreviewCard({ exercise, onClose, onSelect }: ExercisePreviewCardProps) {
    const mediaUrl = resolveMediaUrl(exercise.mediaUrl);

    return (
        <div className="flex flex-col">
            {mediaUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-t-2xl bg-muted">
                    <img
                        src={mediaUrl}
                        alt={exercise.name}
                        className="h-full w-full object-cover"
                    />
                </div>
            )}

            <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold leading-tight">{exercise.name}</h3>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 -mr-1 -mt-1" onClick={onClose} aria-label="Zamknij podgląd">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-3">
                    {(exercise.mainMuscleGroups?.length ?? 0) > 0 && (
                        <div>
                            <Label className="text-xs text-muted-foreground">Główne mięśnie</Label>
                            <div className="mt-1 flex flex-wrap gap-1">
                                {exercise.mainMuscleGroups?.map(mg => (
                                    <Badge key={mg.name}>{mg.name}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                    {(exercise.secondaryMuscleGroups?.length ?? 0) > 0 && (
                        <div>
                            <Label className="text-xs text-muted-foreground">Pomocnicze mięśnie</Label>
                            <div className="mt-1 flex flex-wrap gap-1">
                                {exercise.secondaryMuscleGroups?.map(mg => (
                                    <Badge key={mg.name} variant="outline">{mg.name}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {exercise.instructions && (
                    <div>
                        <Label className="text-xs text-muted-foreground">Instrukcje</Label>
                        <p className="mt-1 text-sm">{exercise.instructions}</p>
                    </div>
                )}

                <Button onClick={onSelect} className="h-12 w-full text-base">
                    <Plus className="mr-2 h-5 w-5" />
                    Dodaj do treningu
                </Button>
            </div>
        </div>
    );
}
