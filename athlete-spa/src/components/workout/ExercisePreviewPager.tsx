import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from '@/components/motion';
import { ExerciseDetailBody, ExerciseMedia } from '@/components/shared/exercises/ExerciseDetailDialog';
import { FavoriteButton, exerciseTypeMeta } from '@/components/shared/exercises/ExerciseCardParts';
import { haptic } from '@/lib/haptics';
import type { Exercise } from '@/lib/types';

/** How far (px) or how fast (px/s) a horizontal drag must go to turn the page. */
const SWIPE_OFFSET = 80;
const SWIPE_VELOCITY = 500;

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0.4 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? '-100%' : '100%', opacity: 0.4 }),
};

interface ExercisePreviewPagerProps {
  exercises: Exercise[];
  index: number;
  onIndexChange: (index: number) => void;
  onAdd: (exerciseId: string, exercise: Exercise) => void;
  onClose: () => void;
  /** Total matching the filters, which may exceed the pages loaded so far. */
  totalCount?: number;
  isLoadingMore?: boolean;
  isFavorite?: (exerciseId: string) => boolean;
  onToggleFavorite?: (exerciseId: string) => void;
}

/**
 * Full details of one exercise from the picker's results, laid over the list.
 * Swiping left/right (or the arrows) moves through the same results without
 * going back to the list; only the button at the bottom adds the exercise.
 */
export function ExercisePreviewPager({
  exercises,
  index,
  onIndexChange,
  onAdd,
  onClose,
  totalCount,
  isLoadingMore,
  isFavorite,
  onToggleFavorite,
}: ExercisePreviewPagerProps) {
  const [direction, setDirection] = useState(0);
  const exercise = exercises[index];
  const hasPrev = index > 0;
  const hasNext = index < exercises.length - 1;

  const go = (delta: -1 | 1) => {
    if (delta < 0 ? !hasPrev : !hasNext) return;
    haptic('tap');
    setDirection(delta);
    onIndexChange(index + delta);
  };

  // Arrow keys page through on desktop, as the swipe does on touch.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!exercise) return null;

  const typeMeta = exercise.type ? exerciseTypeMeta[exercise.type] : null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-t-3xl bg-background">
      <div className="flex shrink-0 items-center gap-1 px-3 pb-2 pt-4">
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label="Wróć do listy ćwiczeń" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="flex-1 text-center text-sm tabular-nums text-muted-foreground">
          {index + 1} / {Math.max(totalCount ?? 0, exercises.length)}
        </span>
        {onToggleFavorite && (
          <FavoriteButton
            active={isFavorite?.(exercise.id) ?? false}
            onToggle={() => onToggleFavorite(exercise.id)}
            className="h-10 w-10"
            iconClassName="h-5 w-5"
          />
        )}
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label="Poprzednie ćwiczenie" disabled={!hasPrev} onClick={() => go(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label="Następne ćwiczenie" disabled={!hasNext} onClick={() => go(1)}>
          {!hasNext && isLoadingMore ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={exercise.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: 'spring', stiffness: 400, damping: 38 }, opacity: { duration: 0.15 } }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: hasNext ? 0.7 : 0.15, right: hasPrev ? 0.7 : 0.15 }}
            onDragEnd={(_, { offset, velocity }) => {
              if (offset.x < -SWIPE_OFFSET || velocity.x < -SWIPE_VELOCITY) go(1);
              else if (offset.x > SWIPE_OFFSET || velocity.x > SWIPE_VELOCITY) go(-1);
            }}
            style={{ touchAction: 'pan-y' }}
            className="absolute inset-0 overflow-y-auto"
          >
            <ExerciseMedia exercise={exercise} />
            <div className="space-y-1.5 px-5 pt-5">
              {typeMeta && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <typeMeta.icon className="h-3 w-3" />
                  {typeMeta.label}
                </span>
              )}
              <h3 className="font-headline text-2xl font-bold leading-tight">{exercise.name}</h3>
            </div>
            <div className="px-5 pb-6 pt-5">
              <ExerciseDetailBody exercise={exercise} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-border/60 bg-background/90 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <Button type="button" className="h-12 w-full text-base" onClick={() => onAdd(exercise.id, exercise)}>
          <PlusCircle className="mr-2 h-5 w-5" />
          Dodaj do treningu
        </Button>
      </div>
    </div>
  );
}
