import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, MapPin, Search, Users } from 'lucide-react';
import { useCollection, useDoc, useUser } from '@/lib/db-hooks';
import type { UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';
import { resolveMediaUrl } from '@/lib/api-client';
import { AVAILABILITY, MODE_LABEL, publishedCard } from '@/components/trainers/trainer-meta';

function TrainerCard({ trainer }: { trainer: UserProfile }) {
  const card = publishedCard(trainer);
  const cover = resolveMediaUrl(card?.coverImageUrl);
  const availability = card?.availability ? AVAILABILITY[card.availability] : undefined;
  const tags = card?.specializations?.slice(0, 2) ?? [];

  return (
    <Link
      to={`/athlete/trainers/${trainer.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card transition-all hover:-translate-y-0.5 active:scale-[0.985]"
    >
      <div className="bg-primary text-primary-foreground relative h-20 overflow-hidden">
        {cover && <img src={cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/30" />
        {availability && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1 text-[11px] font-semibold text-primary-foreground backdrop-blur-md">
            <span className={cn('h-1.5 w-1.5 rounded-full', availability.dot)} />
            {availability.short}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center px-4 pb-5 text-center">
        <TrainerAvatar trainer={trainer} className="-mt-10 h-20 w-20 text-2xl ring-4 ring-card" />
        <h2 className="mt-2 line-clamp-1 font-headline text-lg font-bold">{trainer.name}</h2>
        {card?.headline && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{card.headline}</p>}
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">{trainer.location || 'Lokalizacja nie podana'}</span>
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {tags.length > 0 ? (
            tags.map(t => (
              <span key={t} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {t}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {MODE_LABEL[card?.cooperationMode ?? 'both']}
            </span>
          )}
        </div>

        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-bold text-foreground">
          Zobacz profil
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
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
      .filter(t => !q || t.name.toLowerCase().includes(q) || t.location?.toLowerCase().includes(q) || t.trainerCard?.specializations?.some(s => s.toLowerCase().includes(q)))
      // Trainers with a published profile come first.
      .sort((a, b) => Number(!!publishedCard(b)) - Number(!!publishedCard(a)) || a.name.localeCompare(b.name, 'pl'));
  }, [trainers, query, city, myTrainer?.id]);

  return (
    <div className="page space-y-6">
      {myTrainer && (
        <Link
          to={`/athlete/trainers/${myTrainer.id}`}
          className="bg-primary text-primary-foreground group relative flex items-center gap-4 overflow-hidden rounded-2xl p-5 transition-transform active:scale-[0.98]"
        >
          <TrainerAvatar trainer={myTrainer} className="h-16 w-16 text-xl ring-4 ring-white/30" />
          <div className="relative min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary-foreground/75">Twój trener</p>
            <p className="mt-0.5 truncate font-display text-3xl font-bold uppercase leading-tight">{myTrainer.name}</p>
            {myTrainer.location && <p className="truncate text-xs text-primary-foreground/80">{myTrainer.location}</p>}
          </div>
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-foreground text-primary transition-transform group-hover:scale-105">
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
            placeholder="Szukaj po imieniu, mieście lub specjalizacji…"
            className="h-11 rounded-full border-border/60 bg-card pl-10"
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
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : visible.length > 0 ? (
        <>
          {myTrainer && (
            <h2 className="px-1 text-xs font-semibold text-muted-foreground">Inni trenerzy</h2>
          )}
          <div className="grid grid-cols-2 gap-3">
            {visible.map(t => (
              <TrainerCard key={t.id} trainer={t} />
            ))}
          </div>
        </>
      ) : !myTrainer || query || city ? (
        <div className="rounded-2xl border-2 border-dashed border-border/70 px-6 py-14 text-center">
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
