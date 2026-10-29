'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronDown, Clock, Dumbbell, Layers, MessageSquare, Users } from 'lucide-react';
import { useCollection, useDoc, useUser } from '@/lib/db-hooks';
import type { TrainingPlan, UserProfile, Workout } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { tint } from '@/components/profile/profile-ui';
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';
import { levelColor, levelLabel } from '@/components/workouts/workout-format';

const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

const isWorkout = (day: unknown): day is Workout => typeof day === 'object' && day !== null;

function planStats(plan: TrainingPlan) {
  const weeks = plan.stages.reduce((n, s) => n + s.weeks.length, 0);
  const workouts = plan.stages.reduce(
    (n, s) => n + s.weeks.reduce((m, w) => m + w.days.filter(isWorkout).length, 0),
    0
  );
  return { stages: plan.stages.length, weeks, workouts };
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', className)}>
      {children}
    </span>
  );
}

function TrainerStrip({ trainer }: { trainer: UserProfile }) {
  return (
    <section className="flex items-center gap-3 rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft">
      <TrainerAvatar trainer={trainer} className="h-14 w-14 text-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Twój trener</p>
        <p className="truncate font-headline text-lg font-bold">{trainer.name}</p>
        {trainer.location && <p className="truncate text-xs text-muted-foreground">{trainer.location}</p>}
      </div>
      <Button asChild size="icon" className="h-11 w-11 shrink-0 rounded-full" aria-label="Napisz do trenera">
        <Link to="/athlete/chat">
          <MessageSquare className="h-4 w-4" />
        </Link>
      </Button>
    </section>
  );
}

