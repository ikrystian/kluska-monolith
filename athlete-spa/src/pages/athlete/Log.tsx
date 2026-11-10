'use client';

import { apiFetch } from '@/lib/api-client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PlusCircle, Trash2, Save, Loader2, Dumbbell, ArrowLeft, ArrowRight, Play, Calendar, ChevronRight, ChevronDown, LayoutList, RotateCcw, Check, Timer, AlertCircle, Minus, Plus, X, Camera, Image as ImageIcon, Footprints, BookOpen, House } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  type TrainingPlan,
  type Workout,
  type Exercise,
  type WorkoutLog,
  type UserProfile,
  SetType,
  TrainingLevel,
  type ExerciseSeries,
  type WorkoutSet,
  type DayPlan,
  type RunningProgram
} from '@/lib/types';
import { StartRunDialog } from '@/components/running/StartRunDialog';
import { useCollection, useUser, useDoc } from '@/lib/db-hooks';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import { visibleExercisesScope } from '@/hooks/useExerciseLibrary';
import { useRestTimer } from '@/hooks/useRestTimer';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useWorkoutGym } from '@/hooks/useWorkoutGym';
import { DetectedGym } from '@/components/workout/DetectedGym';
import { useLiveWidget } from '@/hooks/useLiveWidget';
import { useWidgetCommands } from '@/hooks/useWidgetCommands';
import {
  WIDGET_COMMAND_COMPLETE_SET,
  WIDGET_COMMAND_EXTEND_REST,
  WIDGET_COMMAND_SKIP_REST,
  WIDGET_REST_EXTENSION_SECONDS,
} from '@/lib/live-widget';
import { haptic } from '@/lib/haptics';
import { isSpotifyWidgetEnabled } from '@/lib/app-permissions';
import { PlateCalculator } from '@/components/workout/PlateCalculator';
import { RpeSelector } from '@/components/workout/RpeSelector';
import { ExerciseHistoryBadge } from '@/components/workout/ExerciseProgressIndicator';
import { SpotifyWidget } from '@/components/workout/SpotifyWidget';
import { AddExerciseSheet } from '@/components/workout/AddExerciseSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/section';
import { MuscleRecovery } from '@/components/workout/MuscleRecovery';
import { exercisesLabel, plural, setsLabel } from '@/lib/plural';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CarouselWorkoutView } from '@/components/workout/CarouselWorkoutView';
import { SetTypeModal } from '@/components/workout/SetTypeModal';
import { getSetTypeConfig, type ExerciseType } from '@/lib/set-type-config';
import { AnimatePresence, motion, listItemMotion } from '@/components/motion';
import { cn } from '@/lib/utils';
import { useSWRConfig } from 'swr';
import { purgePersistedEntries } from '@/lib/swr-cache';
import { Skeleton } from '@/components/ui/skeleton';
import { FeaturedTemplate, NewTemplateTile, TemplateTile, WorkoutExercisesPreview } from '@/components/workout/TemplateCards';
import { FOCUS_META, FOCUS_ORDER, lastSessionOf, recommendTemplate, templateFocus, type TemplateFocus } from '@/components/workout/template-meta';
import gymPhoto from '@/assets/auth-gym.jpg';
import runCover from '@/assets/workout-covers/run.svg';

/**
 * Every locally-held `workoutLogs` list read (the active-workout lookup, the
 * history list). The `/api/db/workoutLogs/:id` detail read is deliberately not
 * matched — the history screen we navigate to right after saving needs it.
 */
const isWorkoutLogsListKey = (key: unknown): key is string =>
  typeof key === 'string' && key.includes('/api/db/workoutLogs?');

/**
 * Wipes those reads from local storage — both the in-memory SWR entry and the
 * localStorage snapshot it gets serialised into — so an app that is killed
 * before it next backgrounds can't restore a saved/discarded session as a
 * phantom "in-progress" workout. Pass SWR's scoped `mutate` (from
 * `useSWRConfig`); the module-level `mutate` import is bound to a different
 * cache than the app's provider and would be a no-op here.
 */
const clearWorkoutLogsCache = (mutate: ReturnType<typeof useSWRConfig>['mutate']) => {
  purgePersistedEntries(isWorkoutLogsListKey);
  void mutate(isWorkoutLogsListKey, undefined, { revalidate: true });
};

/**
 * What a set needs before it can be checked off, by exercise type. Shared by
 * the set rows and the home-screen widget's "✓ Seria" button, so the widget
 * can't complete a set the screen itself would refuse.
 */
const validateSetValues = (
  exerciseType: ExerciseType,
  { reps, weight, duration }: { reps?: number | null; weight?: number | string | null; duration?: number | null }
): { valid: boolean; error?: string } => {
  if (exerciseType === 'weight') {
    // Weight exercises need both reps and weight
    if (!reps || reps <= 0) {
      return { valid: false, error: 'Uzupełnij liczbę powtórzeń' };
    }
    if (weight === undefined || weight === null || weight === '') {
      return { valid: false, error: 'Uzupełnij ciężar' };
    }
  } else if (exerciseType === 'reps') {
    // Reps-only exercises just need reps
    if (!reps || reps <= 0) {
      return { valid: false, error: 'Uzupełnij liczbę powtórzeń' };
    }
  } else if (exerciseType === 'duration') {
    // Duration exercises need duration
    if (!duration || duration <= 0) {
      return { valid: false, error: 'Uzupełnij czas trwania' };
    }
  }

  return { valid: true };
};


// --- HELPER FUNCTIONS ---
/**
 * Extracts exercise ID from various possible locations in an exercise object.
 * Handles cases where ID might be in 'id', '_id', or as an ObjectId.
 */
const getExerciseId = (exercise: any): string => {
  // Try multiple possible ID locations
  const id = exercise?.id || exercise?._id || exercise?.exerciseId;

  if (id) {
    // Handle ObjectId objects
    return typeof id === 'object' && id.toString ? id.toString() : String(id);
  }

  return '';
};

/**
 * Selects the whole input content on focus so typing immediately replaces
 * the existing value. select() is deferred via rAF because on touch devices
 * the tap's default caret placement lands after focus and would collapse
 * an immediate selection.
 */
const selectAllOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  const input = e.currentTarget;
  requestAnimationFrame(() => input.select());
};

const formatSeconds = (total: number) => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/** "Seria 2/4 · 80 kg × 8" — the set the home-screen widget's "Seria ✓" would check off. */
const describeSetForWidget = (
  exerciseType: Exercise['type'],
  set: Pick<WorkoutSet, 'reps' | 'weight' | 'duration'>,
  setNumber: number,
  setCount: number
) => {
  const parts = [`Seria ${setNumber}/${setCount}`];
  const reps = Number(set.reps) || 0;
  const weight = Number(set.weight) || 0;
  const duration = Number(set.duration) || 0;
  if (exerciseType === 'duration') {
    if (duration > 0) parts.push(formatSeconds(duration));
  } else if (exerciseType === 'weight' && weight > 0) {
    parts.push(`${weight} kg × ${reps}`);
  } else if (reps > 0) {
    parts.push(`${reps} powt.`);
  }
  return parts.join(' · ');
};

/**
 * Session clock that keeps ticking on its own. Isolated in a tiny component so
 * the once-a-second interval re-renders just the clock, not the form.
 */
function ElapsedClock({ startTime }: { startTime: Date }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.round((Date.now() - startTime.getTime()) / 1000));
  return <span className="font-display text-[1.875rem] font-bold leading-none tabular-nums">{formatSeconds(seconds)}</span>;
}

// --- SCHEMA DEFINITIONS ---
const setSchema = z.object({
  number: z.number().optional(),
  type: z.nativeEnum(SetType).default(SetType.WorkingSet),
  reps: z.coerce.number().min(0, 'Powtórzenia muszą być dodatnie.').optional(),
  weight: z.coerce.number().min(0, 'Ciężar musi być dodatni.').optional(),
  restTimeSeconds: z.coerce.number().min(0).default(60),
  duration: z.coerce.number().min(0, 'Czas musi być dodatni.').optional(),
  rpe: z.coerce.number().min(1).max(10).optional(),
  completed: z.boolean().optional(),
});

const exerciseSeriesSchema = z.object({
  exerciseId: z.string().min(1, 'Proszę wybrać ćwiczenie.'),
  sets: z.array(setSchema).default([]),
  tempo: z.string().default("2-0-2-0"),
  tip: z.string().optional(),
});

const logSchema = z.object({
  workoutName: z.string().min(1, 'Nazwa treningu jest wymagana.'),
  exerciseSeries: z.array(exerciseSeriesSchema),
  level: z.nativeEnum(TrainingLevel).default(TrainingLevel.Beginner),
  durationMinutes: z.number().optional(),
  startTime: z.any().optional(), // Allow passing start time for resume
});

type LogFormValues = z.infer<typeof logSchema>;


