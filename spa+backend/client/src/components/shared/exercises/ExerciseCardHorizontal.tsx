'use client';

// import Image from 'next/image';
import { Exercise } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export function ExerciseCardHorizontal({
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
  const showActions = canEditThis || canDeleteThis || showProgress;

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
    <div className="flex items-stretch bg-card border rounded-lg overflow-hidden transition-all hover:shadow-md h-[120px] md:h-[120px] sm:h-[100px]">
      {/* Image Section */}
      <div className="relative w-[100px] h-full md:w-[100px] sm:w-[80px] flex-shrink-0 bg-muted flex items-center justify-center">
        {(exercise.mediaUrl || exercise.image) ? (
          isVideoUrl(exercise.mediaUrl || exercise.image) ? (
            <div className="relative w-full h-full bg-black flex items-center justify-center">
              <PlayCircle className="h-8 w-8 text-white opacity-80" />
            </div>
          ) : (
            <img
              src={exercise.mediaUrl || exercise.image || ''}
              alt={exercise.name}
              className="object-cover w-full h-full"
            />
          )
        ) : (
          <Dumbbell className="h-8 w-8 text-muted-foreground opacity-20" />
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 flex flex-col justify-center px-4 py-2 min-w-0 overflow-hidden">
        {/* Title Row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm md:text-base line-clamp-1 flex-1">{exercise.name}</h3>

          {/* Actions Dropdown */}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {showProgress && (
                  <DropdownMenuItem onClick={() => onShowProgress(exercise)}>
                    <ChartIcon className="mr-2 h-4 w-4" />
                    <span>Zobacz Postęp</span>
                  </DropdownMenuItem>
                )}
                {canEditThis && (
                  <DropdownMenuItem onClick={() => onEdit(exercise)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edytuj</span>
                  </DropdownMenuItem>
                )}
                {canDeleteThis && (
                  <DropdownMenuItem onClick={() => onDelete(exercise)}>
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                    <span className="text-destructive">Usuń</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Badges Row */}
        <div className="flex flex-wrap gap-1 mt-1">
          {exercise.mainMuscleGroups?.slice(0, 2).map((mg, idx) => (
            <Badge key={idx} variant="secondary" className="text-[10px]">{mg.name}</Badge>
          ))}
          {exercise.mainMuscleGroups && exercise.mainMuscleGroups.length > 2 && (
            <Badge variant="secondary" className="text-[10px]">+{exercise.mainMuscleGroups.length - 2}</Badge>
          )}
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

        {/* Description Row */}
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {exercise.instructions || exercise.description || 'Brak opisu'}
        </p>
      </div>
    </div>
  );
}