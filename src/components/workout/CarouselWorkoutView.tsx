'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UseFormReturn, useFormContext } from 'react-hook-form';
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
import { type Exercise, SetType } from '@/lib/types';

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

  const exerciseSeries = form.watch('exerciseSeries');

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

  // Get completed sets count
  const completedSets = useMemo(() => {
    return exerciseSeries.reduce((acc, ex) => {
      return acc + ex.sets.filter(s => s.completed).length;
    }, 0);
  }, [exerciseSeries]);

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

  // Handle slide change
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      const newIndex = api.selectedScrollSnap();
      const previousIndex = currentSlideIndex;

      // Check if we're moving from a set-info slide to a rest-timer slide
      // This means the user is starting their rest, so mark the set as complete
      if (previousIndex < slides.length && newIndex < slides.length) {
        const previousSlide = slides[previousIndex];
        const newSlide = slides[newIndex];

        if (previousSlide?.type === 'set-info' && newSlide?.type === 'rest-timer') {
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
  }, [api, currentSlideIndex, slides, onSetComplete]);

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

  // Handle reps/weight change
  const handleRepsChange = useCallback((exerciseIndex: number, setIndex: number, value: number) => {
    form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.reps`, value);
  }, [form]);

  const handleWeightChange = useCallback((exerciseIndex: number, setIndex: number, value: number) => {
    form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.weight`, value);
  }, [form]);

  if (slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-muted-foreground">Brak ćwiczeń w treningu.</p>
        <p className="text-sm text-muted-foreground">Dodaj ćwiczenia, aby rozpocząć.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress Header */}
      <div className="px-4 py-3 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {currentSlide && (
              <Badge variant="outline" className="text-xs">
                {getCurrentExerciseDetails(currentSlide.exerciseIndex)?.name || 'Ćwiczenie'}
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            {completedSets} / {totalSets} serii
          </span>
        </div>
        <Progress value={(completedSets / totalSets) * 100} className="h-2" />
      </div>

      {/* Carousel */}
      <div className="flex-1 overflow-hidden">
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
                      actualReps={setData.reps}
                      actualWeight={setData.weight}
                      tempo={exerciseData.tempo}
                      tip={exerciseData.tip}
                      onRepsChange={(value) => handleRepsChange(slide.exerciseIndex, slide.setIndex, value)}
                      onWeightChange={(value) => handleWeightChange(slide.exerciseIndex, slide.setIndex, value)}
                      isCompleted={setData.completed}
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
          {slides.map((slide, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlideIndex
                  ? 'bg-primary w-4'
                  : slide.type === 'set-info'
                  ? 'bg-primary/30'
                  : 'bg-muted'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
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