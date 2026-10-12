import { useMemo, useState } from 'react';
import { MapPin, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAthletes } from '@/lib/friends';
import { FriendButton } from './FriendButton';
import { SocialAvatar, socialName } from './SocialAvatar';

interface NearbyAthletesProps {
  onProfileClick: (userId: string) => void;
}

export function NearbyAthletes({ onProfileClick }: NearbyAthletesProps) {
  const { data: athletes, error, isLoading, mutate } = useAthletes();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pl');
    if (!athletes || !term) return athletes ?? [];
    return athletes.filter(a =>
      [a.displayName, a.nickname, a.location].some(v => v?.toLocaleLowerCase('pl').includes(term))
    );
  }, [athletes, search]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-headline text-xl font-bold tracking-tight">Użytkownicy w Twojej okolicy</h2>
        <p className="text-sm text-muted-foreground">Zaproś innych sportowców do znajomych i śledź ich aktywność.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj po nicku lub mieście"
          aria-label="Szukaj sportowców"
          className="pl-9"
        />
      </div>

      {error ? (
        <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Nie udało się wczytać listy sportowców.</p>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            Spróbuj ponownie
          </Button>
        </div>
      ) : isLoading && !athletes ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.25rem] w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
            <Users className="h-7 w-7" />
          </span>
          <p className="text-sm text-muted-foreground">
            {search ? 'Nikt nie pasuje do wyszukiwania.' : 'Nie ma jeszcze innych sportowców.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map(athlete => (
            <li
              key={athlete.userId}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft"
            >
              <button
                type="button"
                disabled={!athlete.nickname}
                onClick={() => onProfileClick(athlete.userId)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity enabled:hover:opacity-80"
                aria-label={athlete.nickname ? `Zobacz profil ${socialName(athlete)}` : undefined}
              >
                <SocialAvatar user={athlete} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{socialName(athlete)}</p>
                  <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    {athlete.location && (
                      <span className="flex min-w-0 items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{athlete.location}</span>
                      </span>
                    )}
                    {athlete.sameArea && (
                      <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                        Blisko Ciebie
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
              <FriendButton athlete={athlete} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
