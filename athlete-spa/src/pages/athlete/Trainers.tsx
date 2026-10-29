import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, MapPin, Search, Users } from 'lucide-react';
import { useCollection, useDoc, useUser } from '@/lib/db-hooks';
import type { UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';

function TrainerCard({ trainer }: { trainer: UserProfile }) {
  return (
    <Link
      to={`/athlete/trainers/${trainer.id}`}
      className="group flex flex-col items-center rounded-[1.75rem] border border-border/60 bg-card p-5 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.985]"
    >
      <TrainerAvatar trainer={trainer} className="h-20 w-20 text-2xl ring-4 ring-background" />
      <h2 className="mt-3 line-clamp-1 font-headline text-lg font-bold">{trainer.name}</h2>
      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="line-clamp-1">{trainer.location || 'Lokalizacja nie podana'}</span>
      </p>
      <span className="mt-3 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
        Siłownia i online
      </span>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-foreground">
        Zobacz profil
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default function AthleteTrainersPage() {
  const { user } = useUser();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState<string | null>(null);

  const { data: me } = useDoc<UserProfile>(user ? 'users' : null, user?.uid || null);
  const { data: trainers, isLoading } = useCollection<UserProfile>('users', { role: 'trainer' });

  const myTrainer = trainers?.find(t => t.id === me?.trainerId);
  const cities = useMemo(
    () => [...new Set((trainers ?? []).map(t => t.location?.trim()).filter((l): l is string => !!l))].sort((a, b) => a.localeCompare(b, 'pl')),
    [trainers]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (trainers ?? [])
      .filter(t => t.id !== myTrainer?.id)
      .filter(t => !city || t.location?.trim() === city)
      .filter(t => !q || t.name.toLowerCase().includes(q) || t.location?.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [trainers, query, city, myTrainer?.id]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-28 pt-5 md:px-6 md:pt-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Trener osobisty</p>
        <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">Znajdź trenera</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan szyty na miarę, korekta techniki i stały kontakt z certyfikowanym trenerem.
        </p>
      </header>

      {myTrainer && (
        <Link
          to={`/athlete/trainers/${myTrainer.id}`}
          className="hero-ember texture-grain group relative flex items-center gap-4 overflow-hidden rounded-[1.75rem] p-5 text-white shadow-glow transition-transform active:scale-[0.98]"
        >
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[1.1rem] border-white/10" />
          <TrainerAvatar trainer={myTrainer} className="h-16 w-16 text-xl ring-4 ring-white/30" />
          <div className="relative min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/75">Twój trener</p>
            <p className="mt-0.5 truncate font-display text-xl font-extrabold uppercase leading-tight">{myTrainer.name}</p>
            {myTrainer.location && <p className="truncate text-xs text-white/80">{myTrainer.location}</p>}
          </div>
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-primary shadow-lg transition-transform group-hover:scale-105">
            <ArrowRight className="h-5 w-5" />
          </span>
        </Link>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Szukaj po imieniu lub mieście…"
            className="h-11 rounded-full border-border/60 bg-card pl-10 shadow-soft"
          />
        </div>
        {cities.length > 1 && (
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[null, ...cities].map(c => (
              <button
                key={c ?? 'all'}
                type="button"
                onClick={() => setCity(c)}
                aria-pressed={city === c}
                className={cn(
                  'shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                  city === c ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                {c ?? 'Wszyscy'}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-[1.75rem]" />
          ))}
        </div>
      ) : visible.length > 0 ? (
        <>
          {myTrainer && (
            <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Inni trenerzy</h2>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {visible.map(t => (
              <TrainerCard key={t.id} trainer={t} />
            ))}
          </div>
        </>
      ) : !myTrainer || query || city ? (
        <div className="rounded-[1.75rem] border-2 border-dashed border-border/70 px-6 py-14 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary">
            <Users className="h-6 w-6 text-muted-foreground" />
          </span>
          <h2 className="mt-4 font-headline text-lg font-bold">
            {query || city ? 'Nic nie znaleziono' : 'Brak dostępnych trenerów'}
          </h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            {query || city ? 'Zmień frazę lub miasto.' : 'Obecnie nie ma zarejestrowanych trenerów w systemie.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
