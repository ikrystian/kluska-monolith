'use client';

import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { motion } from '@/components/motion';
import { ExerciseCardProps } from './types';
import {
  ExerciseActionsMenu,
  ExerciseThumb,
  exerciseTypeMeta,
  getMainMuscleNames,
  getOwnerLabel,
} from './ExerciseCardParts';

export function ExerciseCardHorizontal({
  exercise,
  userId,
  canEdit,
  canDelete,
  showProgress,
  showOwnerBadge,
  allowNonOwnerEdit = true,
  allowNonOwnerDelete = true,
  onEdit,
  onDelete,
  onShowProgress,
  onClick,
}: ExerciseCardProps) {
  const isOwner = exercise.ownerId === userId;
  const canEditThis = canEdit && (isOwner || allowNonOwnerEdit);
  const canDeleteThis = canDelete && (isOwner || allowNonOwnerDelete);
  const muscles = getMainMuscleNames(exercise);
  const typeMeta = exercise.type ? exerciseTypeMeta[exercise.type] : null;
  const ownerLabel = getOwnerLabel(exercise, userId, showOwnerBadge);

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className="group flex h-[88px] cursor-pointer items-center gap-3 rounded-2xl border bg-card p-2 pr-1 transition-colors hover:border-primary/40 hover:bg-accent/40"
      onClick={() => onClick?.(exercise)}
    >
      {/* Miniatura */}
      <div className="relative aspect-square h-full flex-shrink-0 overflow-hidden rounded-xl bg-muted">
        <ExerciseThumb exercise={exercise} iconClassName="h-6 w-6" />
      </div>

      {/* Treść */}
      <div className="min-w-0 flex-1 py-1">
        <h3 className="line-clamp-1 text-sm font-semibold md:text-base">{exercise.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {muscles.length ? muscles.join(' · ') : 'Brak partii'}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {typeMeta && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <typeMeta.icon className="h-2.5 w-2.5" />
              {typeMeta.short}
            </span>
          )}
          {ownerLabel && (
            <Badge variant="outline" className="h-[18px] px-1.5 text-[10px] font-medium">
              {ownerLabel}
            </Badge>
          )}
        </div>
      </div>

      {/* Akcje */}
      <div className="flex flex-shrink-0 items-center">
        <ExerciseActionsMenu
          exercise={exercise}
          canEdit={canEditThis}
          canDelete={canDeleteThis}
          showProgress={showProgress}
          onEdit={onEdit}
          onDelete={onDelete}
          onShowProgress={onShowProgress}
        />
        <ChevronRight className="mr-1 h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
      </div>
    </motion.div>
  );
}