// --- WORKOUT BUILDER VIEW ---
// Allows the user to prepare the workout before starting the timer
function WorkoutBuilderView({ initialData, onStart, onCancel, allExercises, isLoadingExercises }: { initialData: LogFormValues; onStart: (data: LogFormValues) => void; onCancel: () => void; allExercises: Exercise[] | null; isLoadingExercises: boolean }) {
  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: initialData,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exerciseSeries",
  });

  const handleAddExercise = (exerciseId: string) => {
    const exerciseDef = allExercises?.find(e => e.id === exerciseId);
    // Add default sets based on exercise type
    let defaultSets: WorkoutSet[] = [];
    // Default to 3 working sets
    defaultSets = [
      { number: 1, type: SetType.WorkingSet, reps: 0, weight: 0, restTimeSeconds: 60, completed: false },
      { number: 2, type: SetType.WorkingSet, reps: 0, weight: 0, restTimeSeconds: 60, completed: false },
      { number: 3, type: SetType.WorkingSet, reps: 0, weight: 0, restTimeSeconds: 60, completed: false }
    ];

    append({ exerciseId, sets: defaultSets, tempo: "2-0-2-0" });
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onStart)} className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Wróć"
            className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full active:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <FormField
            control={form.control}
            name="workoutName"
            render={({ field }) => (
              <FormItem className="min-w-0 flex-1 space-y-0">
                <FormControl>
                  <Input
                    {...field}
                    aria-label="Nazwa treningu"
                    placeholder="Nazwa treningu"
                    className="h-11 rounded-none bg-transparent px-0 font-display text-[1.875rem] font-bold uppercase leading-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <p className="eyebrow mb-2 mt-1 shrink-0 px-1">{exercisesLabel(fields.length)}</p>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          {fields.length === 0 ? (
            <EmptyState icon={Dumbbell} title="Brak ćwiczeń" description="Dodaj pierwsze ćwiczenie i ruszaj." />
          ) : (
            <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
              <AnimatePresence initial={false}>
                {fields.map((field, index) => {
                  const exerciseDetails = allExercises?.find(ex => ex.id === field.exerciseId);
                  return (
                    <motion.div key={field.id} {...listItemMotion}>
                      <div className="flex items-center gap-3 py-2.5 pl-3.5 pr-1.5">
                        <span className="w-5 shrink-0 text-center font-display text-xl font-bold tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[15px] font-semibold leading-tight">{exerciseDetails?.name || (isLoadingExercises ? 'Ładowanie...' : 'Nieznane ćwiczenie')}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {exerciseDetails?.mainMuscleGroups?.map(mg => mg.name).join(', ') || 'Ogólnorozwojowe'}
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground" aria-label="Usuń ćwiczenie" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-3">
          <AddExerciseSheet onAddExercise={handleAddExercise} />
          <Button type="submit" className="flex-1">
            <Play className="fill-current" /> Rozpocznij trening
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}


// --- EXERCISE RAIL ---
// Horizontal strip of chips: one per exercise. Gives orientation (where am I,
// what's done, what's left) and jump navigation without listing everything.
function ExerciseRail({ statuses, activeIndex, onSelect }: {
  statuses: { name: string; isComplete: boolean }[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    chipRefs.current[activeIndex]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeIndex]);

  if (statuses.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-4 mb-2 flex shrink-0 gap-1.5 overflow-x-auto px-4">
      {statuses.map((status, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={i}
            ref={el => { chipRefs.current[i] = el; }}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Ćwiczenie ${i + 1}: ${status.name}`}
            aria-current={isActive}
            className={cn(
              'flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full font-display text-lg font-bold tabular-nums transition-colors active:scale-95',
              isActive
                ? 'bg-foreground px-3.5 text-background'
                : status.isComplete
                  ? 'w-9 bg-volt/15 text-volt'
                  : 'w-9 bg-card text-muted-foreground'
            )}
          >
            {isActive ? (
              <>
                {i + 1}
                <span className="max-w-[9rem] truncate font-body text-[13px] font-semibold">
                  {status.name}
                </span>
              </>
            ) : status.isComplete ? (
              <Check className="h-4 w-4" />
            ) : (
              i + 1
            )}
          </button>
        );
      })}
    </div>
  );
}

// --- ACTIVE WORKOUT VIEW ---
type ViewMode = 'list' | 'carousel';

function ActiveWorkoutView({ initialWorkout, allExercises, onFinishWorkout, isLoadingExercises, initialLogId, sourceWorkoutId, pendingExerciseId }: { initialWorkout: LogFormValues; allExercises: Exercise[] | null; onFinishWorkout: () => void; isLoadingExercises: boolean; initialLogId?: string | null; sourceWorkoutId?: string | null; pendingExerciseId?: string | null }) {
  const [startTime] = useState(initialWorkout.startTime ? new Date(initialWorkout.startTime) : new Date());
  const [workoutLogId, setWorkoutLogId] = useState<string | null>(initialLogId || null);
  const isCreatingWorkoutRef = useRef(false);
  const [isFinished, setIsFinished] = useState(false);
  // Once the finish screen opens, work out which gym this was (on-device; nothing is sent).
  const workoutGym = useWorkoutGym(isFinished);
  const [isSaving, setIsSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const { refetch: refetchActiveWorkout } = useActiveWorkout();
  const { mutate: swrMutate } = useSWRConfig();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [newExerciseId, setNewExerciseId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    localStorage.getItem('athlete-log-view-mode') === 'carousel' ? 'carousel' : 'list'
  );
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

  const [spotifyWidgetVisible, setSpotifyWidgetVisible] = useState(false);
  useEffect(() => {
    if (!isSpotifyWidgetEnabled()) return;
    let cancelled = false;
    apiFetch('/api/spotify/status')
      .then(async (response) => {
        if (cancelled || !response.ok) return;
        const data = await response.json();
        setSpotifyWidgetVisible(!!data.connected);
      })
      .catch(() => {
        // Stay hidden — the athlete can still control music from their phone directly.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Transient rest countdown shown after checking off a set in list mode
  const [isResting, setIsResting] = useState(false);
  const restTimer = useRestTimer(() => setIsResting(false));

  // A set takes minutes of not touching the phone — keep the screen on until
  // the athlete reaches the summary screen.
  useWakeLock(!isFinished);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('athlete-log-view-mode', mode);
    if (mode === 'carousel') {
      // Carousel has its own rest slides — drop the inline countdown
      restTimer.reset();
      setIsResting(false);
    }
  };

  const handleSetCompleted = useCallback((restSeconds: number) => {
    if (restSeconds > 0) {
      restTimer.start(restSeconds);
      setIsResting(true);
    }
  }, [restTimer.start]);

  const dismissRest = () => {
    restTimer.reset();
    setIsResting(false);
  };

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: initialWorkout,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exerciseSeries",
  });

  useEffect(() => {
    if (fields.length > 0 && activeExerciseIndex >= fields.length) {
      setActiveExerciseIndex(fields.length - 1);
    }
  }, [fields.length, activeExerciseIndex]);

  // Mirror the in-progress workout on the Android home-screen widget until
  // the athlete reaches the summary screen. Leaving this screen mid-workout
  // keeps it there (without the set button — nothing is left to act on it).
  const liveSeries = form.watch('exerciseSeries');
  const liveTotalSets = liveSeries.reduce((acc, s) => acc + (s.sets?.length ?? 0), 0);
  const liveCompletedSets = liveSeries.reduce((acc, s) => acc + (s.sets?.filter(set => set.completed).length ?? 0), 0);
  const liveCurrentSeries =
    liveSeries.find(s => (s.sets?.length ?? 0) > 0 && s.sets.some(set => !set.completed)) ?? liveSeries[activeExerciseIndex];
  const liveCurrentExerciseDef = allExercises?.find(ex => ex.id === liveCurrentSeries?.exerciseId);
  const liveCurrentExercise = liveCurrentExerciseDef?.name ?? '';
  const liveNextSetIndex = liveCurrentSeries?.sets?.findIndex(set => !set.completed) ?? -1;
  const liveNextSet =
    liveNextSetIndex >= 0
      ? describeSetForWidget(
        liveCurrentExerciseDef?.type ?? 'weight',
        liveCurrentSeries.sets[liveNextSetIndex],
        liveNextSetIndex + 1,
        liveCurrentSeries.sets.length
      )
      : 'Wszystkie serie zrobione';
  const liveWorkoutName = form.watch('workoutName');

  // Why the widget's last "✓ Seria" did nothing, shown in place of the exercise name for a few seconds.
  const [widgetNotice, setWidgetNotice] = useState<string | null>(null);
  const widgetNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(widgetNoticeTimeoutRef.current), []);
  const showWidgetNotice = (text: string) => {
    setWidgetNotice(text);
    clearTimeout(widgetNoticeTimeoutRef.current);
    widgetNoticeTimeoutRef.current = setTimeout(() => setWidgetNotice(null), 6000);
  };

  const liveWorkoutPath = workoutLogId ? `/athlete/log?logId=${workoutLogId}` : '/athlete';
  useLiveWidget(
    isFinished
      ? null
      : {
        activity: 'workout',
        title: liveWorkoutName || 'Trening',
        line1: liveCurrentExercise || `${liveCompletedSets}/${liveTotalSets} serii`,
        line2: widgetNotice ?? liveNextSet,
        setsDone: liveCompletedSets,
        setsTotal: liveTotalSets,
        // Only the list view's countdown lives here; the carousel's rest slides keep their own.
        restEndsAt: viewMode === 'list' && isResting ? restTimer.deadline : null,
        running: true,
        openPath: liveWorkoutPath,
        finishPath: workoutLogId ? `${liveWorkoutPath}&finish=true` : liveWorkoutPath,
        interactive: true,
      },
    () => Date.now() - startTime.getTime(),
    { keepOnUnmount: true }
  );

  // The widget's "✓ Seria": check off the set the widget is showing, under the
  // same rules as tapping it here — an incomplete set is reported, not forced.
  const completeNextSetFromWidget = () => {
    const series = form.getValues('exerciseSeries');
    for (let i = 0; i < series.length; i++) {
      const setIndex = series[i].sets?.findIndex(set => !set.completed) ?? -1;
      if (setIndex < 0) continue;

      const set = series[i].sets[setIndex];
      const exerciseType = allExercises?.find(ex => ex.id === series[i].exerciseId)?.type ?? 'weight';
      const check = validateSetValues(exerciseType, set);
      if (!check.valid) {
        haptic('warning');
        showWidgetNotice(`${check.error ?? 'Uzupełnij dane serii'} w aplikacji`);
        return;
      }

      form.setValue(`exerciseSeries.${i}.sets.${setIndex}.completed`, true);
      setActiveExerciseIndex(i);
      haptic('tap');
      // The carousel runs its own rest slides; the inline countdown is the list view's.
      if (viewMode === 'list') handleSetCompleted(Number(set.restTimeSeconds) || 0);
      return;
    }
  };
  useWidgetCommands(
    {
      [WIDGET_COMMAND_COMPLETE_SET]: completeNextSetFromWidget,
      [WIDGET_COMMAND_SKIP_REST]: dismissRest,
      [WIDGET_COMMAND_EXTEND_REST]: () => {
        if (restTimer.isRunning) restTimer.addTime(WIDGET_REST_EXTENSION_SECONDS);
      },
    },
    !isFinished
  );

  // Check for finish param
  useEffect(() => {
    if (searchParams.get('finish') === 'true') {
      setIsFinished(true);
    }
  }, [searchParams]);

  // Effect to create the workout document on start (only if not resuming)
  useEffect(() => {
    if (!user || workoutLogId || isCreatingWorkoutRef.current) return;

    const createInitialWorkoutLog = async () => {
      isCreatingWorkoutRef.current = true;

      // Validate that all exercises have valid IDs before creating the log
      const invalidExercises = initialWorkout.exerciseSeries.filter(
        series => !series.exerciseId || series.exerciseId === '' || series.exerciseId.startsWith('temp-')
      );

      if (invalidExercises.length > 0) {
        console.error('Invalid exercises found (missing exerciseId):', invalidExercises);
        toast({
          title: 'Błąd',
          description: 'Niektóre ćwiczenia nie mają prawidłowych identyfikatorów. Spróbuj dodać je ponownie.',
          variant: 'destructive',
        });
        isCreatingWorkoutRef.current = false;
        onFinishWorkout();
        return;
      }

      // Map form data to WorkoutLog structure
      const exercisesWithNames = initialWorkout.exerciseSeries.map(series => {
        const exerciseDetails = allExercises?.find(ex => ex.id === series.exerciseId);

        const exerciseSnapshot: Exercise = exerciseDetails || {
          id: series.exerciseId,
          name: 'Unknown Exercise',
          mainMuscleGroups: [],
          secondaryMuscleGroups: [],
          type: 'weight' // Default
        };

        return {
          exerciseId: series.exerciseId,
          exercise: exerciseSnapshot,
          sets: series.sets || [],
          tempo: series.tempo,
          tip: series.tip
        };
      });

      const initialLogData = {
        workoutName: initialWorkout.workoutName,
        exercises: exercisesWithNames,
        status: 'in-progress',
        startTime: startTime,
        athleteId: user.uid,
        ...(sourceWorkoutId && { sourceWorkoutId }), // Track the original workout template
      };

      try {
        const response = await apiFetch('/api/db/workoutLogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initialLogData),
        });

        if (!response.ok) {
          throw new Error('Failed to create workout log');
        }

        const result = await response.json();
        setWorkoutLogId(result.data.id);

        // Notify the ActiveWorkoutContext that a workout has started
        refetchActiveWorkout();
      } catch (error) {
        isCreatingWorkoutRef.current = false;
        console.error('Error creating workout log:', error);
        toast({ title: 'Błąd', description: 'Nie udało się rozpocząć sesji treningowej.', variant: 'destructive' });
        onFinishWorkout();
      }
    };

    createInitialWorkoutLog();
  }, [user, initialWorkout, onFinishWorkout, workoutLogId, startTime, toast, allExercises]);

  // Effect to update URL with logId
  useEffect(() => {
    if (workoutLogId) {
      const currentLogId = searchParams.get('logId');
      if (currentLogId !== workoutLogId) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('logId', workoutLogId);
          // Clean up workoutId if present as we are now in a specific log
          next.delete('workoutId');
          return next;
        }, { replace: true });
      }
    }
  }, [workoutLogId, searchParams, setSearchParams]);

  // Ćwiczenie z kodu QR, gdy trening już trwa: dodaj je raz i zdejmij parametr z adresu.
  const pendingExerciseHandledRef = useRef(false);
  useEffect(() => {
    if (!pendingExerciseId || pendingExerciseHandledRef.current) return;
    pendingExerciseHandledRef.current = true;
    handleAddExercise(pendingExerciseId);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('addExercise');
      return next;
    }, { replace: true });
  }, [pendingExerciseId, setSearchParams]);

  // Auto-save effect
  useEffect(() => {
    if (!workoutLogId || !user || isFinished) return;

    const saveTimeout = setTimeout(async () => {
      const currentData = form.getValues();
      const exercisesWithNames = currentData.exerciseSeries.map(series => {
        const exerciseDetails = allExercises?.find(ex => ex.id === series.exerciseId);
        const exerciseSnapshot: Exercise = exerciseDetails || {
          id: series.exerciseId,
          name: 'Unknown Exercise',
          mainMuscleGroups: [],
          secondaryMuscleGroups: [],
          type: 'weight'
        };
        return {
          exerciseId: series.exerciseId,
          exercise: exerciseSnapshot,
          sets: series.sets || [],
          tempo: series.tempo,
          tip: series.tip
        };
      });

      const updateData = {
        exercises: exercisesWithNames,
        // Don't update status or endTime here
      };

      try {
        await apiFetch(`/api/db/workoutLogs/${workoutLogId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        console.log('Auto-saved workout progress');
      } catch (error) {
        console.error('Error auto-saving workout:', error);
      }
    }, 2000); // Debounce for 2 seconds

    return () => clearTimeout(saveTimeout);
  }, [form.watch(), workoutLogId, user, allExercises, isFinished]);


  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    }
    // Reset so picking / shooting the same file again still fires onChange.
    e.target.value = '';
  };

  const handleAddExercise = (exerciseId: string) => {
    const defaultSets: WorkoutSet[] = [
      { number: 1, type: SetType.WorkingSet, reps: 0, weight: 0, restTimeSeconds: 60, completed: false },
      { number: 2, type: SetType.WorkingSet, reps: 0, weight: 0, restTimeSeconds: 60, completed: false },
      { number: 3, type: SetType.WorkingSet, reps: 0, weight: 0, restTimeSeconds: 60, completed: false }
    ];
    const newExercise = { exerciseId, sets: defaultSets, tempo: "2-0-2-0" };
    append(newExercise);
    setActiveExerciseIndex(fields.length); // Switch to the newly added exercise

    setNewExerciseId(exerciseId);
    setTimeout(() => setNewExerciseId(null), 300);
  };

  const handleRemoveExercise = (index: number) => {
    remove(index);
    if (index === activeExerciseIndex) {
      if (index > 0) {
        setActiveExerciseIndex(index - 1);
      } else {
        setActiveExerciseIndex(0);
      }
    } else if (index < activeExerciseIndex) {
      setActiveExerciseIndex(activeExerciseIndex - 1);
    }
  }

  // Handle set completion from carousel view
  const handleSetComplete = useCallback((exerciseIndex: number, setIndex: number) => {
    form.setValue(`exerciseSeries.${exerciseIndex}.sets.${setIndex}.completed`, true);
    haptic('tap');
  }, [form]);


  const handleSaveWorkout = async (data: LogFormValues) => {
    if (!user || !workoutLogId) return;

    setIsSaving(true);

    let photoURL: string | undefined = undefined;
    if (photoFile) {
      try {
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('userId', user.uid);

        const uploadResponse = await apiFetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          photoURL = uploadResult.url;
        }
      } catch (error) {
        console.error("Error uploading photo: ", error);
        toast({
          title: 'Błąd przesyłania zdjęcia',
          description: 'Nie udało się przesłać zdjęcia. Trening zostanie zapisany bez niego.',
          variant: 'destructive',
        });
      }
    }

    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // Never blocks saving: resolves to null when there's no fix or no gym nearby.
    const gymMatch = await workoutGym.resolve();

    const exercisesWithNames = data.exerciseSeries.map(series => {
      const exerciseDetails = allExercises?.find(ex => ex.id === series.exerciseId);
      const exerciseSnapshot: Exercise = exerciseDetails || {
        id: series.exerciseId,
        name: 'Unknown Exercise',
        mainMuscleGroups: [],
        secondaryMuscleGroups: [],
        type: 'weight'
      };
      return {
        exerciseId: series.exerciseId,
        exercise: exerciseSnapshot,
        sets: series.sets || [],
        tempo: series.tempo,
        tip: series.tip
      };
    });

    const finalLogData = {
      workoutName: data.workoutName,
      exercises: exercisesWithNames,
      duration: duration,
      endTime: endTime,
      status: 'completed',
      ...(photoURL && { photoURL }),
      ...(gymMatch && { gymId: gymMatch.gym.id ?? (gymMatch.gym as { _id?: string })._id, gymName: gymMatch.gym.name }),
    };

    try {
      const response = await apiFetch(`/api/db/workoutLogs/${workoutLogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalLogData),
      });

      if (!response.ok) {
        throw new Error('Failed to save workout');
      }

      toast({
        title: 'Trening Zapisany!',
        description: `${data.workoutName} został zapisany w Twojej historii.`,
      });

      // Notify the ActiveWorkoutContext that the workout has been completed
      // and drop the now-finished session from local storage right away.
      clearWorkoutLogsCache(swrMutate);
      refetchActiveWorkout();

      navigate(`/athlete/history/${workoutLogId}?summary=1`);
    } catch (error) {
      console.error('Error saving workout:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać treningu.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardWorkout = async () => {
    if (!workoutLogId) return;

    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/db/workoutLogs/${workoutLogId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete workout');
      }

      toast({
        title: 'Trening odrzucony',
        description: 'Twój trening został usunięty.',
      });

      // Wipe the discarded session from local storage before leaving the page.
      clearWorkoutLogsCache(swrMutate);
      refetchActiveWorkout();
      navigate('/athlete/dashboard');
    } catch (error) {
      console.error('Error discarding workout:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się odrzucić treningu.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isFinished) {
    const finishedSeries = form.getValues('exerciseSeries');
    const loggedSetsCount = finishedSeries.reduce(
      (acc, series) => acc + (series.sets?.filter((set) => set.completed).length ?? 0),
      0
    );
    const elapsedMinutes = Math.round((new Date().getTime() - startTime.getTime()) / (1000 * 60));

    const finishedVolume = finishedSeries.reduce(
      (acc, series) =>
        acc + (series.sets ?? []).filter(set => set.completed).reduce((sum, set) => sum + (Number(set.reps) || 0) * (Number(set.weight) || 0), 0),
      0
    );

    return (
      <div className="no-scrollbar flex h-full flex-col overflow-y-auto">
        <div className="flex-1 space-y-3 pt-2">
          <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
            <p className="text-[13px] font-semibold opacity-80">Dobra robota!</p>
            <h2 className="mt-1 line-clamp-2 font-display text-[3rem] font-bold uppercase leading-[0.95]">{form.getValues('workoutName')}</h2>
          </div>

          <div className="grid grid-cols-3 divide-x divide-border/50 rounded-2xl bg-card py-3.5 text-center">
            <div>
              <p className="font-display text-[1.875rem] font-bold leading-none tabular-nums">{elapsedMinutes}</p>
              <p className="mt-1 text-xs text-muted-foreground">minut</p>
            </div>
            <div>
              <p className="font-display text-[1.875rem] font-bold leading-none tabular-nums">{loggedSetsCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">serii</p>
            </div>
            <div>
              <p className="font-display text-[1.875rem] font-bold leading-none tabular-nums">{Math.round(finishedVolume).toLocaleString('pl-PL')}</p>
              <p className="mt-1 text-xs text-muted-foreground">kg objętości</p>
            </div>
          </div>

          <DetectedGym status={workoutGym.status} match={workoutGym.match} onDismiss={workoutGym.dismiss} />

          {photoPreview && (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
              <img src={photoPreview} alt="Podgląd zdjęcia" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="w-full" onClick={() => cameraInputRef.current?.click()}>
              <Camera /> {photoFile ? 'Zrób nowe' : 'Zrób zdjęcie'}
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => photoInputRef.current?.click()}>
              <ImageIcon /> {photoFile ? 'Wybierz inne' : 'Z galerii'}
            </Button>
          </div>
          {/* `capture` opens the phone camera straight away; the plain input lets
              the athlete pick an existing shot from the gallery. */}
          <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
          <input type="file" ref={photoInputRef} accept="image/*" onChange={handlePhotoChange} className="hidden" />
        </div>

        <div className="space-y-1 pb-2 pt-4">
          <Button onClick={form.handleSubmit(handleSaveWorkout)} className="w-full" size="lg" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            Zapisz trening
          </Button>
          <Button onClick={() => setIsFinished(false)} variant="ghost" className="w-full">Wróć do treningu</Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-destructive active:text-destructive">Odrzuć bez zapisywania</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Odrzucić trening?</AlertDialogTitle>
                <AlertDialogDescription>
                  {loggedSetsCount > 0
                    ? `Stracisz bezpowrotnie ${setsLabel(loggedSetsCount)} i ${elapsedMinutes} minut pracy. Tego nie da się cofnąć.`
                    : 'Sesja zostanie usunięta bez zapisu. Tego nie da się cofnąć.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Wróć do treningu</AlertDialogCancel>
                <AlertDialogAction onClick={handleDiscardWorkout} className="bg-destructive text-destructive-foreground">
                  {loggedSetsCount > 0 ? 'Zaryzykuję, odrzuć' : 'Odrzuć'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    )
  }

  const currentExercise = fields[activeExerciseIndex];
  const selectedExerciseId = form.watch(`exerciseSeries.${activeExerciseIndex}.exerciseId`);
  const exerciseDetails = allExercises?.find(ex => ex.id === selectedExerciseId);

  // Live overview data for the header bar and the exercise rail
  const watchedWorkoutName = form.watch('workoutName');
  const watchedSeries = form.watch('exerciseSeries');
  const totalSets = watchedSeries.reduce((acc, s) => acc + (s.sets?.length ?? 0), 0);
  const completedSets = watchedSeries.reduce(
    (acc, s) => acc + (s.sets?.filter(set => set.completed).length ?? 0),
    0
  );
  const exerciseStatuses = watchedSeries.map(s => {
    const total = s.sets?.length ?? 0;
    const done = s.sets?.filter(set => set.completed).length ?? 0;
    return {
      name: allExercises?.find(ex => ex.id === s.exerciseId)?.name ?? 'Ćwiczenie',
      isComplete: total > 0 && done === total,
    };
  });

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(() => setIsFinished(true), (errors) => {
          console.error("Validation errors:", errors);
          toast({
            title: "Błąd walidacji",
            description: "Sprawdź czy wszystkie wymagane pola są wypełnione poprawnie.",
            variant: "destructive",
          });
        })} className="flex flex-col h-full">

          {/* Session bar: what, how far, how long, and the way out */}
          <div className="mb-2 shrink-0 pt-2">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  haptic('tap');
                  setIsHeaderExpanded(expanded => !expanded);
                }}
                className="min-w-0 flex-1 text-left active:opacity-70"
                aria-expanded={isHeaderExpanded}
                aria-label="Ustawienia treningu"
              >
                <span className="flex items-center gap-1">
                  <span className="truncate text-[15px] font-semibold leading-tight">{watchedWorkoutName || 'Trening'}</span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isHeaderExpanded && 'rotate-180')} />
                </span>
                <span className="block text-xs tabular-nums text-muted-foreground">
                  {completedSets}/{totalSets} serii · {fields.length} ćw.
                </span>
              </button>
              <ElapsedClock startTime={startTime} />
              <Button type="submit" size="sm" disabled={fields.length === 0}>
                Zakończ
              </Button>
            </div>

            {/* One segment per exercise, so the whole session's shape is visible at a glance. */}
            <div className="mt-2 flex gap-1" aria-hidden>
              {watchedSeries.map((series, i) => {
                const total = series.sets?.length ?? 0;
                const done = series.sets?.filter(set => set.completed).length ?? 0;
                return (
                  <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                    <span
                      className={cn('block h-full rounded-full transition-[width] duration-300', total > 0 && done === total ? 'bg-volt' : 'bg-primary')}
                      style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                    />
                  </span>
                );
              })}
            </div>

            {isHeaderExpanded && (
              <div className="mt-2.5 flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="workoutName"
                  render={({ field }) => (
                    <FormItem className="min-w-0 flex-1 space-y-0">
                      <FormControl>
                        <Input {...field} aria-label="Nazwa treningu" className="h-10 text-[15px] font-semibold" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex h-10 shrink-0 items-center rounded-xl bg-secondary p-1">
                  <button
                    type="button"
                    aria-label="Widok listy"
                    aria-pressed={viewMode === 'list'}
                    onClick={() => handleViewModeChange('list')}
                    className={cn('grid h-8 w-9 place-items-center rounded-lg transition-colors', viewMode === 'list' ? 'bg-background text-foreground' : 'text-muted-foreground')}
                  >
                    <LayoutList className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Widok karuzeli"
                    aria-pressed={viewMode === 'carousel'}
                    onClick={() => handleViewModeChange('carousel')}
                    className={cn('grid h-8 w-9 place-items-center rounded-lg transition-colors', viewMode === 'carousel' ? 'bg-background text-foreground' : 'text-muted-foreground')}
                  >
                    <Timer className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {spotifyWidgetVisible && <SpotifyWidget className="mt-2.5" />}
          </div>

          {/* Main Content - Conditional based on view mode */}
          {viewMode === 'carousel' ? (
            <div className="flex-1 overflow-hidden pb-2">
              <CarouselWorkoutView
                allExercises={allExercises}
                isLoadingExercises={isLoadingExercises}
                onSetComplete={handleSetComplete}
              />
            </div>
          ) : (
            <>
              {/* Exercise Rail - orientation + jump navigation */}
              <ExerciseRail
                statuses={exerciseStatuses}
                activeIndex={activeExerciseIndex}
                onSelect={setActiveExerciseIndex}
              />

              {/* List View - Scrollable */}
              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pb-24">
                {currentExercise ? (
                  <div className={newExerciseId === currentExercise.exerciseId ? 'animate-slide-in-up' : ''}>
                    <ExerciseCard
                      key={currentExercise.id}
                      index={activeExerciseIndex}
                      exerciseDetails={exerciseDetails}
                      onRemoveExercise={() => handleRemoveExercise(activeExerciseIndex)}
                      isLoadingExercises={isLoadingExercises}
                      userId={user?.uid || null}
                      onSetCompleted={handleSetCompleted}
                    />
                  </div>
                ) : (
                  <EmptyState icon={Dumbbell} title="Pusty trening" description="Dodaj pierwsze ćwiczenie, aby zacząć." className="mt-4" />
                )}
              </div>

              {/* Docked controls: thumb reach, always in the same place. */}
              <div id="docker-control" className="app-column fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Poprzednie ćwiczenie"
                    disabled={activeExerciseIndex === 0 || fields.length === 0}
                    onClick={() => setActiveExerciseIndex(prev => prev - 1)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  <AddExerciseSheet onAddExercise={handleAddExercise} />

                  <Button
                    type="button"
                    variant="secondary"
                    aria-label="Następne ćwiczenie"
                    disabled={activeExerciseIndex === fields.length - 1 || fields.length === 0}
                    onClick={() => setActiveExerciseIndex(prev => prev + 1)}
                    className="h-11 min-w-0 flex-1 justify-between gap-2 px-3 text-sm"
                  >
                    <span className="truncate">
                      {exerciseStatuses[activeExerciseIndex + 1]?.name ?? 'To ostatnie'}
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0" />
                  </Button>

                  {/* Leaves the view only — the workout stays active and can be resumed. */}
                  <Button asChild variant="secondary" size="icon" aria-label="Panel główny">
                    <Link to="/athlete/dashboard">
                      <House className="h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Rest countdown: big enough to read from the bench */}
              <AnimatePresence>
                {isResting && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    className="app-column fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-40 px-2 pb-1.5"
                  >
                    <div className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground">
                      <div className="absolute inset-y-0 left-0 bg-black/15 transition-[width] duration-1000 ease-linear" style={{ width: `${restTimer.progress * 100}%` }} />
                      <div className="relative flex items-center gap-2 py-2 pl-4 pr-2">
                        <span className="font-display text-[2.5rem] font-bold leading-none tabular-nums">
                          {formatSeconds(restTimer.timeRemaining)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold opacity-80">Przerwa</span>
                        <button
                          type="button"
                          onClick={() => restTimer.addTime(15)}
                          aria-label="Wydłuż przerwę o 15 sekund"
                          className="h-10 shrink-0 rounded-xl bg-black/15 px-3 text-sm font-semibold tabular-nums active:bg-black/25"
                        >
                          +15 s
                        </button>
                        <button
                          type="button"
                          onClick={dismissRest}
                          aria-label="Pomiń przerwę"
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/15 active:bg-black/25"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

        </form>
      </FormProvider>
    </div>
  )
}

function ExerciseCard({ index, exerciseDetails, onRemoveExercise, isLoadingExercises, userId, onSetCompleted }: { index: number, exerciseDetails: Exercise | undefined, onRemoveExercise: () => void, isLoadingExercises: boolean, userId: string | null, onSetCompleted?: (restSeconds: number) => void }) {
  const { control, watch, setValue } = useFormContext<LogFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `exerciseSeries.${index}.sets`
  });
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});
  const { toast } = useToast();

  // Get exercise type from exercise details
  const exerciseType: ExerciseType = exerciseDetails?.type || 'weight';

  // The plate calculator opens on the exercise's top set — the load people
  // actually need help building.
  const watchedSets = watch(`exerciseSeries.${index}.sets`);
  const heaviestPlannedWeight = useMemo(
    () => (watchedSets ?? []).reduce((max, set) => Math.max(max, Number(set?.weight) || 0), 0),
    [watchedSets]
  );

  // Fetch exercise history for progress comparison
  const exerciseId = watch(`exerciseSeries.${index}.exerciseId`);
  const { data: exerciseHistory, isLoading: isHistoryLoading } = useExerciseHistory(
    exerciseId || exerciseDetails?.id || null,
    userId
  );

  // Validation function for a set - depends on exercise type
  const validateSet = (setIndex: number): { valid: boolean; error?: string } =>
    validateSetValues(exerciseType, {
      reps: watch(`exerciseSeries.${index}.sets.${setIndex}.reps`),
      weight: watch(`exerciseSeries.${index}.sets.${setIndex}.weight`),
      duration: watch(`exerciseSeries.${index}.sets.${setIndex}.duration`),
    });

  // Handle set completion with validation
  const handleSetCompletion = (setIndex: number, currentValue: boolean) => {
    // If trying to mark as complete (not unchecking), validate first
    if (!currentValue) {
      const validation = validateSet(setIndex);
      if (!validation.valid) {
        haptic('warning');
        setValidationErrors(prev => ({ ...prev, [setIndex]: validation.error || 'Uzupełnij wymagane pola' }));
        toast({
          title: "Uzupełnij dane",
          description: validation.error || "Wprowadź wymagane dane przed zatwierdzeniem serii.",
          variant: "destructive",
        });
        return;
      }
    }

    // Clear validation error for this set
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[setIndex];
      return newErrors;
    });

    // Toggle the completion status
    setValue(`exerciseSeries.${index}.sets.${setIndex}.completed`, !currentValue);
    haptic('tap');

    // Kick off the rest countdown when a set gets checked off
    if (!currentValue) {
      const rest = Number(watch(`exerciseSeries.${index}.sets.${setIndex}.restTimeSeconds`)) || 0;
      onSetCompleted?.(rest);
    }
  };

  // Clear validation error when user changes input
  const clearValidationError = (setIndex: number) => {
    if (validationErrors[setIndex]) {
      const validation = validateSet(setIndex);
      if (validation.valid) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[setIndex];
          return newErrors;
        });
      }
    }
  };

  const handleAddSet = () => {
    if (fields.length > 0) {
      const lastSetIndex = fields.length - 1;
      const lastReps = watch(`exerciseSeries.${index}.sets.${lastSetIndex}.reps`);
      const lastWeight = watch(`exerciseSeries.${index}.sets.${lastSetIndex}.weight`);
      const lastType = watch(`exerciseSeries.${index}.sets.${lastSetIndex}.type`);
      const lastRest = watch(`exerciseSeries.${index}.sets.${lastSetIndex}.restTimeSeconds`);

      append({
        number: fields.length + 1,
        type: lastType || SetType.WorkingSet,
        reps: lastReps,
        weight: lastWeight,
        restTimeSeconds: Number(lastRest) || 60,
        completed: false
      });
    } else {
      append({
        number: 1,
        type: SetType.WorkingSet,
        reps: 0,
        weight: 0,
        restTimeSeconds: 60,
        completed: false
      });
    }
  };

  const tempo = watch(`exerciseSeries.${index}.tempo`);
  const tip = watch(`exerciseSeries.${index}.tip`);

  // One rest value per exercise (shown in the footer stepper); editing it
  // writes through to every set so the data model stays per-set.
  const restSeconds = Number(watch(`exerciseSeries.${index}.sets.0.restTimeSeconds`)) || 0;
  const handleRestChange = (delta: number) => {
    const next = Math.min(600, Math.max(0, restSeconds + delta));
    fields.forEach((_, i) => setValue(`exerciseSeries.${index}.sets.${i}.restTimeSeconds`, next));
  };

  // Label + input columns differ by exercise type; rows and their heading share one template.
  const gridColumns =
    exerciseType === 'weight'
      ? 'grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_2.75rem]'
      : 'grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1.6fr)_2.75rem]';

  const inputClass = (isActive: boolean, hasError: boolean, isCompleted: boolean) =>
    cn(
      'h-12 rounded-xl px-1 text-center font-display text-[1.625rem] font-bold tabular-nums',
      isCompleted && 'bg-transparent',
      isActive && 'bg-background ring-1 ring-primary/60',
      hasError && 'ring-1 ring-destructive'
    );

  /** Tap the last result to start from it; most sets repeat or nudge last time's numbers. */
  const applyPrevious = (setIndex: number) => {
    const previous = exerciseHistory?.sets[setIndex];
    if (!previous) return;
    haptic('tap');
    if (exerciseType === 'duration') {
      setValue(`exerciseSeries.${index}.sets.${setIndex}.duration`, previous.duration ?? 0);
    } else {
      setValue(`exerciseSeries.${index}.sets.${setIndex}.reps`, previous.reps);
      if (exerciseType === 'weight') setValue(`exerciseSeries.${index}.sets.${setIndex}.weight`, previous.weight);
    }
    clearValidationError(setIndex);
  };

  const previousLabel = (setIndex: number) => {
    const previous = exerciseHistory?.sets[setIndex];
    if (!previous) return '–';
    if (exerciseType === 'duration') return previous.duration ? `${previous.duration} s` : '–';
    if (exerciseType === 'reps') return `${previous.reps}×`;
    return `${previous.weight}×${previous.reps}`;
  };

  return (
    <div>
      <div className="flex items-start gap-1 pb-3 pt-1">
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 font-display text-[2rem] font-bold uppercase leading-[1]">
            {exerciseDetails?.name || (isLoadingExercises ? 'Ładowanie...' : 'Wybierz ćwiczenie')}
          </h2>
          {(tempo || exerciseHistory) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
              {tempo && <span>Tempo {tempo}</span>}
              {tempo && exerciseHistory && <span aria-hidden>·</span>}
              {exerciseHistory && (
                <ExerciseHistoryBadge lastWorkoutDate={exerciseHistory.lastWorkoutDate} lastWorkoutName={exerciseHistory.lastWorkoutName} />
              )}
            </div>
          )}
          {tip && <p className="mt-1 text-[13px] italic text-muted-foreground">Wskazówka: {tip}</p>}
        </div>
        {exerciseType === 'weight' && <PlateCalculator targetWeight={heaviestPlannedWeight} />}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" aria-label="Usuń ćwiczenie" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground active:bg-secondary">
              <Trash2 className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usunąć ćwiczenie?</AlertDialogTitle>
              <AlertDialogDescription>
                Wszystkie serie tego ćwiczenia zostaną utracone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={onRemoveExercise} className="bg-destructive text-destructive-foreground">
                Usuń
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Adding a set stays at the top, above the table: new sets appear
      right under it (newest first), so it never drifts out of reach. */}
      <div className="mb-2 flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" id="add-series-button" className="flex-1" onClick={handleAddSet}>
          <PlusCircle /> Dodaj serię
        </Button>
        {fields.length > 0 && (
          <div className="flex h-10 shrink-0 items-center gap-0.5 rounded-xl bg-secondary px-1" aria-label="Przerwa między seriami">
            <Timer className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="button"
              aria-label="Skróć przerwę o 15 sekund"
              onClick={() => handleRestChange(-15)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground active:bg-background"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[2.75rem] text-center text-[13px] font-semibold tabular-nums">{restSeconds} s</span>
            <button
              type="button"
              aria-label="Wydłuż przerwę o 15 sekund"
              onClick={() => handleRestChange(15)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground active:bg-background"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card p-1.5">
        {/* Column labels mirror the set rows below */}
        <div className={cn('grid items-center gap-1.5 px-0.5 pb-1 pt-1 text-center text-xs font-medium text-muted-foreground', gridColumns)}>
          <span>Seria</span>
          <span>Ostatnio</span>
          {exerciseType === 'weight' ? (
            <>
              <span>kg</span>
              <span>Powt.</span>
            </>
          ) : (
            <span>{exerciseType === 'reps' ? 'Powtórzenia' : 'Czas (s)'}</span>
          )}
          <span className="sr-only">Zaliczona</span>
        </div>

        <AnimatePresence initial={false}>
          {/* Newest set on top: only the display order is reversed, setIndex stays
          the real position so numbering, validation and saved order are unchanged. */}
          {fields
            .map((setField, setIndex) => ({ setField, setIndex }))
            .reverse()
            .map(({ setField, setIndex }) => {
              const isCompleted = watch(`exerciseSeries.${index}.sets.${setIndex}.completed`);
              const sets = watch(`exerciseSeries.${index}.sets`);
              // Find the first uncompleted set to mark as active
              const firstUncompletedIndex = sets?.findIndex((s: any) => !s.completed);
              const isActive = firstUncompletedIndex === setIndex;
              const hasError = Boolean(validationErrors[setIndex]);

              return (
                <motion.div key={setField.id} {...listItemMotion}>
                  <div
                    className={cn(
                      'grid items-center gap-1.5 rounded-xl px-0.5 py-1 transition-colors',
                      gridColumns,
                      isCompleted ? 'bg-volt/10' : isActive ? 'bg-primary/10' : ''
                    )}
                  >
                    {/* Set number doubles as the type picker: number = working set,
                  colored icon = special set. The modal also allows deleting. */}
                    <FormField
                      control={control}
                      name={`exerciseSeries.${index}.sets.${setIndex}.type`}
                      render={({ field }) => {
                        const typeConfig = getSetTypeConfig(field.value || SetType.WorkingSet);
                        const isWorkingSet = (field.value || SetType.WorkingSet) === SetType.WorkingSet;
                        const TypeIcon = typeConfig.icon;
                        return (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <SetTypeModal
                                value={field.value || SetType.WorkingSet}
                                onChange={field.onChange}
                                onDeleteSet={() => remove(setIndex)}
                                renderTrigger={
                                  <button
                                    type="button"
                                    aria-label={`Seria ${setIndex + 1}: ${typeConfig.name}`}
                                    className={cn(
                                      'flex h-12 w-full items-center justify-center rounded-xl font-display text-xl font-bold tabular-nums',
                                      isWorkingSet ? 'text-muted-foreground' : cn(typeConfig.bgColorClass, typeConfig.colorClass)
                                    )}
                                  >
                                    {isWorkingSet ? setIndex + 1 : <TypeIcon className="h-4 w-4" />}
                                  </button>
                                }
                              />
                            </FormControl>
                          </FormItem>
                        );
                      }}
                    />

                    <button
                      type="button"
                      disabled={!exerciseHistory?.sets[setIndex]}
                      onClick={() => applyPrevious(setIndex)}
                      aria-label="Wpisz wynik z poprzedniego treningu"
                      className="truncate rounded-lg py-1 text-center text-[13px] font-medium tabular-nums text-muted-foreground active:bg-secondary"
                    >
                      {previousLabel(setIndex)}
                    </button>

                    {/* Conditional fields based on exercise type */}
                    {exerciseType === 'weight' ? (
                      <>
                        <FormField
                          control={control}
                          name={`exerciseSeries.${index}.sets.${setIndex}.weight`}
                          render={({ field }) => (
                            <FormItem className="min-w-0 space-y-0">
                              <FormControl>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.5"
                                  placeholder="0"
                                  aria-label="Ciężar w kilogramach"
                                  {...field}
                                  onFocus={selectAllOnFocus}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    clearValidationError(setIndex);
                                  }}
                                  className={inputClass(isActive, hasError && (field.value === undefined || field.value === null || (field.value as unknown) === ''), Boolean(isCompleted))}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={control}
                          name={`exerciseSeries.${index}.sets.${setIndex}.reps`}
                          render={({ field }) => (
                            <FormItem className="min-w-0 space-y-0">
                              <FormControl>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder="0"
                                  aria-label="Liczba powtórzeń"
                                  {...field}
                                  onFocus={selectAllOnFocus}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    clearValidationError(setIndex);
                                  }}
                                  className={inputClass(isActive, hasError && (!field.value || field.value <= 0), Boolean(isCompleted))}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </>
                    ) : exerciseType === 'reps' ? (
                      <FormField
                        control={control}
                        name={`exerciseSeries.${index}.sets.${setIndex}.reps`}
                        render={({ field }) => (
                          <FormItem className="min-w-0 space-y-0">
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="numeric"
                                placeholder="0"
                                aria-label="Liczba powtórzeń"
                                {...field}
                                onFocus={selectAllOnFocus}
                                onChange={(e) => {
                                  field.onChange(e);
                                  clearValidationError(setIndex);
                                }}
                                className={inputClass(isActive, hasError && (!field.value || field.value <= 0), Boolean(isCompleted))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={control}
                        name={`exerciseSeries.${index}.sets.${setIndex}.duration`}
                        render={({ field }) => (
                          <FormItem className="min-w-0 space-y-0">
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="numeric"
                                placeholder="0"
                                aria-label="Czas w sekundach"
                                {...field}
                                onFocus={selectAllOnFocus}
                                onChange={(e) => {
                                  field.onChange(e);
                                  clearValidationError(setIndex);
                                }}
                                className={inputClass(isActive, hasError && (!field.value || field.value <= 0), Boolean(isCompleted))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={control}
                      name={`exerciseSeries.${index}.sets.${setIndex}.completed`}
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl>
                            <button
                              type="button"
                              aria-label={field.value ? 'Cofnij ukończenie serii' : 'Oznacz serię jako ukończoną'}
                              onClick={() => handleSetCompletion(setIndex, Boolean(field.value))}
                              className={cn(
                                'grid h-12 w-11 place-items-center rounded-xl transition-[transform,background-color] active:scale-90',
                                field.value
                                  ? 'bg-volt text-volt-foreground'
                                  : hasError
                                    ? 'animate-shake bg-destructive/15 text-destructive'
                                    : isActive
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-secondary text-muted-foreground'
                              )}
                            >
                              {hasError && !field.value ? <AlertCircle className="h-5 w-5" /> : <Check className="h-5 w-5" strokeWidth={3} />}
                            </button>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* RPE is asked only once the set is done — before that there is
                nothing to rate, and it would crowd the row. */}
                  {isCompleted && (
                    <FormField
                      control={control}
                      name={`exerciseSeries.${index}.sets.${setIndex}.rpe`}
                      render={({ field }) => (
                        <FormItem className="space-y-0 px-1.5 pb-2 pt-1">
                          <FormControl>
                            <RpeSelector value={field.value} onChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </motion.div>
              )
            })}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** "Co mnie czeka": exercises at a glance in a sheet, with the start button under the thumb. */
function WorkoutPreviewSheet({ trigger, title, description, exerciseSeries, actionLabel, onAction }: { trigger: React.ReactNode; title: string; description: string; exerciseSeries: ExerciseSeries[] | undefined; actionLabel: string; onAction: () => void }) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="template-preview-sheet flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-[2rem] font-bold uppercase leading-none">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="no-scrollbar mt-2 min-h-0 flex-1 overflow-y-auto">
          <WorkoutExercisesPreview exerciseSeries={exerciseSeries} />
        </div>
        <SheetClose asChild>
          <Button onClick={onAction} size="lg" className="mt-3 w-full shrink-0">
            <Play className="fill-current" /> {actionLabel}
          </Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}

function SectionHeader({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3">
      <h2 className="font-display text-[1.75rem] font-bold uppercase leading-none">
        {title}
        {count ? <span className="ml-1.5 text-muted-foreground/60">{count}</span> : null}
      </h2>
      {action}
    </div>
  );
}

/** Small start tile: picture or plain card behind, icon chip on top, label at the bottom. */
function QuickTile({ image, icon: Icon, iconClassName, title, subtitle, onClick, to }: { image?: string; icon: typeof Plus; iconClassName: string; title: string; subtitle: string; onClick?: () => void; to?: string }) {
  const className = cn(
    'relative flex h-[6.5rem] min-w-0 justify-between overflow-hidden rounded-2xl p-3 text-left transition-transform duration-150 active:scale-[0.97]',
    image ? 'bg-[#111316] text-white' : 'bg-card text-foreground'
  );
  const body = (
    <>
      {image && (
        <>
          <img src={image} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/5" />
        </>
      )}
      <span className={cn('relative grid h-8 w-8 place-items-center rounded-full', iconClassName)}>
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <span className="relative block min-w-0">
        <span className="block font-display text-[2.375rem] font-bold uppercase leading-none">{title}</span>
        <span className={cn('mt-0.5 block text-right truncate text-[11px] font-medium', image ? 'text-white/75' : 'text-muted-foreground')}>{subtitle}</span>
      </span>
    </>
  );
  return to ? (
    <Link to={to} className={className}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>{body}</button>
  );
}

type TemplateFilter = 'all' | 'mine' | TemplateFocus;

/** Tiles shown before "Pokaż wszystkie". */
const TEMPLATE_PAGE_SIZE = 6;

const isOwnTemplate = (template: Workout) => Boolean(template.ownerId && template.ownerId !== 'public');

// --- SELECTION VIEW COMPONENT ---
function WorkoutSelectionView({ onStartBuilder, allExercises }: { onStartBuilder: (data: LogFormValues) => void; allExercises: Exercise[] | null }) {
  const { user } = useUser();
  const supportsGeolocation = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const [startRunDialogOpen, setStartRunDialogOpen] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('all');
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // Trainer-prepared running programs, offered from the "Bieg" quick-start tile
  const { data: runningPrograms } = useCollection<RunningProgram>(
    supportsGeolocation ? 'runningPrograms' : null,
    { isActive: true }
  );

  // Fetch plans assigned to the athlete
  const { data: assignedPlans, isLoading: assignedPlansLoading } = useCollection<TrainingPlan>(
    user?.uid ? 'workoutPlans' : null,
    user?.uid ? { assignedAthleteIds: { $in: [user.uid] } } : undefined
  );

  // Fetch plans created by the athlete (if they're also a trainer)
  const { data: myPlans, isLoading: myPlansLoading } = useCollection<TrainingPlan>(
    user?.uid ? 'workoutPlans' : null,
    user?.uid ? { trainerId: user.uid } : undefined
  );

  // Fetch workout templates (user's own + public)
  const { data: workoutTemplates, isLoading: templatesLoading } = useCollection<Workout>(
    user?.uid ? 'workouts' : null,
    user?.uid ? { $or: [{ ownerId: 'public' }, { ownerId: user.uid }] } : undefined
  );

  // Fetch history logs
  const { data: historyLogs } = useCollection<WorkoutLog>(
    user?.uid ? 'workoutLogs' : null,
    user?.uid ? { athleteId: user.uid, status: 'completed' } : undefined,
    { sort: { endTime: -1 }, limit: 15 }
  );

  const workoutPlans = useMemo(() => {
    const plansMap = new Map<string, TrainingPlan>();
    assignedPlans?.forEach(plan => plansMap.set(plan.id, plan));
    myPlans?.forEach(plan => plansMap.set(plan.id, plan));
    return Array.from(plansMap.values());
  }, [assignedPlans, myPlans]);

  // Own templates first, then the ones used most recently, then A–Z.
  const templates = useMemo(() => {
    const lastUsed = (t: Workout) => {
      const log = lastSessionOf(t, historyLogs);
      return log ? new Date(log.endTime).getTime() : 0;
    };
    return [...(workoutTemplates ?? [])].sort((a, b) =>
      Number(isOwnTemplate(b)) - Number(isOwnTemplate(a)) ||
      lastUsed(b) - lastUsed(a) ||
      a.name.localeCompare(b.name, 'pl')
    );
  }, [workoutTemplates, historyLogs]);

  const focusById = useMemo(() => new Map(templates.map(t => [t.id, templateFocus(t.exerciseSeries)])), [templates]);

  const filterChips = useMemo(() => {
    const chips: { id: TemplateFilter; label: string }[] = [{ id: 'all', label: 'Wszystkie' }];
    if (templates.some(isOwnTemplate) && templates.some(t => !isOwnTemplate(t))) chips.push({ id: 'mine', label: 'Moje' });
    const present = new Set(focusById.values());
    for (const focus of FOCUS_ORDER) if (present.has(focus)) chips.push({ id: focus, label: FOCUS_META[focus].label });
    return chips;
  }, [templates, focusById]);

  const filteredTemplates = useMemo(
    () => templates.filter(t => templateFilter === 'all' || (templateFilter === 'mine' ? isOwnTemplate(t) : focusById.get(t.id) === templateFilter)),
    [templates, templateFilter, focusById]
  );
  const visibleTemplates = showAllTemplates ? filteredTemplates : filteredTemplates.slice(0, TEMPLATE_PAGE_SIZE);
  const hiddenCount = filteredTemplates.length - visibleTemplates.length;

  const recommendation = useMemo(() => recommendTemplate(templates, historyLogs), [templates, historyLogs]);

  const handleStartWorkout = (workout: Workout) => {
    const workoutData: LogFormValues = {
      workoutName: workout.name,
      exerciseSeries: workout.exerciseSeries.map(series => ({
        exerciseId: getExerciseId(series.exercise),
        sets: series.sets.map((s, i) => ({
          number: i + 1,
          type: s.type || SetType.WorkingSet,
          reps: s.reps || 0,
          weight: s.weight || 0,
          restTimeSeconds: s.restTimeSeconds || 60,
          duration: undefined, // WorkoutSet doesn't have duration in data.ts, but ExerciseSeries might? No.
          completed: false
        })),
        tempo: series.tempo || "2-0-2-0",
        tip: series.tip
      })),
      level: workout.level || TrainingLevel.Intermediate
    };
    onStartBuilder(workoutData);
  };

  const handleRepeatWorkout = (log: WorkoutLog) => {
    const workoutData: LogFormValues = {
      workoutName: log.workoutName,
      exerciseSeries: log.exercises.map(ex => ({
        exerciseId: getExerciseId(ex.exercise) || ex.exerciseId || '',
        sets: ex.sets.map((s, i) => ({
          number: s.number || i + 1,
          type: s.type || SetType.WorkingSet,
          reps: s.reps,
          weight: s.weight,
          restTimeSeconds: s.restTimeSeconds || 60,
          duration: s.duration,
          completed: false
        })),
        tempo: ex.tempo || "2-0-2-0",
        tip: ex.tip
      })),
      level: TrainingLevel.Intermediate
    };
    onStartBuilder(workoutData);
  }

  const handleStartEmpty = () => {
    onStartBuilder({
      workoutName: `Trening ${format(new Date(), 'd.MM')}`,
      exerciseSeries: [],
      level: TrainingLevel.Intermediate
    });
  }

  const plansLoading = assignedPlansLoading || myPlansLoading;
  const templatesPending = templatesLoading && !workoutTemplates;
  const lastLog = historyLogs?.[0];
  const logDate = (log: WorkoutLog) => new Date(log.endTime as unknown as string | number | Date);

  return (
    <div className="stagger-rise space-y-6">

      <div className={cn('grid gap-2 grid-cols-1')}>
        <QuickTile image={gymPhoto} icon={Plus} iconClassName="bg-primary text-primary-foreground" title="Od zera" subtitle="Pusty trening" onClick={handleStartEmpty} />
        {supportsGeolocation && (
          <QuickTile image={runCover} icon={Footprints} iconClassName="bg-run text-white" title="Bieg" subtitle="Trasa z GPS" onClick={() => setStartRunDialogOpen(true)} />
        )}
      </div>
      <StartRunDialog open={startRunDialogOpen} onOpenChange={setStartRunDialogOpen} programs={runningPrograms} />

      <section>
        <SectionHeader
          title="Szablony"
          count={templates.length}
          action={<Link to="/athlete/workouts" className="pb-0.5 text-sm font-semibold text-primary">Zarządzaj</Link>}
        />

        {filterChips.length > 2 && (
          <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4" role="tablist" aria-label="Filtr szablonów">
            {filterChips.map(chip => (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={templateFilter === chip.id}
                onClick={() => { setTemplateFilter(chip.id); setShowAllTemplates(false); }}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors',
                  templateFilter === chip.id ? 'bg-foreground text-background' : 'bg-card text-muted-foreground'
                )}
              >
                {chip.id !== 'all' && chip.id !== 'mine' && (
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: FOCUS_META[chip.id].accent }} />
                )}
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {templatesPending ? (
          <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[13.5rem] rounded-2xl" />)}
          </div>
        ) : templates.length === 0 ? (
          <div className="overflow-hidden rounded-2xl bg-card">
            <img src={FOCUS_META.fullbody.cover} alt="" className="aspect-[2/1] w-full object-cover" />
            <div className="p-5 text-center">
              <p className="text-[15px] font-semibold">Brak szablonów</p>
              <p className="mx-auto mt-1 max-w-[17rem] text-sm text-muted-foreground">Zapisz swój stały trening, żeby zaczynać go jednym dotknięciem.</p>
              <Button asChild size="sm" className="mt-4">
                <Link to="/athlete/workouts/create"><Plus /> Nowy szablon</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {visibleTemplates.map(template => (
                <TemplateTile key={template.id} template={template} logs={historyLogs} onStart={() => handleStartWorkout(template)} />
              ))}
              {hiddenCount === 0 && (templateFilter === 'all' || templateFilter === 'mine') && <NewTemplateTile />}
            </div>
            {filteredTemplates.length > TEMPLATE_PAGE_SIZE && (
              <Button variant="secondary" size="sm" className="mt-2.5 w-full" onClick={() => setShowAllTemplates(v => !v)}>
                {showAllTemplates ? 'Pokaż mniej' : `Pokaż wszystkie (${filteredTemplates.length})`}
              </Button>
            )}
          </>
        )}
      </section>

      {(plansLoading || workoutPlans.length > 0) && (
        <section>
          <SectionHeader title="Plany" count={workoutPlans.length} />
          {plansLoading && workoutPlans.length === 0 ? (
            <div className="space-y-2.5">
              {[1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-card" />)}
            </div>
          ) : (
            <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
              {workoutPlans.map(plan => (
                <Sheet key={plan.id}>
                  <SheetTrigger asChild>
                    <button type="button" className="row-tap flex w-full items-center gap-3 px-3.5 py-3 text-left">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                        <Calendar className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold leading-tight">{plan.name}</span>
                        <span className="block text-xs text-muted-foreground">{plural(plan.stages?.length || 0, 'etap', 'etapy', 'etapów')}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85dvh]">
                    <SheetHeader>
                      <SheetTitle>{plan.name}</SheetTitle>
                      <SheetDescription>Wybierz trening z planu.</SheetDescription>
                    </SheetHeader>
                    <Accordion type="single" collapsible className="mt-2 w-full">
                      {plan.stages?.map((stage, stageIndex) => (
                        <AccordionItem value={`stage-${stageIndex}`} key={stageIndex}>
                          <AccordionTrigger>{stage.name}</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              {stage.weeks?.map((week, weekIndex) => (
                                <div key={weekIndex}>
                                  <h4 className="eyebrow mb-1.5">Tydzień {weekIndex + 1}</h4>
                                  <div className="divide-y divide-border/50 overflow-hidden rounded-xl bg-secondary/50">
                                    {week.days?.map((day, dayIndex) => {
                                      if (day === 'Rest Day') {
                                        return (
                                          <div key={dayIndex} className="flex justify-between px-3 py-2.5 text-sm text-muted-foreground">
                                            <span>Dzień {dayIndex + 1}</span>
                                            <span>Odpoczynek</span>
                                          </div>
                                        );
                                      }
                                      // It's a Workout object
                                      return (
                                        <WorkoutPreviewSheet
                                          key={dayIndex}
                                          title={day.name}
                                          description={`Dzień ${dayIndex + 1} · ${exercisesLabel(day.exerciseSeries?.length || 0)}`}
                                          exerciseSeries={day.exerciseSeries}
                                          actionLabel="Rozpocznij"
                                          onAction={() => handleStartWorkout(day)}
                                          trigger={
                                            <button type="button" className="row-tap flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left">
                                              <span className="min-w-0">
                                                <span className="block truncate text-sm font-semibold">Dzień {dayIndex + 1}: {day.name}</span>
                                                <span className="block text-xs text-muted-foreground">{exercisesLabel(day.exerciseSeries?.length || 0)}</span>
                                              </span>
                                              <Play className="h-4 w-4 shrink-0 text-primary" />
                                            </button>
                                          }
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </SheetContent>
                </Sheet>
              ))}
            </div>
          )}
        </section>
      )}

      {historyLogs && <MuscleRecovery logs={historyLogs} />}

      {historyLogs && historyLogs.length > 0 && (
        <section>
          <SectionHeader
            title="Ostatnie"
            action={<Link to="/athlete/history" className="pb-0.5 text-sm font-semibold text-primary">Cała historia</Link>}
          />
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-1">
            {historyLogs.slice(0, 8).map(log => (
              <WorkoutPreviewSheet
                key={log.id}
                title={log.workoutName}
                description={`${exercisesLabel(log.exercises?.length || 0)} · ${format(logDate(log), 'd MMMM yyyy', { locale: pl })}`}
                exerciseSeries={log.exercises}
                actionLabel="Powtórz trening"
                onAction={() => handleRepeatWorkout(log)}
                trigger={
                  <button type="button" className="flex w-[10.5rem] shrink-0 snap-start flex-col rounded-2xl bg-card p-3.5 text-left transition-transform duration-150 active:scale-[0.97]">
                    <span className="eyebrow capitalize">{format(logDate(log), 'EEE, d MMM', { locale: pl })}</span>
                    <span className="mt-1 line-clamp-2 font-display text-xl font-bold uppercase leading-[1.02]">{log.workoutName}</span>
                    <span className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
                      <span className="truncate">{exercisesLabel(log.exercises?.length || 0)}</span>
                      <RotateCcw className="h-3.5 w-3.5 shrink-0 text-primary" />
                    </span>
                  </button>
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function LogWorkoutPage() {
  const [view, setView] = useState<'selection' | 'builder' | 'active'>('selection');
  const [builderData, setBuilderData] = useState<LogFormValues | null>(null);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const { user } = useUser();
  const { data: userProfile } = useDoc<UserProfile>('users', user?.uid || null);

  const ownerIds = useMemo(() => {
    const ids = ['public'];
    if (user?.uid) ids.push(user.uid);
    if (userProfile?.trainerId) ids.push(userProfile.trainerId);
    return ids;
  }, [user?.uid, userProfile?.trainerId]);

  // Fetch exercises (public, user's own, and trainer's + legacy exercises with no owner)
  const { data: allExercises, isLoading: exercisesLoading } = useCollection<Exercise>(
    'exercises',
    user?.uid ? visibleExercisesScope(ownerIds) : undefined
  );

  // Check for active workout
  const { data: activeWorkouts, isLoading: isLoadingActive } = useCollection<WorkoutLog>(
    user?.uid ? 'workoutLogs' : null,
    user?.uid ? { athleteId: user.uid, status: 'in-progress' } : undefined
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const workoutId = searchParams.get('workoutId');
  const logId = searchParams.get('logId');
  // Ćwiczenie przyjęte z kodu QR na maszynie (/athlete/exercise/:id → /athlete/log?addExercise=)
  const pendingExerciseId = searchParams.get('addExercise');
  const { data: preselectedWorkout, isLoading: isLoadingPreselected } = useDoc<Workout>('workouts', workoutId);
  const { toast } = useToast();

  // Handle Active Workout Resume
  useEffect(() => {
    if (activeWorkouts && activeWorkouts.length > 0) {
      const activeLog = logId
        ? activeWorkouts.find(l => l.id === logId) || activeWorkouts[0]
        : activeWorkouts[0];

      // If user tried to start a new workout via URL but has an active one
      if (workoutId && activeLog.id !== workoutId) { // Note: workoutId param is a Workout ID, activeLog.id is Log ID. We can't easily compare, but existence of activeLog takes precedence.
        // Ideally we'd check if they are trying to start the SAME workout, but for now strict single-session policy.
        // We can show a toast only if we haven't already set up the view
        if (view !== 'active') {
          toast({
            title: "Wznowiono trening",
            description: "Masz niezakończony trening. Został on przywrócony.",
          });
        }
      }

      const resumedData: LogFormValues = {
        workoutName: activeLog.workoutName,
        exerciseSeries: activeLog.exercises.map(ex => ({
          exerciseId: getExerciseId(ex.exercise) || ex.exerciseId || '',
          sets: ex.sets.map(s => ({
            number: s.number,
            type: s.type,
            reps: s.reps,
            weight: s.weight,
            restTimeSeconds: s.restTimeSeconds || 60,
            completed: s.completed,
            duration: s.duration
          })),
          tempo: ex.tempo || "2-0-2-0",
          tip: ex.tip
        })),
        level: TrainingLevel.Intermediate, // Default or fetch from somewhere if needed
        // We might want to pass startTime too if we want correct timer
      };
      // Hack to pass start time via the form values or separate prop?
      // Let's add it to LogFormValues temporarily or handle in ActiveWorkoutView
      // For now, let's assume we can pass it via a hidden field or just use the prop in ActiveWorkoutView

      setActiveLogId(activeLog.id);
      setBuilderData({ ...resumedData, startTime: activeLog.startTime } as any); // Type assertion if we don't update schema yet
      setView('active');
    }
  }, [activeWorkouts, workoutId, view]);

  // Auto-start builder if workoutId is present and workout is loaded AND NO ACTIVE WORKOUT
  useEffect(() => {
    if (activeWorkouts && activeWorkouts.length > 0) return; // Don't auto-start if active exists

    if (workoutId && preselectedWorkout && !builderData && view === 'selection') {
      const workoutData: LogFormValues = {
        workoutName: preselectedWorkout.name,
        exerciseSeries: preselectedWorkout.exerciseSeries.map(series => {
          let exerciseId = getExerciseId(series.exercise);

          // Try to find by name if ID is missing
          if (!exerciseId && allExercises) {
            const found = allExercises.find(e => e.name === series.exercise.name);
            if (found) exerciseId = found.id;
          }

          // Log warning if still missing (but don't generate temp ID - let validation catch it)
          if (!exerciseId) {
            console.warn(`Missing ID for exercise: ${series.exercise.name}`);
          }

          return {
            exerciseId: exerciseId || '',
            sets: series.sets.map((s, i) => ({
              number: i + 1,
              type: s.type || SetType.WorkingSet,
              reps: s.reps || 0,
              weight: s.weight || 0,
              restTimeSeconds: s.restTimeSeconds || 60,
              duration: undefined,
              completed: false
            })),
            tempo: series.tempo || "2-0-2-0",
            tip: series.tip
          };
        }),
        level: preselectedWorkout.level || TrainingLevel.Intermediate
      };
      handleStartBuilder(workoutData);
    }
  }, [workoutId, preselectedWorkout, builderData, view, activeWorkouts, allExercises]);

  // Brak trwającego treningu: przygotuj nowy trening z ćwiczeniem z kodu QR.
  useEffect(() => {
    if (isLoadingActive || (activeWorkouts && activeWorkouts.length > 0)) return;
    if (!pendingExerciseId || workoutId || builderData || view !== 'selection') return;

    handleStartBuilder({
      workoutName: 'Nowy trening',
      exerciseSeries: [{
        exerciseId: pendingExerciseId,
        sets: [1, 2, 3].map(number => ({
          number,
          type: SetType.WorkingSet,
          reps: 0,
          weight: 0,
          restTimeSeconds: 60,
          completed: false
        })),
        tempo: "2-0-2-0"
      }],
      level: TrainingLevel.Intermediate
    });
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('addExercise');
      return next;
    }, { replace: true });
  }, [pendingExerciseId, isLoadingActive, activeWorkouts, workoutId, builderData, view, setSearchParams]);

  const handleStartBuilder = (data: LogFormValues) => {
    setBuilderData(data);
    setView('builder');
  };

  const handleStartActive = (data: LogFormValues) => {
    setBuilderData(data);
    setView('active');
  }

  const handleCancelBuilder = () => {
    setBuilderData(null);
    setView('selection');
  }

  const handleFinishWorkout = () => {
    setBuilderData(null);
    setView('selection');
  }

  if (view === 'active' && builderData) {
    return (
      <div className="h-full px-4">
        <ActiveWorkoutView
          initialWorkout={builderData}
          onFinishWorkout={handleFinishWorkout}
          allExercises={allExercises}
          isLoadingExercises={exercisesLoading}
          initialLogId={activeLogId}
          sourceWorkoutId={workoutId} // Pass the workout template ID
          pendingExerciseId={pendingExerciseId}
        />
      </div>
    )
  }

  if (view === 'builder' && builderData) {
    return (
      <div className="h-full px-4 pb-3">
        <WorkoutBuilderView
          initialData={builderData}
          onStart={handleStartActive}
          onCancel={handleCancelBuilder}
          allExercises={allExercises}
          isLoadingExercises={exercisesLoading}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <WorkoutSelectionView
        onStartBuilder={handleStartBuilder}
        allExercises={allExercises}
      />
    </div>
  );
}
