import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dumbbell, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SETUP_GROUPS } from '@/components/shared/exercises/setup';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { resolveMediaUrl } from '@/lib/api-client';
import { isOfflineVideoUrl } from '@/lib/offline-media';
import { useDoc } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import type { Exercise } from '@/lib/types';

const isVideoFileUrl = (url: string | undefined) =>
  !!url && (isOfflineVideoUrl(url) || /\.(mp4|webm)(\?|#|$)/i.test(url));

/**
 * Ekran otwierany z kodu QR na maszynie. Trening trwa → ćwiczenie trafia od razu
 * do niego. Brak treningu → podgląd z propozycją rozpoczęcia nowego.
 */
export default function ExerciseQuickViewPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const { activeWorkout, isLoading: isLoadingWorkout } = useActiveWorkout();
  const { data: exercise, isLoading: isLoadingExercise } = useDoc<Exercise>('exercises', exerciseId ?? null);

  useEffect(() => {
    if (isLoadingWorkout || !activeWorkout || !exercise) return;
    haptic('tap');
    navigate(`/athlete/log?logId=${activeWorkout.id}&addExercise=${exercise.id}`, { replace: true });
  }, [activeWorkout, exercise, isLoadingWorkout, navigate]);

  if (isLoadingExercise || isLoadingWorkout) {
    return (
      <div className="page space-y-4">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="page space-y-4 text-center">
        <p className="text-muted-foreground">Nie znaleziono tego ćwiczenia.</p>
        <Button variant="outline" onClick={() => navigate('/athlete/exercises')}>
          Biblioteka ćwiczeń
        </Button>
      </div>
    );
  }

  // Animacja z importu openGym ma pierwszeństwo przed obrazkiem, tak jak w ExerciseDetailDialog.
  const animationUrl = exercise.setup?.find(s => s.group === SETUP_GROUPS.animation)?.value;
  const mediaUrl = resolveMediaUrl(animationUrl || exercise.mediaUrl || exercise.image);
  const isVideo = isVideoFileUrl(mediaUrl);
  const steps = exercise.instructions || exercise.description || '';

  return (
    <div className="page space-y-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border/70 bg-muted">
        {mediaUrl &&
          (isVideo ? (
            <video src={mediaUrl} className="h-full w-full object-contain" autoPlay loop muted playsInline controls />
          ) : (
            <img src={mediaUrl} alt={exercise.name} className="h-full w-full object-contain" />
          ))}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">Ćwiczenie z maszyny</p>
        <h1 className="font-display text-5xl font-bold uppercase leading-tight">{exercise.name}</h1>
        <div className="flex flex-wrap gap-2">
          {exercise.mainMuscleGroups?.map(mg => (
            <Badge key={mg.name} variant="default">
              {mg.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {!activeWorkout && (
          <Button
            size="lg"
            className="w-full gap-2 rounded-full"
            onClick={() => navigate(`/athlete/log?addExercise=${exercise.id}`)}
          >
            <Plus className="h-4 w-4" />
            Rozpocznij trening z tym ćwiczeniem
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          className="w-full rounded-full"
          onClick={() => navigate('/athlete/exercises')}
        >
          Więcej w bibliotece
        </Button>
      </div>

      {steps && (
        <section className="space-y-2 rounded-2xl bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Dumbbell className="h-4 w-4 text-primary" /> Instrukcje
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{steps}</p>
        </section>
      )}
    </div>
  );
}
