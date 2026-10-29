'use client';

import { Exercise } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/api-client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Repeat, Timer } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExerciseDetailDialogProps {
    exercise: Exercise | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Zwraca lokalny URL animacji ćwiczenia (zapisany podczas importu openGym
 * w `setup` jako grupa "Animacja"), gdy istnieje.
 */
function getAnimationUrl(exercise: Exercise | null): string | undefined {
    if (!exercise?.setup) return undefined;
    const item = exercise.setup.find((s) => s.group === 'Animacja' && s.value);
    return item?.value;
}

export function ExerciseDetailDialog({
    exercise,
    open,
    onOpenChange,
}: ExerciseDetailDialogProps) {
    if (!exercise) return null;

    const isVideoUrl = (url: string | undefined) => {
        if (!url) return false;
        return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('.mp4') || url.includes('.webm');
    };

    const getYouTubeEmbedUrl = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
    };

    // Animacja (z importu openGym) ma pierwszeństwo nad obrazkiem w szczegółach.
    const animationUrl = getAnimationUrl(exercise);
    const mediaUrl = resolveMediaUrl(animationUrl || exercise.mediaUrl || exercise.image || '');
    const posterUrl = resolveMediaUrl(exercise.image || exercise.mediaUrl || '');
    const isVideo = isVideoUrl(mediaUrl);
    const youtubeEmbedUrl = isVideo && mediaUrl ? getYouTubeEmbedUrl(mediaUrl) : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">{exercise.name}</DialogTitle>
                    <DialogDescription>
                        Szczegółowe informacje o ćwiczeniu
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(90vh-120px)]">
                    <div className="space-y-6 pr-4">
                        {/* Media Section */}
                        {mediaUrl && (
                            <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                                {isVideo ? (
                                    youtubeEmbedUrl ? (
                                        <iframe
                                            src={youtubeEmbedUrl}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <video
                                            src={mediaUrl}
                                            className="w-full h-full object-contain"
                                            controls
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            poster={posterUrl || undefined}
                                        >
                                            <source src={mediaUrl} />
                                        </video>
                                    )
                                ) : (
                                    <img
                                        src={mediaUrl}
                                        alt={exercise.name}
                                        className="absolute inset-0 w-full h-full object-contain"
                                    />
                                )}
                            </div>
                        )}

                        {/* Muscle Groups Section */}
                        <div>
                            <h3 className="font-semibold mb-2">Partie mięśniowe</h3>
                            <div className="space-y-2">
                                {exercise.mainMuscleGroups && exercise.mainMuscleGroups.length > 0 && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Główne:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {exercise.mainMuscleGroups.map((mg, idx) => (
                                                <Badge key={idx} variant="default">
                                                    {mg.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {exercise.secondaryMuscleGroups && exercise.secondaryMuscleGroups.length > 0 && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Pomocnicze:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {exercise.secondaryMuscleGroups.map((mg, idx) => (
                                                <Badge key={idx} variant="secondary">
                                                    {mg.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {!exercise.mainMuscleGroups?.length && exercise.muscleGroup && (
                                    <div>
                                        <Badge variant="default">{exercise.muscleGroup}</Badge>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Exercise Type */}
                        {exercise.type && (
                            <div>
                                <h3 className="font-semibold mb-2">Typ ćwiczenia</h3>
                                <Badge variant="outline" className="gap-2">
                                    {exercise.type === 'weight' && <Dumbbell className="h-4 w-4" />}
                                    {exercise.type === 'reps' && <Repeat className="h-4 w-4" />}
                                    {exercise.type === 'duration' && <Timer className="h-4 w-4" />}
                                    {exercise.type === 'weight' ? 'Ciężar' : exercise.type === 'reps' ? 'Powtórzenia' : 'Czas trwania'}
                                </Badge>
                            </div>
                        )}

                        {/* Setup Section (group/value pairs from DB) */}
                        {exercise.setup && exercise.setup.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">Konfiguracja</h3>
                                <div className="space-y-1.5">
                                    {exercise.setup
                                        .filter((item) => item.group !== 'Animacja' && item.group && item.value)
                                        .map((item, idx) => (
                                            <div key={idx} className="flex gap-2 text-sm">
                                                <span className="text-muted-foreground shrink-0 min-w-[100px] font-medium">
                                                    {item.group}
                                                </span>
                                                <span className="whitespace-pre-wrap">{item.value}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Instructions/Description */}
                        <div>
                            <h3 className="font-semibold mb-2">Instrukcje</h3>
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg">
                                {exercise.instructions || exercise.description || 'Brak instrukcji dla tego ćwiczenia.'}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
