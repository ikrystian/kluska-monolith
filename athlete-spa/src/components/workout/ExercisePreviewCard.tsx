import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { Exercise } from '@/lib/types';

interface ExercisePreviewCardProps {
    exercise: Exercise;
    onClose: () => void;
    onSelect: () => void;
}

export function ExercisePreviewCard({ exercise, onClose, onSelect }: ExercisePreviewCardProps) {
    return (
        <Card className="border-2 border-primary/20 mt-4">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{exercise.name}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex">
                {exercise.mediaUrl && (
                    <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                        {/* Simple check for video vs image, though for now we assume image or use generic img tag which works for some video thumbnails if processed, but here we just use img as per request */}
                        <img
                            src={exercise.mediaUrl}
                            alt={exercise.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs text-muted-foreground">Główne mięśnie</Label>
                        <div className="flex gap-1 flex-wrap mt-1">
                            {exercise.mainMuscleGroups?.map(mg => (
                                <Badge key={mg.name}>{mg.name}</Badge>
                            ))}
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">Pomocnicze mięśnie</Label>
                        <div className="flex gap-1 flex-wrap mt-1">
                            {exercise.secondaryMuscleGroups?.map(mg => (
                                <Badge key={mg.name} variant="outline">{mg.name}</Badge>
                            ))}
                        </div>
                    </div>
                </div>

                {exercise.instructions && (
                    <div>
                        <Label className="text-xs text-muted-foreground">Instrukcje</Label>
                        <p className="text-sm mt-1">{exercise.instructions}</p>
                    </div>
                )}

                <Button onClick={onSelect} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj do treningu
                </Button>
            </CardContent>
        </Card>
    );
}
