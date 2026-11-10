import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  ChevronRight,
  Flame,
  Globe,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useCollection, useDoc, useUser } from '@/lib/db-hooks';
import type { UserProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';
import { resolveMediaUrl } from '@/lib/api-client';
import { AVAILABILITY, MODE_LABEL, plural, publishedCard } from '@/components/trainers/trainer-meta';

const LEAD_TRAINER_ID = '6a5cf516f9fe894c859bb9af';

function TrainerCard({ trainer }: { trainer: UserProfile }) {
  const card = publishedCard(trainer);
  const cover = resolveMediaUrl(card?.coverImageUrl);
  const availability = card?.availability ? AVAILABILITY[card.availability] : undefined;
  const tags = card?.specializations?.slice(0, 3) ?? [];
  const mode = card?.cooperationMode ? MODE_LABEL[card.cooperationMode] : null;
  const isLead = trainer.id === LEAD_TRAINER_ID;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/90 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      {/* Cover Banner */}
      <div className="relative h-28 w-full overflow-hidden bg-secondary">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/25 via-secondary to-muted" />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

        {/* Top Badges */}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          {isLead ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow-sm">
              <Sparkles className="h-3 w-3" /> Polecany
            </span>
          ) : card?.experienceYears ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/95 backdrop-blur-md">
              <Award className="h-3 w-3 text-amber-400" />
              {card.experienceYears} {plural(card.experienceYears, 'rok', 'lata', 'lat')} dośw.
            </span>
          ) : (
            <span />
          )}

          {availability && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                {availability.ping && (
                  <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', availability.dot)} />
                )}
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', availability.dot)} />
              </span>
              {availability.short}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 pt-0">
        {/* Avatar + Quick chat header */}
        <div className="relative -mt-9 flex items-end justify-between">
          <div className="relative">
            <TrainerAvatar trainer={trainer} className="h-20 w-20 text-2xl ring-4 ring-card shadow-sm" />
            <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-volt text-[10px] font-black text-background ring-2 ring-card">
              ✓
            </span>
          </div>

          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 rounded-full border-primary/20 bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Link to={`/athlete/chat?userId=${trainer.id}`} onClick={() => haptic('tap')}>
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Czat
            </Link>
          </Button>
        </div>

        {/* Name & Headline */}
        <div className="mt-2.5">
          <div className="flex items-center gap-1.5">
            <Link
              to={`/athlete/trainers/${trainer.id}`}
              onClick={() => haptic('tap')}
              className="line-clamp-1 font-headline text-lg font-bold text-foreground transition-colors hover:text-primary"
            >
              {trainer.name}
            </Link>
            <ShieldCheck className="h-4 w-4 shrink-0 text-volt" />
          </div>
          {card?.headline && (
            <p className="mt-0.5 line-clamp-1 text-xs font-medium text-muted-foreground">
              {card.headline}
            </p>
          )}
        </div>

        {/* Location & Mode */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {trainer.location && (
            <span className="inline-flex items-center gap-1 font-medium">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="line-clamp-1">{trainer.location}</span>
            </span>
          )}
          {mode && (
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{mode}</span>
            </span>
          )}
        </div>

        {/* Specialization Tags */}
        {tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span
                key={t}
                className="rounded-lg bg-secondary/80 px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Bio snippet */}
        {card?.bio && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {card.bio}
          </p>
        )}

        {/* Card Actions */}
        <div className="mt-auto pt-4 flex items-center gap-2 border-t border-border/50">
          <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl text-xs h-9 font-medium">
            <Link to={`/athlete/trainers/${trainer.id}`} onClick={() => haptic('tap')}>
              Profil
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1 rounded-xl text-xs h-9 font-semibold">
            <Link to={`/athlete/chat?userId=${trainer.id}`} onClick={() => haptic('tap')}>
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              Napisz
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function AthleteTrainersPage() {
  const { user } = useUser();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<'all' | 'online' | 'gym'>('all');
  const [onlyOpen, setOnlyOpen] = useState(false);

  const { data: me } = useDoc<UserProfile>(user ? 'users' : null, user?.uid || null);
  const { data: trainers, isLoading } = useCollection<UserProfile>('users', { role: 'trainer' });

  const myTrainer = trainers?.find(t => t.id === me?.trainerId);
  const leadTrainer = trainers?.find(t => t.id === LEAD_TRAINER_ID && t.id !== myTrainer?.id);

  const cities = useMemo(
    () =>
      [...new Set((trainers ?? []).map(t => t.location?.trim()).filter((l): l is string => !!l))].sort((a, b) =>
        a.localeCompare(b, 'pl')
      ),
    [trainers]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (trainers ?? [])
      .filter(t => t.id !== myTrainer?.id)
      .filter(t => !city || t.location?.trim() === city)
      .filter(t => {
        if (!onlyOpen) return true;
        const card = publishedCard(t);
        return card?.availability === 'open' || card?.availability === 'limited';
      })
      .filter(t => {
        if (modeFilter === 'all') return true;
        const card = publishedCard(t);
        const m = card?.cooperationMode ?? 'both';
        if (modeFilter === 'online') return m === 'online' || m === 'both';
        if (modeFilter === 'gym') return m === 'gym' || m === 'both';
        return true;
      })
      .filter(
        t =>
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.location?.toLowerCase().includes(q) ||
          t.trainerCard?.headline?.toLowerCase().includes(q) ||
          t.trainerCard?.bio?.toLowerCase().includes(q) ||
          t.trainerCard?.specializations?.some(s => s.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        // Lead trainer comes first among published trainers
        if (a.id === LEAD_TRAINER_ID) return -1;
        if (b.id === LEAD_TRAINER_ID) return 1;
        return Number(!!publishedCard(b)) - Number(!!publishedCard(a)) || a.name.localeCompare(b.name, 'pl');
      });
  }, [trainers, query, city, onlyOpen, modeFilter, myTrainer?.id]);

  const hasActiveFilters = !!query || !!city || onlyOpen || modeFilter !== 'all';

  const resetFilters = () => {
    setQuery('');
    setCity(null);
    setOnlyOpen(false);
    setModeFilter('all');
    haptic('tap');
  };

  return (
    <div className="page space-y-6 pb-20">
      {/* Page Header */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Users className="h-3.5 w-3.5" /> Baza Trenerów
          </div>
          {trainers && (
            <span className="text-xs font-semibold text-muted-foreground">
              {trainers.length} {plural(trainers.length, 'specjalista', 'specjalistów', 'specjalistów')}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Certyfikowani trenerzy personalni, którzy dopasują plan, dietę i technikę do Twoich celów.
        </p>
      </header>

      {/* Twój trener Spotlight */}
      {myTrainer && (
        <section aria-label="Twój trener">
          <div className="relative overflow-hidden rounded-3xl border border-volt/30 bg-gradient-to-br from-card via-card to-volt/5 p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <TrainerAvatar trainer={myTrainer} className="h-16 w-16 text-xl ring-3 ring-volt/40 shadow-sm" />
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-volt text-[10px] font-black text-background ring-2 ring-card">
                    ✓
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 rounded-full bg-volt/15 px-2.5 py-0.5 text-[11px] font-bold text-volt">
                    <ShieldCheck className="h-3 w-3" /> Twój trener prowadzący
                  </span>
                  <h2 className="mt-1 truncate font-display text-2xl font-bold uppercase leading-tight text-foreground">
                    {myTrainer.name}
                  </h2>
                  {myTrainer.location && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-primary" /> {myTrainer.location}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" className="flex-1 rounded-xl h-10 font-semibold">
                <Link to={`/athlete/chat?userId=${myTrainer.id}`} onClick={() => haptic('tap')}>
                  <MessageSquare className="mr-1.5 h-4 w-4" /> Napisz na czacie
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl h-10 font-medium">
                <Link to={`/athlete/trainers/${myTrainer.id}`} onClick={() => haptic('tap')}>
                  Zobacz profil
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Featured Lead Coach Spotlight (when user doesn't have an assigned coach) */}
      {!myTrainer && leadTrainer && !hasActiveFilters && (
        <section aria-label="Wyróżniony trener">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                <Flame className="h-3.5 w-3.5" /> Polecany Trener Główny
              </span>
              <span className="text-[11px] font-bold text-volt inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-volt animate-ping" /> Wolne miejsca
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3.5">
              <TrainerAvatar trainer={leadTrainer} className="h-16 w-16 text-xl ring-2 ring-primary/40 shadow-sm" />
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-bold uppercase leading-tight text-foreground">
                  {leadTrainer.name}
                </h2>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {leadTrainer.trainerCard?.headline || 'Specjalista ds. budowy siły i sylwetki'}
                </p>
                {leadTrainer.location && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3 text-primary" /> {leadTrainer.location}
                  </p>
                )}
              </div>
            </div>

            {leadTrainer.trainerCard?.bio && (
              <p className="mt-2.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                {leadTrainer.trainerCard.bio}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <Button asChild size="sm" className="flex-1 rounded-xl h-10 font-semibold">
                <Link to={`/athlete/chat?userId=${leadTrainer.id}`} onClick={() => haptic('tap')}>
                  <MessageSquare className="mr-1.5 h-4 w-4" /> Rozpocznij czat
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1 rounded-xl h-10 font-medium">
                <Link to={`/athlete/trainers/${leadTrainer.id}`} onClick={() => haptic('tap')}>
                  Zobacz profil
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Search & Filter Controls */}
      <section className="space-y-3" aria-label="Wyszukiwanie i filtry">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Szukaj trenera, miasta, specjalizacji…"
            className="h-11 rounded-2xl border-border/70 bg-card pl-10 pr-9 text-sm focus-visible:ring-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode pills */}
          <button
            type="button"
            onClick={() => {
              setModeFilter(modeFilter === 'online' ? 'all' : 'online');
              haptic('tap');
            }}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
              modeFilter === 'online'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            <Globe className="h-3 w-3" /> Online
          </button>

          <button
            type="button"
            onClick={() => {
              setModeFilter(modeFilter === 'gym' ? 'all' : 'gym');
              haptic('tap');
            }}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
              modeFilter === 'gym'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            <MapPin className="h-3 w-3" /> Stacjonarnie
          </button>

          {/* Availability pill */}
          <button
            type="button"
            onClick={() => {
              setOnlyOpen(!onlyOpen);
              haptic('tap');
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
              onlyOpen
                ? 'bg-volt text-background font-bold shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', onlyOpen ? 'bg-background' : 'bg-volt')} />
            Wolne miejsca
          </button>

          {/* Reset button if active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/20 ml-auto"
            >
              <X className="h-3 w-3" /> Wyczyść filtry
            </button>
          )}
        </div>

        {/* City Filter Pills */}
        {cities.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => {
                setCity(null);
                haptic('tap');
              }}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                city === null
                  ? 'bg-foreground text-background'
                  : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
              )}
            >
              Wszystkie miasta
            </button>
            {cities.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCity(city === c ? null : c);
                  haptic('tap');
                }}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  city === c
                    ? 'bg-foreground text-background'
                    : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Trainers Listing */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-border/60 bg-card p-4 space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-3.5 w-3/4" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : visible.length > 0 ? (
        <section className="space-y-3" aria-label="Lista trenerów">
          {myTrainer && (
            <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pozostali trenerzy ({visible.length})
            </h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map(t => (
              <TrainerCard key={t.id} trainer={t} />
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/80 px-6 py-12 text-center bg-card/30">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <Users className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-headline text-lg font-bold text-foreground">
            {hasActiveFilters ? 'Brak wyników wyszukiwania' : 'Brak dostępnych trenerów'}
          </h2>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            {hasActiveFilters
              ? 'Nie znaleziono trenera spełniającego wybrane kryteria. Spróbuj zmienić filtry lub wyszukiwaną frazę.'
              : 'W systemie nie ma obecnie zarejestrowanych profili trenerskich.'}
          </p>
          {hasActiveFilters && (
            <Button onClick={resetFilters} variant="outline" size="sm" className="mt-4 rounded-xl">
              Zresetuj wszystkie filtry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}