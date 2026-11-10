import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Target, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, SectionHeader } from '@/components/ui/section';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCollection, useUser } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import { pluralForm } from '@/lib/plural';
import type { Achievement, Goal } from '@/lib/types';
import { useRewardsOverview, type GoalView } from '@/hooks/useRewards';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalFormSheet, GoalProgressSheet } from '@/components/goals/GoalFormSheet';
import { CompletedGoals } from '@/components/goals/CompletedGoals';
import { AddTrophySheet, TrophyGallery } from '@/components/goals/TrophyGallery';
import { ShareGoalDialog } from '@/components/goals/ShareGoalDialog';
import { RewardsHero } from '@/components/rewards/RewardsHero';
import { WeeklyQuests } from '@/components/rewards/WeeklyQuests';
import { AchievementTracks } from '@/components/rewards/AchievementTracks';
import { RewardCelebration, type Celebration } from '@/components/rewards/RewardCelebration';

const errorMessage = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-my-2 flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-primary active:opacity-70"
    >
      <Plus className="h-4 w-4" /> {label}
    </button>
  );
}

export default function GoalsAndRewardsPage() {
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const { overview, isLoading, error, refresh, createGoal, updateGoal, deleteGoal, completeGoal, markSeen } = useRewardsOverview(
    Boolean(user)
  );
  const { data: trophies, refetch: refetchTrophies } = useCollection<Achievement>(
    user ? 'achievements' : null,
    { ownerId: user?.uid },
    { sort: { date: -1 } }
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GoalView | null>(null);
  const [progressGoal, setProgressGoal] = useState<GoalView | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<GoalView | null>(null);
  const [goalToShare, setGoalToShare] = useState<GoalView | null>(null);
  const [trophyOpen, setTrophyOpen] = useState(false);
  const [trophyPrefill, setTrophyPrefill] = useState<{ title: string; description?: string } | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Skrót „+” prowadzi tu z ?add=1 i od razu otwiera formularz.
  useEffect(() => {
    if (searchParams.get('add') !== '1') return;
    setEditing(null);
    setFormOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Osiągnięcia odblokowane poza tym ekranem (np. przez pomiar albo bieg) czekają tu na pokazanie.
  const unseen = overview?.unseen;
  useEffect(() => {
    if (!unseen || unseen.length === 0) return;
    setCelebration(current =>
      current ?? {
        title:
          unseen.length === 1
            ? 'Nowe osiągnięcie!'
            : `${unseen.length} ${pluralForm(unseen.length, 'nowe osiągnięcie', 'nowe osiągnięcia', 'nowych osiągnięć')}!`,
        unlocked: unseen,
      }
    );
    void markSeen().catch(() => undefined);
  }, [unseen, markSeen]);

  const openCreate = () => {
    haptic('tap');
    setEditing(null);
    setFormOpen(true);
  };

  const handleComplete = async (goal: GoalView) => {
    setCompletingId(goal.id);
    try {
      const result = await completeGoal(goal.id);
      setCelebration({
        title: 'Cel osiągnięty!',
        description:
          result.points > 0
            ? `„${goal.title}” — brawo! Razem +${result.points + result.newAchievements.reduce((sum, a) => sum + a.pointsAwarded, 0)} XP.`
            : `„${goal.title}” — brawo!`,
        points: result.points,
        levelUp: result.levelUp ? result.level : null,
        unlocked: result.newAchievements,
      });
      if (result.newAchievements.length > 0) void markSeen().catch(() => undefined);
    } catch (cause) {
      toast.error(errorMessage(cause, 'Nie udało się zamknąć celu.'));
    } finally {
      setCompletingId(null);
    }
  };

  const handleDelete = async () => {
    if (!goalToDelete) return;
    try {
      await deleteGoal(goalToDelete.id);
      haptic('impact');
      toast.success('Cel usunięty');
    } catch (cause) {
      toast.error(errorMessage(cause, 'Nie udało się usunąć celu.'));
    } finally {
      setGoalToDelete(null);
    }
  };

  if (error && !overview) {
    return (
      <div className="page">
        <EmptyState
          icon={Target}
          title="Nie udało się wczytać celów"
          description="Sprawdź połączenie i spróbuj ponownie."
          action={<Button onClick={() => void refresh()}>Spróbuj ponownie</Button>}
        />
      </div>
    );
  }

  if (isLoading && !overview) {
    return (
      <div className="page space-y-5" aria-busy="true">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!overview) return null;

  const { active, completed } = overview.goals;

  return (
    <div className="page space-y-6">
      <RewardsHero overview={overview} />

      <section>
        <SectionHeader title="Twoje cele" action={<AddButton label="Nowy cel" onClick={openCreate} />} />
        {active.length === 0 ? (
          <EmptyState
            icon={Target}
            title="Nie masz jeszcze celu"
            description="Ustaw cel, a postęp policzy się sam z Twoich treningów."
            action={<Button onClick={openCreate}>Ustaw pierwszy cel</Button>}
          />
        ) : (
          <div className="space-y-2.5">
            {active.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                busy={completingId === goal.id}
                onUpdateProgress={setProgressGoal}
                onComplete={handleComplete}
                onEdit={target => {
                  setEditing(target);
                  setFormOpen(true);
                }}
                onShare={setGoalToShare}
                onDelete={setGoalToDelete}
              />
            ))}
          </div>
        )}
      </section>

      {overview.quests.items.length > 0 && (
        <section>
          <SectionHeader title="Wyzwania tygodnia" />
          <WeeklyQuests quests={overview.quests.items} />
        </section>
      )}

      <section>
        <SectionHeader
          title="Osiągnięcia"
          action={
            <span className="text-sm tabular-nums text-muted-foreground">
              {overview.profile.achievementCount} / {overview.profile.achievementTotal}
            </span>
          }
        />
        <AchievementTracks tracks={overview.tracks} />
      </section>

      {completed.length > 0 && (
        <section>
          <SectionHeader title="Osiągnięte cele" />
          <CompletedGoals
            goals={completed}
            onMakeTrophy={goal => {
              setTrophyPrefill({
                title: goal.title,
                description: `Cel osiągnięty: ${goal.target.toLocaleString('pl-PL')} ${goal.unit}.`,
              });
              setTrophyOpen(true);
            }}
          />
        </section>
      )}

      <section>
        <SectionHeader
          title="Trofea"
          action={
            <AddButton
              label="Dodaj"
              onClick={() => {
                haptic('tap');
                setTrophyPrefill(null);
                setTrophyOpen(true);
              }}
            />
          }
        />
        {trophies && trophies.length > 0 ? (
          <TrophyGallery achievements={trophies} />
        ) : (
          <EmptyState
            icon={Trophy}
            title="Galeria czeka na pierwsze trofeum"
            description="Dodaj zdjęcie z zawodów, rekordu albo przemiany — własną pamiątkę."
          />
        )}
      </section>

      <GoalFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        goal={editing}
        onCreate={async input => {
          await createGoal(input);
          toast.success('Cel ustawiony');
        }}
        onUpdate={async (id, input) => {
          await updateGoal(id, input);
          toast.success('Cel zapisany');
        }}
      />

      <GoalProgressSheet goal={progressGoal} onClose={() => setProgressGoal(null)} onSave={(goal, current) => updateGoal(goal.id, { current })} />

      {user && (
        <AddTrophySheet
          open={trophyOpen}
          onOpenChange={setTrophyOpen}
          ownerId={user.uid}
          prefill={trophyPrefill}
          onSaved={() => {
            toast.success('Trofeum dodane');
            refetchTrophies();
          }}
        />
      )}

      {/* Obrazek do udostępnienia potrzebuje terminu jako tekstu; brak terminu po prostu go pomija. */}
      <ShareGoalDialog
        goal={goalToShare ? ({ ...goalToShare, deadline: goalToShare.deadline ?? '' } as Goal) : null}
        onClose={() => setGoalToShare(null)}
      />

      <AlertDialog open={goalToDelete !== null} onOpenChange={open => !open && setGoalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć ten cel?</AlertDialogTitle>
            <AlertDialogDescription>
              „{goalToDelete?.title}” zniknie razem z historią postępu. Tego nie da się cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Usuń cel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RewardCelebration celebration={celebration} onClose={() => setCelebration(null)} />
    </div>
  );
}
