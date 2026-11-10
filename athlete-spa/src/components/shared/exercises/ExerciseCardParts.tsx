'use client';

import { Exercise } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/api-client';
import { isOfflineVideoUrl } from '@/lib/offline-media';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/clipboard';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
  Star,
  Copy,
  type LucideIcon,
} from 'lucide-react';

export function isVideoUrl(url: string | undefined) {
  if (!url) return false;
  if (isOfflineVideoUrl(url)) return true;
  return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('.mp4') || url.includes('.webm');
}

export const exerciseTypeMeta: Record<NonNullable<Exercise['type']>, { icon: LucideIcon; short: string; label: string }> = {
  weight: { icon: Dumbbell, short: 'Ciężar', label: 'Ciężar' },
  reps: { icon: Repeat, short: 'Powt.', label: 'Powtórzenia' },
  duration: { icon: Timer, short: 'Czas', label: 'Czas trwania' },
};

/** Nazwy głównych partii (z fallbackiem na legacy `muscleGroup`). */
export function getMainMuscleNames(exercise: Exercise): string[] {
  if (exercise.mainMuscleGroups?.length) return exercise.mainMuscleGroups.map((mg) => mg.name);
  return exercise.muscleGroup ? [exercise.muscleGroup] : [];
}

/** Miniatura ćwiczenia: obrazek, placeholder wideo albo ikona hantla. */
export function ExerciseThumb({ exercise, iconClassName }: { exercise: Exercise; iconClassName?: string }) {
  const url = resolveMediaUrl(exercise.mediaUrl || exercise.image || '');

  if (!url) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-secondary">
        <Dumbbell className={cn('h-8 w-8 text-muted-foreground/30', iconClassName)} />
      </div>
    );
  }

  if (isVideoUrl(url)) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black">
        <PlayCircle className={cn('h-8 w-8 text-white/80', iconClassName)} />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={exercise.name}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

/** Kopiuje ID ćwiczenia i potwierdza to toastem. */
export function useCopyExerciseId() {
  const { toast } = useToast();
  return async (exercise: Exercise) => {
    const ok = await copyToClipboard(exercise.id);
    toast(ok ? { title: 'Skopiowano ID ćwiczenia', description: exercise.id } : { title: 'Nie udało się skopiować ID', variant: 'destructive' });
  };
}

/** Gwiazdka ulubionych; nie otwiera karty, na której leży. */
export function FavoriteButton({
  active,
  onToggle,
  className,
  iconClassName,
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={active}
      aria-label={active ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
      title={active ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
      className={cn('h-8 w-8 flex-shrink-0 rounded-full', className)}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <Star className={cn('h-4 w-4', active ? 'fill-food text-food' : 'text-muted-foreground', iconClassName)} />
    </Button>
  );
}

interface ExerciseActionsMenuProps {
  exercise: Exercise;
  canEdit: boolean;
  canDelete: boolean;
  showProgress: boolean;
  onEdit: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
  onShowProgress: (exercise: Exercise) => void;
  triggerClassName?: string;
}

export function ExerciseActionsMenu({
  exercise,
  canEdit,
  canDelete,
  showProgress,
  onEdit,
  onDelete,
  onShowProgress,
  triggerClassName,
}: ExerciseActionsMenuProps) {
  const copyId = useCopyExerciseId();

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={cn('h-8 w-8 flex-shrink-0 rounded-full', triggerClassName)}>
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Akcje</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => void copyId(exercise)}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Kopiuj ID</span>
          </DropdownMenuItem>
          {showProgress && (
            <DropdownMenuItem onClick={() => onShowProgress(exercise)}>
              <ChartIcon className="mr-2 h-4 w-4" />
              <span>Zobacz Postęp</span>
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit(exercise)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edytuj</span>
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem onClick={() => onDelete(exercise)}>
              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
              <span className="text-destructive">Usuń</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Etykieta właściciela: przy `showOwnerBadge` pełna, inaczej tylko "Własne". */
export function getOwnerLabel(exercise: Exercise, userId: string | undefined, showOwnerBadge: boolean): string | null {
  const isOwner = exercise.ownerId === userId;
  if (!showOwnerBadge) return isOwner ? 'Własne' : null;
  if (exercise.ownerId === 'public' || !exercise.ownerId) return 'Publiczne';
  return isOwner ? 'Własne' : 'Użytkownika';
}
