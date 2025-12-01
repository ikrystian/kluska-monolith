'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from '@/components/ui/carousel';
import { SetInfoSlide } from './SetInfoSlide';
import { RestTimerSlide } from './RestTimerSlide';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { type Exercise, SetType } from '@/lib/types';
import { type ExerciseType } from '@/lib/set-type-config';

// Type for form values (matching the log page schema)
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
  globalSetIndex: number; // For tracking overall progress
}

interface CarouselWorkoutViewProps {
  allExercises: Exercise[] | null;
  isLoadingExercises: boolean;
  onSetComplete: (exerciseIndex: number, setIndex: number) => void;
}

export function CarouselWorkoutView({
  allExercises,
  isLoadingExercises,
  onSetComplete,
}: CarouselWorkoutViewProps) {
  const form = useFormContext<LogFormValues>();
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSlideIndex, setValidationSlideIndex] = useState<number | null>(null);
  const isValidatingRef = useRef(false);

  // Watch the entire exerciseSeries to ensure reactivity
  const exerciseSeries = form.watch('exerciseSeries');

  // Force re-render when any set's completed status changes
  const completedStates = useMemo(() => {
    return exerciseSeries.map(ex => ex.sets.map(s => s.completed));
  }, [exerciseSeries]);

  // Generate slide data from exercises
  const slides = useMemo((): SlideData[] => {
    const result: SlideData[] = [];
    let globalSetIndex = 0;

    exerciseSeries.forEach((exercise, exerciseIndex) => {
      exercise.sets.forEach((set, setIndex) => {
        // Set info slide
        result.push({
          type: 'set-info',
          exerciseIndex,
          setIndex,
          globalSetIndex,
        });

        // Rest timer slide (after each set)
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

  // Calculate total sets for progress
  const totalSets = useMemo(() => {
    return exerciseSeries.reduce((acc, ex) => acc + ex.sets.length, 0);
  }, [exerciseSeries]);

  // Get completed sets count - explicitly depend on completedStates for reactivity
  const completedSets = useMemo(() => {
    let count = 0;
    completedStates.forEach(exerciseSets => {
      exerciseSets.forEach(isCompleted => {
        if (isCompleted) count++;
      });
    });
    return count;
  }, [completedStates]);

  // Validation function for a set - depends on exercise type
  // Weight 0 is valid for bodyweight exercises, but reps must be > 0
  const validateSet = useCallback((exerciseIndex: number, setIndex: number): { valid: boolean; error?: string } => {
    const set = exerciseSeries[exerciseIndex]?.sets[setIndex];
    if (!set) return { valid: false, error: 'Seria nie istnieje' };

    // Get exercise type
    const exerciseId = exerciseSeries[exerciseIndex]?.exerciseId;
    const exerciseDetails = allExercises?.find(ex => ex.id === exerciseId);
    const exerciseType: ExerciseType = exerciseDetails?.type || 'weight';

    if (exerciseType === 'weight') {
      // Weight exercises need reps > 0, weight >= 0 (0 is valid for bodyweight)
      if (!set.reps || set.reps <= 0) {
        return { valid: false, error: 'Uzupełnij liczbę powtórzeń (musi być większa od 0)' };
      }
      // Weight can be 0 for bodyweight exercises, but must be defined
      if (set.weight === undefined || set.weight === null || set.weight === '' as any || isNaN(Number(set.weight))) {
        return { valid: false, error: 'Uzupełnij ciężar (0 dla ćwiczeń z masą ciała)' };
      }
    } else if (exerciseType === 'reps') {
      // Reps-only exercises just need reps > 0
      if (!set.reps || set.reps <= 0) {
        return { valid: false, error: 'Uzupełnij liczbę powtórzeń (musi być większa od 0)' };
      }
    } else if (exerciseType === 'duration') {
      // Duration exercises need duration > 0
      if (!set.duration || set.duration <= 0) {
        return { valid: false, error: 'Uzupełnij czas trwania (musi być większy od 0)' };
      }
    }

    return { valid: true };
  }, [exerciseSeries, allExercises]);

  // Get current slide data
  const currentSlide = slides[currentSlideIndex];

  // Get exercise details for current slide
  const getCurrentExerciseDetails = useCallback((exerciseIndex: number) => {
    const exerciseId = exerciseSeries[exerciseIndex]?.exerciseId;
    return allExercises?.find(ex => ex.id === exerciseId);
  }, [exerciseSeries, allExercises]);

  // Get next set info for timer slide
  const getNextSetInfo = useCallback((exerciseIndex: number, setIndex: number) => {
    const currentExercise = exerciseSeries[exerciseIndex];
    const isLastSetOfExercise = setIndex === currentExercise.sets.length - 1;

    if (isLastSetOfExercise) {
      // Check if there's a next exercise
      const nextExerciseIndex = exerciseIndex + 1;
      if (nextExerciseIndex < exerciseSeries.length) {
        const nextExercise = exerciseSeries[nextExerciseIndex];
        const nextExerciseDetails = getCurrentExerciseDetails(nextExerciseIndex);
        return {
          exerciseName: nextExerciseDetails?.name || 'Następne ćwiczenie',
          setNumber: 1,
          isNewExercise: true,
        };
      }
      // This is the last set of the last exercise
      return null;
    }

    // Next set in same exercise
    const exerciseDetails = getCurrentExerciseDetails(exerciseIndex);
    return {
      exerciseName: exerciseDetails?.name || 'Ćwiczenie',
      setNumber: setIndex + 2,
      isNewExercise: false,
    };
  }, [exerciseSeries, getCurrentExerciseDetails]);

  // Clear validation error when user changes input
  useEffect(() => {
    if (validationError && validationSlideIndex !== null) {
      const slide = slides[validationSlideIndex];
      if (slide) {
        const validation = validateSet(slide.exerciseIndex, slide.setIndex);
        if (validation.valid) {
          setValidationError(null);
          setValidationSlideIndex(null);
        }
      }
    }
  }, [exerciseSeries, validationError, validationSlideIndex, slides, validateSet]);

  // Handle slide change
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      // Skip if we're in the middle of validation snap-back
      if (isValidatingRef.current) {
        return;
      }

      const newIndex = api.selectedScrollSnap();
      const previousIndex = currentSlideIndex;

      // Check if we're moving from a set-info slide to a rest-timer slide
      // This means the user is starting their rest, so validate and mark the set as complete
      if (previousIndex < slides.length && newIndex < slides.length) {
        const previousSlide = slides[previousIndex];
        const newSlide = slides[newIndex];

        if (previousSlide?.type === 'set-info' && newSlide?.type === 'rest-timer') {
          // Validate before completing
          const validation = validateSet(previousSlide.exerciseIndex, previousSlide.setIndex);

          if (!validation.valid) {
            // Snap back to previous slide
            isValidatingRef.current = true;
            setValidationError(validation.error || 'Uzupełnij wymagane pola');
            setValidationSlideIndex(previousIndex);

            // Use setTimeout to allow the current event to complete
            setTimeout(() => {
              api.scrollTo(previousIndex);
              // Reset the flag after animation completes
              setTimeout(() => {
                isValidatingRef.current = false;
              }, 300);
            }, 0);
            return;
          }

          // Clear any previous error
          setValidationError(null);
          setValidationSlideIndex(null);

          // Mark the set as complete
          onSetComplete(previousSlide.exerciseIndex, previousSlide.setIndex);
        }
      }

      setCurrentSlideIndex(newIndex);
    };

    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api, currentSlideIndex, slides, onSetComplete, validateSet, form]);

  // Handle timer complete - auto advance to next slide
  const handleTimerComplete = useCallback(() => {
    if (api && currentSlideIndex < slides.length - 1) {
      // Small delay before advancing
      setTimeout(() => {
        api.scrollNext();
      }, 500);
    }
  }, [api, currentSlideIndex, slides.length]);

  // Handle skip - advance immediately
  const handleSkip = useCallback(() => {
    if (api && currentSlideIndex < slides.length - 1) {
      api.scrollNext();
    }
  }, [api, currentSlideIndex, slides.length]);

  // Handle navigation with validation for forward movement
  const handleNavigateNext = useCallback(() => {
    if (!api || currentSlideIndex >= slides.length - 1) return;

    const currentSlideData = slides[currentSlideIndex];
    const nextSlideData = slides[currentSlideIndex + 1];

    // If moving from set-info to rest-timer, validate first
    if (currentSlideData?.type === 'set-info' && nextSlideData?.type === 'rest-timer') {
      const validation = validateSet(currentSlideData.exerciseIndex, currentSlideData.setIndex);

      if (!validation.valid) {
        setValidationError(validation.error || 'Uzupełnij wymagane pola');
        setValidationSlideIndex(currentSlideIndex);
        return;
      }

      // Clear validation and mark as complete
      setValidationError(null);
      setValidationSlideIndex(null);
      onSetComplete(currentSlideData.exerciseIndex, currentSlideData.setIndex);
    }

    api.scrollNext();
  }, [api, currentSlideIndex, slides, validateSet, onSetComplete]);

  // Handle navigation backward - always allowed
  const handleNavigatePrev = useCallback(() => {
    if (!api || currentSlideIndex <= 0) return;

    // Clear any validation errors when going back
    setValidationError(null);
    setValidationSlideIndex(null);

    api.scrollPrev();
  }, [api, currentSlideIndex]);

  // Handle starting to edit a completed set - unmarks it as completed
  const handleStartEditing = useCallback((exerciseIndex: number, setIndex: number) => {
    form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.completed`, false);
  }, [form]);

  // Handle reps/weight change
  const handleRepsChange = useCallback((exerciseIndex: number, setIndex: number, value: number) => {
    form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.reps`, value);
  }, [form]);

  const handleWeightChange = useCallback((exerciseIndex: number, setIndex: number, value: number) => {
    form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.weight`, value);
  }, [form]);

  const handleDurationChange = useCallback((exerciseIndex: number, setIndex: number, value: number) => {
    form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.duration`, value);
  }, [form]);

  if (slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground">Brak ćwiczeń w treningu.</p>
        <p className="text-sm text-muted-foreground">Dodaj ćwiczenia, aby rozpocząć.</p>
      </div>
    );
  }

  // Get current set info for progress bar display
  const getCurrentSetInfo = useCallback(() => {
    if (!currentSlide) return null;

    const exerciseData = exerciseSeries[currentSlide.exerciseIndex];
    const setData = exerciseData?.sets[currentSlide.setIndex];
    const exerciseDetails = getCurrentExerciseDetails(currentSlide.exerciseIndex);

    if (!setData || !exerciseData) return null;

    return {
      exerciseName: exerciseDetails?.name || 'Ćwiczenie',
      setNumber: currentSlide.setIndex + 1,
      totalSetsInExercise: exerciseData.sets.length,
      reps: setData.reps,
      weight: setData.weight,
      duration: setData.duration,
      isCompleted: setData.completed,
      isRestSlide: currentSlide.type === 'rest-timer',
      exerciseType: exerciseDetails?.type || 'weight',
    };
  }, [currentSlide, exerciseSeries, getCurrentExerciseDetails]);

  const currentSetInfo = getCurrentSetInfo();

  return (
    <div className="flex flex-col h-full">
      {/* Progress Header */}
      <div className="px-4 py-3 border-b bg-background/95 backdrop-blur" id="progress-series-bar">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {currentSetInfo && (
              <>
                <Badge variant="outline" className="text-xs shrink-0">
                  {currentSetInfo.exerciseName}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0">
                  Seria {currentSetInfo.setNumber}/{currentSetInfo.totalSetsInExercise}
                </span>
                {currentSetInfo.isCompleted && (
                  <Badge variant="default" className="text-xs bg-green-500 shrink-0">
                    ✓
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {currentSetInfo && !currentSetInfo.isRestSlide && (
              <span className="text-xs font-medium text-primary">
                {currentSetInfo.exerciseType === 'duration'
                  ? `${currentSetInfo.duration || 0}s`
                  : currentSetInfo.exerciseType === 'reps'
                  ? `${currentSetInfo.reps || 0} powt.`
                  : `${currentSetInfo.weight || 0}kg × ${currentSetInfo.reps || 0}`
                }
              </span>
            )}
            <span className="text-sm text-muted-foreground font-medium">
              {completedSets}/{totalSets}
            </span>
          </div>
        </div>
        <Progress value={totalSets > 0 ? (completedSets / totalSets) * 100 : 0} className="h-2" />
      </div>

      {/* Carousel with Navigation Arrows */}
      <div className="flex-1 overflow-hidden relative">
        {/* Left Navigation Arrow */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur shadow-lg hover:bg-background"
          onClick={handleNavigatePrev}
          disabled={currentSlideIndex <= 0}
          aria-label="Poprzedni slajd"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        {/* Right Navigation Arrow */}
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur shadow-lg hover:bg-background"
          onClick={handleNavigateNext}
          disabled={currentSlideIndex >= slides.length - 1}
          aria-label="Następny slajd"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        <Carousel
          setApi={setApi}
          opts={{
            align: 'center',
            loop: false,
          }}
          className="w-full h-full"
        >
          <CarouselContent className="h-full">
            {slides.map((slide, index) => {
              const exerciseDetails = getCurrentExerciseDetails(slide.exerciseIndex);
              const exerciseData = exerciseSeries[slide.exerciseIndex];
              const setData = exerciseData?.sets[slide.setIndex];

              if (!setData) return null;

              if (slide.type === 'set-info') {
                // Show validation error only for the slide that failed validation
                const showError = validationSlideIndex === index ? validationError : null;

                return (
                  <CarouselItem key={`set-${slide.exerciseIndex}-${slide.setIndex}`} className="h-full">
                    <SetInfoSlide
                      exerciseName={exerciseDetails?.name || (isLoadingExercises ? 'Ładowanie...' : 'Nieznane ćwiczenie')}
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
                      tempo={exerciseData.tempo}
                      tip={exerciseData.tip}
                      onRepsChange={(value) => handleRepsChange(slide.exerciseIndex, slide.setIndex, value)}
                      onWeightChange={(value) => handleWeightChange(slide.exerciseIndex, slide.setIndex, value)}
                      onDurationChange={(value) => handleDurationChange(slide.exerciseIndex, slide.setIndex, value)}
                      isCompleted={setData.completed}
                      validationError={showError}
                      onStartEditing={() => handleStartEditing(slide.exerciseIndex, slide.setIndex)}
                    />
                  </CarouselItem>
                );
              }

              // Rest timer slide
              return (
                <CarouselItem key={`rest-${slide.exerciseIndex}-${slide.setIndex}`} className="h-full">
                  <RestTimerSlide
                    restTimeSeconds={setData.restTimeSeconds || 60}
                    nextSetInfo={getNextSetInfo(slide.exerciseIndex, slide.setIndex)}
                    isActive={currentSlideIndex === index}
                    onComplete={handleTimerComplete}
                    onSkip={handleSkip}
                  />
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Slide Indicators */}
      <div className="px-4 py-3 border-t bg-background/95 backdrop-blur">
        <div className="flex items-center justify-center gap-1 overflow-x-auto">
          {slides.map((slide, index) => {
            const exerciseData = exerciseSeries[slide.exerciseIndex];
            const setData = exerciseData?.sets[slide.setIndex];
            const isSetCompleted = slide.type === 'set-info' && setData?.completed;

            return (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlideIndex
                    ? 'bg-primary w-4'
                    : isSetCompleted
                    ? 'bg-green-500'
                    : slide.type === 'set-info'
                    ? 'bg-primary/30'
                    : 'bg-muted'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          {currentSlide?.type === 'set-info' ? 'Informacje o serii' : 'Przerwa'}
          {' • '}
          Slajd {currentSlideIndex + 1} z {slides.length}
        </p>
      </div>
    </div>
  );
}