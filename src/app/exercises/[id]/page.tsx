import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Dumbbell, Flame, Repeat, Timer, Trophy, Users } from 'lucide-react';
import { connectToDatabase } from '@/lib/mongodb';
import { getExerciseStats, getPublicExercise, PublicExercise } from '@/lib/exercise-public';
import { getAnimationUrl, isVideoFileUrl, SETUP_GROUPS, getSetupValue } from '@/components/shared/exercises/setup';
import { AppDownloadSection, OpenInApp } from './OpenInApp';
import './exercise-public.css';

// Strona publiczna jest cache'owana, bo odwiedza ją każdy, kto zeskanuje kod z maszyny.
export const revalidate = 600;

interface PageProps {
  params: Promise<{ id: string }>;
}

async function loadExercise(id: string) {
  await connectToDatabase();
  const exercise = await getPublicExercise(id);
  if (!exercise) return null;
  const stats = await getExerciseStats(exercise.id);
  return { exercise, stats };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await loadExercise(id);
  if (!data) return { title: 'Nie znaleziono ćwiczenia · LeniwaKluska' };

  const { exercise } = data;
  const description =
    exercise.instructions?.slice(0, 155) ?? `Ćwiczenie ${exercise.name} w aplikacji LeniwaKluska.`;

  return {
    title: `${exercise.name} · LeniwaKluska`,
    description,
  };
}

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
}

function splitSteps(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(Boolean);
}

function Media({ exercise }: { exercise: PublicExercise }) {
  const url = getAnimationUrl(exercise) || exercise.mediaUrl || exercise.image || '';
  if (!url) return null;

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const embed = getYouTubeEmbedUrl(url);
    if (embed) {
      return (
        <iframe
          src={embed}
          title={exercise.name}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
  }

  if (isVideoFileUrl(url)) {
    return (
      <video
        src={url}
        className="h-full w-full object-contain"
        autoPlay
        loop
        muted
        playsInline
        controls
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={exercise.name} className="h-full w-full object-contain" />;
}

const TYPE_META = {
  weight: { label: 'Ciężar', Icon: Dumbbell },
  reps: { label: 'Powtórzenia', Icon: Repeat },
  duration: { label: 'Czas trwania', Icon: Timer },
} as const;

export default async function PublicExercisePage({ params }: PageProps) {
  const { id } = await params;
  const data = await loadExercise(id);
  if (!data) notFound();

  const { exercise, stats } = data;
  const typeMeta = TYPE_META[exercise.type] ?? TYPE_META.weight;
  const bodyPart = getSetupValue(exercise.setup, SETUP_GROUPS.bodyPart);
  const equipment = getSetupValue(exercise.setup, SETUP_GROUPS.equipment);
  const steps = splitSteps(exercise.instructions || exercise.description || '');

  return (
    <main className="ember-public">
      <div className="aurora" aria-hidden />

      <div className="relative mx-auto flex max-w-xl flex-col gap-5 px-4 pb-12 pt-6 sm:px-6">
        <header className="flex items-center gap-2">
          <span className="hero-ember flex h-9 w-9 items-center justify-center rounded-xl">
            <Dumbbell className="h-5 w-5" />
          </span>
          <span className="title-display text-sm font-extrabold">LeniwaKluska</span>
        </header>

        <section className="space-y-4">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-muted">
            <Media exercise={exercise} />
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Ćwiczenie z maszyny
            </p>
            <h1 className="title-display text-3xl font-extrabold leading-tight">{exercise.name}</h1>

            <div className="flex flex-wrap gap-2">
              <span className="volt-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase">
                <typeMeta.Icon className="h-3.5 w-3.5" />
                {typeMeta.label}
              </span>
              {exercise.mainMuscleGroups.map((mg) => (
                <span
                  key={mg.name}
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                >
                  {mg.name}
                </span>
              ))}
              {(bodyPart || equipment) && (
                <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                  {[bodyPart, equipment].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="hero-ember space-y-4 rounded-3xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold opacity-90">
            <Flame className="h-4 w-4" />
            Łącznie podniesiono na tym ćwiczeniu
          </div>
          <p className="title-display text-4xl font-extrabold tabular-nums sm:text-5xl">
            {exercise.type === 'weight'
              ? `${stats.totalKg.toLocaleString('pl-PL')} kg`
              : `${stats.totalReps.toLocaleString('pl-PL')} powt.`}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-black/20 p-3">
              <p className="flex items-center gap-1.5 text-xs opacity-80">
                <Users className="h-3.5 w-3.5" /> Trenujących
              </p>
              <p className="text-lg font-bold tabular-nums">{stats.lifters.toLocaleString('pl-PL')}</p>
            </div>
            <div className="rounded-2xl bg-black/20 p-3">
              <p className="text-xs opacity-80">Ukończonych serii</p>
              <p className="text-lg font-bold tabular-nums">{stats.totalSets.toLocaleString('pl-PL')}</p>
            </div>
          </div>

          {stats.topGyms.length > 0 && (
            <div className="space-y-2 rounded-2xl bg-black/20 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] opacity-80">
                <Trophy className="h-3.5 w-3.5" /> Najwięcej w salach
              </p>
              <ol className="space-y-1 text-sm">
                {stats.topGyms.map((gym, index) => (
                  <li key={gym.name} className="flex items-center justify-between gap-3">
                    <span className="truncate">
                      {index + 1}. {gym.name}
                    </span>
                    <span className="shrink-0 font-bold tabular-nums">
                      {gym.totalKg.toLocaleString('pl-PL')} kg
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <OpenInApp exerciseId={exercise.id} />
        </section>

        {steps.length > 0 && (
          <section className="glass space-y-3 rounded-3xl p-5">
            <h2 className="title-display text-base font-extrabold">Jak wykonywać</h2>
            <ol className="space-y-3">
              {steps.map((step, index) => (
                <li key={index} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="volt-text shrink-0 font-bold tabular-nums">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <AppDownloadSection />
      </div>
    </main>
  );
}
