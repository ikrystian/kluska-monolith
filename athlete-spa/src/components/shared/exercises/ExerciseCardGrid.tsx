'use client';

import { motion } from '@/components/motion';
import { ExerciseCardProps } from './types';
import {
  ExerciseActionsMenu,
  ExerciseThumb,
  exerciseTypeMeta,
  getMainMuscleNames,
  getOwnerLabel,
} from './ExerciseCardParts';

export function ExerciseCardGrid({
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
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-lg"
      onClick={() => onClick?.(exercise)}
    >
      {/* Media */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
          <ExerciseThumb exercise={exercise} iconClassName="h-10 w-10" />
        </div>

        {typeMeta && (
          <span className="glass absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
            <typeMeta.icon className="h-2.5 w-2.5" />
            {typeMeta.short}
          </span>
        )}

        <div className="absolute right-1.5 top-1.5">
          <ExerciseActionsMenu
            exercise={exercise}
            canEdit={canEditThis}
            canDelete={canDeleteThis}
            showProgress={showProgress}
            onEdit={onEdit}
            onDelete={onDelete}
            onShowProgress={onShowProgress}
            triggerClassName="glass h-7 w-7 hover:bg-background/80"
          />
        </div>

        {ownerLabel && (
          <span className="absolute bottom-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
            {ownerLabel}
          </span>
        )}
      </div>

      {/* Treść */}
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">{exercise.name}</h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {muscles.length ? muscles.join(' · ') : 'Brak partii'}
        </p>
      </div>
    </motion.div>
  );
}
