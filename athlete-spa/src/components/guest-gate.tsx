import { Link, Outlet } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/db-hooks';

/**
 * Layout route guard for features that need a full account (trainer chat,
 * check-ins, social). Guests get an upgrade prompt instead of the page;
 * registering keeps all data created on this device.
 */
export function RequireFullAccount() {
  const { user } = useUser();

  if (!user?.isGuest) {
    return <Outlet />;
  }

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="hero-ember texture-grain grid h-14 w-14 place-items-center rounded-2xl shadow-glow">
        <UserPlus className="h-6 w-6 text-white" />
      </span>
      <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">
        Ta funkcja wymaga konta
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Korzystasz z aplikacji jako gość. Załóż darmowe konto, aby odblokować tę funkcję —
        wszystkie dotychczasowe dane z tego urządzenia zostaną zachowane.
      </p>
      <Button asChild className="h-12 rounded-2xl px-8 text-base font-bold shadow-glow">
        <Link to="/register">Załóż konto</Link>
      </Button>
    </div>
  );
}
