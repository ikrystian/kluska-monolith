import { Link, Outlet } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCollection, useUser } from '@/lib/db-hooks';
import type { WorkoutLog } from '@/lib/types';

function workoutsLabel(count: number): string {
  if (count === 1) return '1 trening';
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    return `${count} treningi`;
  }
  return `${count} treningów`;
}

/**
 * Layout route guard for features that need a full account (trainer chat,
 * check-ins, social). Guests get an upgrade prompt instead of the page;
 * registering keeps all data created on this device.
 *
 * The prompt leads with what the guest has already built (endowment effect)
 * and frames registration as keeping it, not as a paywall.
 */
export function RequireFullAccount() {
  const { user } = useUser();
  const isGuest = Boolean(user?.isGuest);

  const { data: workoutLogs } = useCollection<WorkoutLog>(
    isGuest && user?.uid ? 'workoutLogs' : null,
    isGuest && user?.uid ? { athleteId: user.uid } : undefined,
    { limit: 50 }
  );

  if (!user?.isGuest) {
    return <Outlet />;
  }

  const workoutCount = workoutLogs?.length ?? 0;
  const hasProgress = workoutCount > 0;

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="hero-ember texture-grain grid h-14 w-14 place-items-center rounded-2xl shadow-glow">
        <UserPlus className="h-6 w-6 text-white" />
      </span>
      <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">
        {hasProgress ? 'Nie zostawiaj swoich postępów' : 'Ta funkcja wymaga konta'}
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hasProgress ? (
          <>
            Masz już{' '}
            <span className="font-semibold text-foreground">
              {workoutsLabel(workoutCount)}
            </span>{' '}
            zapisane na tym urządzeniu. Załóż darmowe konto, aby odblokować tę funkcję —
            wszystko, co zbudowałeś, zostaje z Tobą.
          </>
        ) : (
          <>
            Korzystasz z aplikacji jako gość. Załóż darmowe konto, aby odblokować tę funkcję —
            wszystkie dotychczasowe dane z tego urządzenia zostaną zachowane.
          </>
        )}
      </p>
      <Button asChild className="h-12 rounded-2xl px-8 text-base font-bold shadow-glow">
        <Link to="/register">
          {hasProgress ? 'Zachowaj postępy i odblokuj' : 'Załóż konto'}
        </Link>
      </Button>
    </div>
  );
}
