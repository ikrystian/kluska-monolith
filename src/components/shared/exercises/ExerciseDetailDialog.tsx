'use client';

import Image from 'next/image';
import { Exercise } from '@/lib/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, PlayCircle, Repeat, Timer } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExerciseDetailDialogProps {
    exercise: Exercise | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
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

    const mediaUrl = exercise.mediaUrl || exercise.image || '';
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
                                        <div className="w-full h-full bg-black flex items-center justify-center">
                                            <PlayCircle className="h-16 w-16 text-white opacity-80" />
                                            <p className="text-white mt-4">Video URL: {mediaUrl}</p>
                                        </div>
                                    )
                                ) : (
                                    <Image
                                        src={mediaUrl}
                                        alt={exercise.name}
                                        fill
                                        className="object-cover"
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
