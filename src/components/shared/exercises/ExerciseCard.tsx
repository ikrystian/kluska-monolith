'use client';

import Image from 'next/image';
import { Exercise } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dumbbell,
  MoreVertical,
  Edit,
  Trash2,
  LineChart as ChartIcon,
  PlayCircle,
  Repeat,
  Timer,
} from 'lucide-react';
import { ExerciseCardProps } from './types';

export function ExerciseCard({
  exercise,
  userId,
  canEdit,
  canDelete,
  showProgress,
  showOwnerBadge,
  onEdit,
  onDelete,
  onShowProgress,
}: ExerciseCardProps) {
  const isOwner = exercise.ownerId === userId;
  const canEditThis = canEdit && isOwner;
  const canDeleteThis = canDelete && isOwner;
  const showActions = canEditThis || canDeleteThis;

  const isVideoUrl = (url: string | undefined) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('.mp4') || url.includes('.webm');
  };

  const getOwnerBadge = (ownerId: string | undefined) => {
    if (ownerId === 'public' || !ownerId) {
      return <Badge variant="secondary" className="text-[10px]">Publiczne</Badge>;
    }
    if (ownerId === userId) {
      return <Badge variant="outline" className="text-[10px]">Własne</Badge>;
    }
    return <Badge variant="outline" className="text-[10px]">Użytkownika</Badge>;
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg flex flex-col">
      <div className="relative h-48 w-full bg-muted flex items-center justify-center group">
        {(exercise.mediaUrl || exercise.image) ? (
          isVideoUrl(exercise.mediaUrl || exercise.image) ? (
            <div className="relative w-full h-full bg-black flex items-center justify-center">
              <PlayCircle className="h-12 w-12 text-white opacity-80" />
              <span className="absolute bottom-2 right-2 text-xs text-white bg-black/50 px-1 rounded">Wideo</span>
            </div>
          ) : (
            <Image
              src={exercise.mediaUrl || exercise.image || ''}
              alt={exercise.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          )
        ) : (
          <Dumbbell className="h-12 w-12 text-muted-foreground opacity-20" />
        )}
      </div>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="font-headline line-clamp-1">{exercise.name}</CardTitle>
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEditThis && (
                  <DropdownMenuItem onClick={() => onEdit(exercise)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edytuj</span>
                  </DropdownMenuItem>
                )}
                {canDeleteThis && (
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => onDelete(exercise)}>
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                      <span className="text-destructive">Usuń</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {exercise.mainMuscleGroups?.map((mg, idx) => (
            <Badge key={idx} variant="secondary" className="text-[10px]">{mg.name}</Badge>
          ))}
          {!exercise.mainMuscleGroups?.length && exercise.muscleGroup && (
            <Badge variant="secondary" className="text-[10px]">{exercise.muscleGroup}</Badge>
          )}
          {/* Exercise type badge */}
          {exercise.type && (
            <Badge variant="outline" className="text-[10px] gap-1">
              {exercise.type === 'weight' && <Dumbbell className="h-2.5 w-2.5" />}
              {exercise.type === 'reps' && <Repeat className="h-2.5 w-2.5" />}
              {exercise.type === 'duration' && <Timer className="h-2.5 w-2.5" />}
              {exercise.type === 'weight' ? 'Ciężar' : exercise.type === 'reps' ? 'Powt.' : 'Czas'}
            </Badge>
          )}
          {showOwnerBadge && getOwnerBadge(exercise.ownerId)}
          {!showOwnerBadge && isOwner && <Badge variant="outline" className="text-[10px]">Własne</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription className="line-clamp-2">
          {exercise.description || exercise.instructions}
        </CardDescription>
      </CardContent>
      {showProgress && (
        <CardFooter>
          <Button variant="ghost" className="w-full" onClick={() => onShowProgress(exercise)}>
            <ChartIcon className="mr-2 h-4 w-4" />
            Zobacz Postęp
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}