'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { SetInfoSlide } from './SetInfoSlide';
import { RestTimerSlide } from './RestTimerSlide';
import { WorkoutOverviewSheet } from './WorkoutOverviewSheet';
import { AddExerciseSheet } from './AddExerciseSheet';
import { Button } from '@/components/ui/button';
import { type Exercise, SetType } from '@/lib/types';
import { type ExerciseType } from '@/lib/set-type-config';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  ListOrdered,
  Layers,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Form values schema
interface LogFormValues {
  workoutName: string;
  exerciseSeries: {
    exerciseId: string;
    sets: {
      number?: number;
      type: SetType;
      reps: number;
      weight: number;
      restTimeSeconds: number;
      completed?: boolean;
      duration?: number;
      rpe?: number;
    }[];
    tempo?: string;
    tip?: string;
  }[];
  level: string;
  durationMinutes?: number;
  startTime?: any;
}

interface SlideData {
  type: 'set-info' | 'rest-timer';
  exerciseIndex: number;
  setIndex: number;
  globalSetIndex: number;
}

export interface CarouselWorkoutViewProps {
  allExercises: Exercise[] | null;
  isLoadingExercises: boolean;
  onSetComplete: (exerciseIndex: number, setIndex: number) => void;
  onAddExercise?: (exerciseId: string) => void;
  onRemoveExercise?: (exerciseIndex: number) => void;
  userId?: string | null;
  workoutName?: string;
  onFinishWorkout?: () => void;
}