function StageBlock({ stage, index, color, defaultOpen }: { stage: TrainingPlan['stages'][number]; index: number; color: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/60">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold tabular-nums"
          style={{ backgroundColor: tint(color, 15), color }}
        >
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{stage.name}</span>
          <span className="block text-xs text-muted-foreground">{stage.weeks.length} tyg.</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-2 border-t border-border/60 p-3">
          {stage.weeks.map((week, wi) => (
            <div key={wi}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tydzień {wi + 1}</p>
              <div className="grid grid-cols-7 gap-1">
                {week.days.map((day, di) => {
                  const workout = isWorkout(day) ? day : null;
                  const cell = (
                    <span
                      className={cn(
                        'flex h-12 flex-col items-center justify-center rounded-xl text-[10px] font-bold',
                        workout ? 'text-white' : 'bg-secondary/60 text-muted-foreground'
                      )}
                      style={workout ? { backgroundColor: color } : undefined}
                      title={workout?.name ?? 'Odpoczynek'}
                    >
                      <span className="opacity-80">{DAY_LABELS[di]}</span>
                      {workout ? <Dumbbell className="mt-0.5 h-3.5 w-3.5" /> : <span className="mt-0.5">–</span>}
                    </span>
                  );
                  return workout?.id ? (
                    <Link key={di} to={`/athlete/workouts/${workout.id}`} className="transition-transform active:scale-90">
                      {cell}
                    </Link>
                  ) : (
                    <span key={di}>{cell}</span>
                  );
                })}
              </div>
              <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                {week.days.map((day, di) =>
                  isWorkout(day) ? (
                    <li key={di} className="truncate">
                      <span className="font-semibold text-foreground">{DAY_LABELS[di]}</span> · {day.name}
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan }: { plan: TrainingPlan }) {
  const { stages, weeks, workouts } = planStats(plan);
  const color = levelColor(plan.level);

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-soft">
      <header className="hero-ember texture-grain relative overflow-hidden p-5 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full border-[1rem] border-white/10" />
        <div className="relative">
          <Pill className="bg-white/20 backdrop-blur-sm">{levelLabel(plan.level)}</Pill>
          <h2 className="mt-3 font-display text-2xl font-extrabold uppercase leading-tight">{plan.name}</h2>
          {plan.description && <p className="mt-1 line-clamp-2 text-sm text-white/80">{plan.description}</p>}
        </div>
      </header>

      <div className="grid grid-cols-3 divide-x divide-border/60 border-b border-border/60 py-3 text-center">
        {[
          { icon: Layers, value: stages, label: 'Etapów' },
          { icon: Calendar, value: weeks, label: 'Tygodni' },
          { icon: Dumbbell, value: workouts, label: 'Treningów' },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <Icon className="h-4 w-4 text-primary" />
            <p className="font-display text-xl font-extrabold tabular-nums leading-none">{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 p-3">
        {plan.stages.map((stage, i) => (
          <StageBlock key={i} stage={stage} index={i} color={color} defaultOpen={plan.stages.length === 1 && i === 0} />
        ))}
      </div>
    </article>
  );
}

function PageHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
    </header>
  );
}

const SHELL = 'mx-auto w-full max-w-3xl space-y-6 px-4 pb-4 pt-20 md:px-6 md:pt-8';

export default function AthleteWorkoutPlansPage() {
  const { user } = useUser();

  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(user ? 'users' : null, user?.uid || null);
  const { data: trainer, isLoading: trainerLoading } = useDoc<UserProfile>(
    userProfile?.trainerId ? 'users' : null,
    userProfile?.trainerId || null
  );
  const { data: plans, isLoading: plansLoading } = useCollection<TrainingPlan>(
    user?.uid ? 'workoutPlans' : null,
    { assignedAthleteIds: { $in: [user?.uid] } }
  );

  if (profileLoading || (userProfile?.trainerId && trainerLoading) || plansLoading) {
    return (
      <div className={SHELL}>
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-24 rounded-[1.75rem]" />
        <Skeleton className="h-72 rounded-[1.75rem]" />
      </div>
    );
  }

  // No trainer yet: point to the trainer directory.
  if (!userProfile?.trainerId || !trainer) {
    return (
      <div className={SHELL}>
        <PageHeader eyebrow="Mój program" title="Plan od trenera" />
        <section className="hero-ember texture-grain relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-glow">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border-[1.2rem] border-white/10" />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/75">Profesjonalne wsparcie</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold uppercase leading-[1.05]">Plan szyty na miarę</h2>
            <p className="mt-2 max-w-sm text-sm text-white/85">
              Programy przygotowują certyfikowani trenerzy. Wybierz trenera, a plan pojawi się tutaj.
            </p>
            <Button asChild className="mt-5 h-11 rounded-full bg-white px-6 font-bold text-primary hover:bg-white/90">
              <Link to="/athlete/trainers">
                <Users className="mr-2 h-4 w-4" /> Znajdź trenera
              </Link>
            </Button>
          </div>
        </section>
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            ['Indywidualne podejście', 'Plan dopasowany do celów i możliwości.'],
            ['Stały kontakt', 'Konsultacje i korekta planu w czacie.'],
            ['Skuteczność', 'Sprawdzone metody i mierzalny progres.'],
          ].map(([title, text]) => (
            <li key={title} className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-soft">
              <p className="text-sm font-bold">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Trainer assigned, no plan yet.
  if (!plans || plans.length === 0) {
    return (
      <div className={SHELL}>
        <PageHeader eyebrow="Mój program" title="Plan od trenera" />
        <TrainerStrip trainer={trainer} />
        <div className="rounded-[1.75rem] border-2 border-dashed border-border/70 px-6 py-14 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </span>
          <h2 className="mt-4 font-headline text-lg font-bold">Trener przygotowuje Twój plan</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Gdy {trainer.name} przypisze Ci program, zobaczysz tu etapy, tygodnie i poszczególne treningi.
          </p>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/athlete/chat">Napisz do trenera</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={SHELL}>
      <PageHeader eyebrow="Mój program" title={plans.length === 1 ? 'Twój plan' : 'Twoje plany'} />
      <TrainerStrip trainer={trainer} />
      <div className="space-y-5">
        {plans.map(plan => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}