export function CarouselWorkoutView({
  allExercises,
  isLoadingExercises,
  onSetComplete,
  onAddExercise,
  onRemoveExercise,
  userId,
  onFinishWorkout,
}: CarouselWorkoutViewProps) {
  const form = useFormContext<LogFormValues>();
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSlideIndex, setValidationSlideIndex] = useState<number | null>(null);
  const [overviewSheetOpen, setOverviewSheetOpen] = useState(false);
  const isValidatingRef = useRef(false);
  const exerciseRailRef = useRef<HTMLDivElement>(null);
  const dotsContainerRef = useRef<HTMLDivElement>(null);

  // Watch exerciseSeries for reactive updates
  const exerciseSeries = form.watch('exerciseSeries') || [];

  // Generate slide data: a set-info slide and a rest-timer slide for each set
  const slides = useMemo((): SlideData[] => {
    const result: SlideData[] = [];
    let globalSetIndex = 0;

    exerciseSeries.forEach((exercise, exerciseIndex) => {
      exercise.sets.forEach((_, setIndex) => {
        // Set info slide
        result.push({
          type: 'set-info',
          exerciseIndex,
          setIndex,
          globalSetIndex,
        });

        // Rest timer slide
        result.push({
          type: 'rest-timer',
          exerciseIndex,
          setIndex,
          globalSetIndex,
        });

        globalSetIndex++;
      });
    });

    return result;
  }, [exerciseSeries]);

  const currentSlide = slides[currentSlideIndex];

  // Helper to fetch exercise definition
  const getCurrentExerciseDetails = useCallback(
    (exerciseIndex: number) => {
      const exerciseId = exerciseSeries[exerciseIndex]?.exerciseId;
      return allExercises?.find((ex) => ex.id === exerciseId);
    },
    [exerciseSeries, allExercises]
  );

  // Current exercise index based on slide
  const currentExerciseIndex = currentSlide?.exerciseIndex ?? 0;
  const currentSetIndex = currentSlide?.setIndex ?? 0;

  // Validation function
  const validateSet = useCallback(
    (exerciseIndex: number, setIndex: number): { valid: boolean; error?: string } => {
      const set = exerciseSeries[exerciseIndex]?.sets[setIndex];
      if (!set) return { valid: false, error: 'Seria nie istnieje' };

      const exerciseId = exerciseSeries[exerciseIndex]?.exerciseId;
      const exerciseDetails = allExercises?.find((ex) => ex.id === exerciseId);
      const exerciseType: ExerciseType = exerciseDetails?.type || 'weight';

      if (exerciseType === 'weight') {
        if (!set.reps || set.reps <= 0) {
          return { valid: false, error: 'Uzupełnij liczbę powtórzeń (większą od 0)' };
        }
        if (
          set.weight === undefined ||
          set.weight === null ||
          (set.weight as any) === '' ||
          isNaN(Number(set.weight))
        ) {
          return { valid: false, error: 'Uzupełnij ciężar (0 dla masy ciała)' };
        }
      } else if (exerciseType === 'reps') {
        if (!set.reps || set.reps <= 0) {
          return { valid: false, error: 'Uzupełnij liczbę powtórzeń (większą od 0)' };
        }
      } else if (exerciseType === 'duration') {
        if (!set.duration || set.duration <= 0) {
          return { valid: false, error: 'Uzupełnij czas trwania (większy od 0)' };
        }
      }

      return { valid: true };
    },
    [exerciseSeries, allExercises]
  );

  // Auto-scroll the active exercise chip into view
  useEffect(() => {
    const activeChip = exerciseRailRef.current?.querySelector<HTMLElement>(
      `[data-ex-idx="${currentExerciseIndex}"]`
    );
    activeChip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [currentExerciseIndex]);

  // Auto-scroll the active dot indicator
  useEffect(() => {
    const el = dotsContainerRef.current?.querySelector<HTMLElement>(
      `[data-idx="${currentSlideIndex}"]`
    );
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [currentSlideIndex]);

  // Handle slide changes & validation snap-back
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      if (isValidatingRef.current) return;

      const newIndex = api.selectedScrollSnap();
      const previousIndex = currentSlideIndex;

      // Moving from set-info to rest-timer: validate & complete set
      if (previousIndex < slides.length && newIndex < slides.length) {
        const previousSlide = slides[previousIndex];
        const newSlide = slides[newIndex];

        if (previousSlide?.type === 'set-info' && newSlide?.type === 'rest-timer') {
          const validation = validateSet(previousSlide.exerciseIndex, previousSlide.setIndex);

          if (!validation.valid) {
            isValidatingRef.current = true;
            setValidationError(validation.error || 'Uzupełnij wymagane pola');
            setValidationSlideIndex(previousIndex);

            setTimeout(() => {
              api.scrollTo(previousIndex);
              setTimeout(() => {
                isValidatingRef.current = false;
              }, 300);
            }, 0);
            return;
          }

          setValidationError(null);
          setValidationSlideIndex(null);
          onSetComplete(previousSlide.exerciseIndex, previousSlide.setIndex);
        }
      }

      setCurrentSlideIndex(newIndex);
    };

    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api, currentSlideIndex, slides, onSetComplete, validateSet]);

  // Next set info for rest slide
  const getNextSetInfo = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      const currentExercise = exerciseSeries[exerciseIndex];
      if (!currentExercise) return null;

      const isLastSetOfExercise = setIndex === currentExercise.sets.length - 1;

      if (isLastSetOfExercise) {
        const nextExerciseIndex = exerciseIndex + 1;
        if (nextExerciseIndex < exerciseSeries.length) {
          const nextExerciseDetails = getCurrentExerciseDetails(nextExerciseIndex);
          const nextSet = exerciseSeries[nextExerciseIndex]?.sets[0];
          return {
            exerciseName: nextExerciseDetails?.name || 'Następne ćwiczenie',
            setNumber: 1,
            totalSetsInExercise: exerciseSeries[nextExerciseIndex]?.sets.length,
            isNewExercise: true,
            targetWeight: nextSet?.weight,
            targetReps: nextSet?.reps,
            targetDuration: nextSet?.duration,
          };
        }
        // Last set of workout
        return null;
      }

      // Next set in current exercise
      const exerciseDetails = getCurrentExerciseDetails(exerciseIndex);
      const nextSet = currentExercise.sets[setIndex + 1];
      return {
        exerciseName: exerciseDetails?.name || 'Ćwiczenie',
        setNumber: setIndex + 2,
        totalSetsInExercise: currentExercise.sets.length,
        isNewExercise: false,
        targetWeight: nextSet?.weight,
        targetReps: nextSet?.reps,
        targetDuration: nextSet?.duration,
      };
    },
    [exerciseSeries, getCurrentExerciseDetails]
  );

  // Advance forward with validation
  const handleNavigateNext = useCallback(() => {
    if (!api || currentSlideIndex >= slides.length - 1) return;

    const currentSlideData = slides[currentSlideIndex];
    const nextSlideData = slides[currentSlideIndex + 1];

    if (currentSlideData?.type === 'set-info' && nextSlideData?.type === 'rest-timer') {
      const validation = validateSet(currentSlideData.exerciseIndex, currentSlideData.setIndex);

      if (!validation.valid) {
        setValidationError(validation.error || 'Uzupełnij wymagane pola');
        setValidationSlideIndex(currentSlideIndex);
        haptic('warning');
        return;
      }

      setValidationError(null);
      setValidationSlideIndex(null);
      onSetComplete(currentSlideData.exerciseIndex, currentSlideData.setIndex);
    }

    api.scrollNext();
  }, [api, currentSlideIndex, slides, validateSet, onSetComplete]);

  // Jump to specific exercise
  const jumpToExercise = useCallback(
    (targetExIndex: number) => {
      const ex = exerciseSeries[targetExIndex];
      if (!ex) return;

      // Find first incomplete set, or first set
      const incompleteSetIdx = ex.sets.findIndex((s) => !s.completed);
      const targetSetIdx = incompleteSetIdx >= 0 ? incompleteSetIdx : 0;

      const slideIdx = slides.findIndex(
        (s) => s.exerciseIndex === targetExIndex && s.setIndex === targetSetIdx && s.type === 'set-info'
      );

      if (slideIdx >= 0 && api) {
        haptic('tap');
        api.scrollTo(slideIdx);
      }
    },
    [exerciseSeries, slides, api]
  );

  // Jump directly to a set
  const jumpToSet = useCallback(
    (targetExIndex: number, targetSetIndex: number) => {
      const slideIdx = slides.findIndex(
        (s) => s.exerciseIndex === targetExIndex && s.setIndex === targetSetIndex && s.type === 'set-info'
      );
      if (slideIdx >= 0 && api) {
        haptic('tap');
        api.scrollTo(slideIdx);
      }
    },
    [slides, api]
  );

  // Timer complete handler
  const handleTimerComplete = useCallback(() => {
    if (api && currentSlideIndex < slides.length - 1) {
      setTimeout(() => {
        api.scrollNext();
      }, 500);
    }
  }, [api, currentSlideIndex, slides.length]);

  // Skip rest timer
  const handleSkip = useCallback(() => {
    if (api && currentSlideIndex < slides.length - 1) {
      api.scrollNext();
    }
  }, [api, currentSlideIndex, slides.length]);

  // Add extra set to exercise
  const handleAddSetToExercise = useCallback(
    (exerciseIndex: number) => {
      const currentSets = form.getValues(`exerciseSeries.${exerciseIndex}.sets`) || [];
      const lastSet = currentSets[currentSets.length - 1];
      const newSet = {
        number: currentSets.length + 1,
        type: lastSet?.type || SetType.WorkingSet,
        reps: lastSet?.reps || 0,
        weight: lastSet?.weight || 0,
        restTimeSeconds: lastSet?.restTimeSeconds || 60,
        duration: lastSet?.duration,
        rpe: undefined,
        completed: false,
      };
      form.setValue(`exerciseSeries.${exerciseIndex}.sets`, [...currentSets, newSet]);
      haptic('tap');
      toast({
        title: 'Dodano serię',
        description: `Seria ${currentSets.length + 1} została dodana do ćwiczenia.`,
      });
    },
    [form]
  );

  // Delete set from exercise
  const handleDeleteSet = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      const currentSets = form.getValues(`exerciseSeries.${exerciseIndex}.sets`) || [];
      if (currentSets.length <= 1) {
        toast({
          title: 'Nie można usunąć',
          description: 'Ćwiczenie musi mieć przynajmniej jedną serię.',
          variant: 'destructive',
        });
        return;
      }
      const updated = currentSets
        .filter((_, idx) => idx !== setIndex)
        .map((s, idx) => ({ ...s, number: idx + 1 }));
      form.setValue(`exerciseSeries.${exerciseIndex}.sets`, updated);
      haptic('tap');
      toast({
        title: 'Usunięto serię',
        description: `Seria ${setIndex + 1} została usunięta.`,
      });
    },
    [form]
  );

  // Update set type
  const handleSetTypeChange = useCallback(
    (exerciseIndex: number, setIndex: number, type: SetType) => {
      form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.type`, type);
    },
    [form]
  );

  // Form field mutators
  const handleStartEditing = useCallback(
    (exerciseIndex: number, setIndex: number) => {
      form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.completed`, false);
    },
    [form]
  );

  const handleRepsChange = useCallback(
    (exerciseIndex: number, setIndex: number, value: number) => {
      form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.reps`, value);
    },
    [form]
  );

  const handleWeightChange = useCallback(
    (exerciseIndex: number, setIndex: number, value: number) => {
      form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.weight`, value);
    },
    [form]
  );

  const handleDurationChange = useCallback(
    (exerciseIndex: number, setIndex: number, value: number) => {
      form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.duration`, value);
    },
    [form]
  );

  const handleRpeChange = useCallback(
    (exerciseIndex: number, setIndex: number, value: number | undefined) => {
      form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.rpe`, value);
    },
    [form]
  );

  if (slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <p className="text-base font-semibold text-foreground">Brak ćwiczeń w treningu</p>
        <p className="text-sm text-muted-foreground mt-1">
          Dodaj ćwiczenie, aby rozpocząć rejestrację serii.
        </p>
        {onAddExercise && (
          <div className="mt-4">
            <AddExerciseSheet onAddExercise={onAddExercise} />
          </div>
        )}
      </div>
    );
  }

  // Prepare overview exercises data
  const overviewExercises = exerciseSeries.map((ex, idx) => ({
    exerciseId: ex.exerciseId,
    name: getCurrentExerciseDetails(idx)?.name || `Ćwiczenie ${idx + 1}`,
    sets: ex.sets || [],
  }));

  const activeExerciseData = exerciseSeries[currentExerciseIndex];

  return (
    <div className="flex flex-col h-full min-h-0 select-none">
      {/* Top Exercise Navigation Rail */}
      <div className="shrink-0 pb-2">
        <div
          ref={exerciseRailRef}
          className="no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4"
        >
          {exerciseSeries.map((ex, idx) => {
            const exDetails = getCurrentExerciseDetails(idx);
            const isActive = idx === currentExerciseIndex;
            const completedSetsCount = ex.sets.filter((s) => s.completed).length;
            const isCompleted = ex.sets.length > 0 && completedSetsCount === ex.sets.length;

            return (
              <button
                key={ex.exerciseId || idx}
                data-ex-idx={idx}
                type="button"
                onClick={() => jumpToExercise(idx)}
                className={cn(
                  'flex h-8.5 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold tabular-nums transition-all active:scale-95 border',
                  isActive
                    ? 'bg-foreground text-background border-foreground shadow-xs font-bold'
                    : isCompleted
                      ? 'border-volt/40 bg-volt/10 text-volt hover:bg-volt/15'
                      : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{idx + 1}.</span>
                <span className="max-w-[7.5rem] truncate">
                  {exDetails?.name || `Ćw. ${idx + 1}`}
                </span>
                {isCompleted ? (
                  <Check className="h-3 w-3 text-volt stroke-[2.5]" />
                ) : (
                  <span className="opacity-70 text-[11px]">
                    ({completedSetsCount}/{ex.sets.length})
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Add Exercise button in rail */}
          {onAddExercise && (
            <AddExerciseSheet
              onAddExercise={onAddExercise}
              trigger={
                <button
                  type="button"
                  aria-label="Dodaj kolejne ćwiczenie"
                  className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-dashed border-border/80 bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* Main Carousel viewport */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <Carousel
          setApi={setApi}
          opts={{
            align: 'center',
            loop: false,
            slidesToScroll: 1,
            containScroll: false,
          }}
          className="w-full h-full"
        >
          <CarouselContent className="h-full -ml-2.5">
            {slides.map((slide, index) => {
              const exerciseDetails = getCurrentExerciseDetails(slide.exerciseIndex);
              const exerciseData = exerciseSeries[slide.exerciseIndex];
              const setData = exerciseData?.sets[slide.setIndex];
              const isActive = currentSlideIndex === index;

              if (!setData || !exerciseData) return null;

              if (slide.type === 'set-info') {
                const showError = validationSlideIndex === index ? validationError : null;

                return (
                  <CarouselItem
                    key={`set-${slide.exerciseIndex}-${slide.setIndex}`}
                    className="h-full basis-[92%] sm:basis-[88%] pl-2.5"
                  >
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        isActive ? 'scale-100 opacity-100' : 'scale-[0.96] opacity-35'
                      )}
                    >
                      <SetInfoSlide
                        exerciseName={
                          exerciseDetails?.name ||
                          (isLoadingExercises ? 'Ładowanie...' : 'Ćwiczenie')
                        }
                        exerciseDetails={exerciseDetails}
                        setIndex={slide.setIndex}
                        totalSets={exerciseData.sets.length}
                        setType={setData.type}
                        targetReps={setData.reps}
                        targetWeight={setData.weight}
                        targetDuration={setData.duration}
                        actualReps={setData.reps}
                        actualWeight={setData.weight}
                        actualDuration={setData.duration}
                        rpe={setData.rpe}
                        tempo={exerciseData.tempo}
                        tip={exerciseData.tip}
                        onRepsChange={(val) =>
                          handleRepsChange(slide.exerciseIndex, slide.setIndex, val)
                        }
                        onWeightChange={(val) =>
                          handleWeightChange(slide.exerciseIndex, slide.setIndex, val)
                        }
                        onDurationChange={(val) =>
                          handleDurationChange(slide.exerciseIndex, slide.setIndex, val)
                        }
                        onRpeChange={(val) =>
                          handleRpeChange(slide.exerciseIndex, slide.setIndex, val)
                        }
                        onSetTypeChange={(val) =>
                          handleSetTypeChange(slide.exerciseIndex, slide.setIndex, val)
                        }
                        onDeleteSet={() => handleDeleteSet(slide.exerciseIndex, slide.setIndex)}
                        onAddSet={() => handleAddSetToExercise(slide.exerciseIndex)}
                        userId={userId}
                        isCompleted={setData.completed}
                        validationError={showError}
                        onStartEditing={() =>
                          handleStartEditing(slide.exerciseIndex, slide.setIndex)
                        }
                        onConfirm={handleNavigateNext}
                      />
                    </div>
                  </CarouselItem>
                );
              }

              // Rest timer slide
              return (
                <CarouselItem
                  key={`rest-${slide.exerciseIndex}-${slide.setIndex}`}
                  className="h-full basis-[92%] sm:basis-[88%] pl-2.5"
                >
                  <div
                    className={cn(
                      'h-full transition-all duration-300',
                      isActive ? 'scale-100 opacity-100' : 'scale-[0.96] opacity-35'
                    )}
                  >
                    <RestTimerSlide
                      restTimeSeconds={setData.restTimeSeconds || 60}
                      nextSetInfo={getNextSetInfo(slide.exerciseIndex, slide.setIndex)}
                      isActive={currentSlideIndex === index}
                      onComplete={handleTimerComplete}
                      onSkip={handleSkip}
                      onFinishWorkout={onFinishWorkout}
                    />
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Docked Bottom Controls: Thumb reach */}
      <div className="shrink-0 pt-2 pb-1">
        <div className="flex items-center justify-between gap-2">
          {/* Previous Slide Button */}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={!api || currentSlideIndex === 0}
            onClick={() => {
              haptic('tap');
              api?.scrollPrev();
            }}
            aria-label="Poprzedni slajd"
            className="h-11 w-11 shrink-0 rounded-2xl shadow-xs"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* Quick Jump & Overview Drawer Trigger */}
          <button
            type="button"
            onClick={() => {
              haptic('tap');
              setOverviewSheetOpen(true);
            }}
            className="flex-1 h-11 flex items-center justify-center gap-2 px-3 rounded-2xl bg-secondary/70 hover:bg-secondary border border-border/50 text-foreground transition-all active:scale-[0.98]"
          >
            <ListOrdered className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-bold truncate tabular-nums">
              {currentSlide?.type === 'rest-timer'
                ? 'Przerwa'
                : `Ćw. ${currentExerciseIndex + 1}/${exerciseSeries.length} · S. ${currentSetIndex + 1}/${activeExerciseData?.sets.length || 0}`}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
              · Przegląd
            </span>
          </button>

          {/* Next Slide Button */}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={!api || currentSlideIndex >= slides.length - 1}
            onClick={() => {
              haptic('tap');
              handleNavigateNext();
            }}
            aria-label="Następny slajd"
            className="h-11 w-11 shrink-0 rounded-2xl shadow-xs"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Compact slide dots strip */}
        <div
          ref={dotsContainerRef}
          className="flex items-center justify-center gap-1 mt-2 overflow-x-auto no-scrollbar py-0.5"
        >
          {slides.map((slide, index) => {
            const exData = exerciseSeries[slide.exerciseIndex];
            const setData = exData?.sets[slide.setIndex];
            const isDone = slide.type === 'set-info' && setData?.completed;

            return (
              <button
                key={index}
                data-idx={index}
                type="button"
                onClick={() => {
                  haptic('tap');
                  api?.scrollTo(index);
                }}
                className={cn(
                  'h-1 rounded-full shrink-0 transition-all duration-200',
                  index === currentSlideIndex
                    ? 'w-6 bg-primary'
                    : isDone
                      ? 'w-1.5 bg-volt'
                      : slide.type === 'set-info'
                        ? 'w-1.5 bg-muted-foreground/40'
                        : 'w-1 bg-muted/70'
                )}
                aria-label={`Przejdź do slajdu ${index + 1}`}
              />
            );
          })}
        </div>
      </div>

      {/* Workout Overview Sheet */}
      <WorkoutOverviewSheet
        open={overviewSheetOpen}
        onOpenChange={setOverviewSheetOpen}
        exercises={overviewExercises}
        currentExerciseIndex={currentExerciseIndex}
        currentSetIndex={currentSetIndex}
        onJumpToSet={jumpToSet}
        onAddExercise={onAddExercise}
        onRemoveExercise={onRemoveExercise}
        onFinishWorkout={onFinishWorkout}
      />
    </div>
  );
}
