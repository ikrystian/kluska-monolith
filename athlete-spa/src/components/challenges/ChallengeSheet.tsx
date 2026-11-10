import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { addDays, differenceInCalendarDays, format, isValid, parseISO, startOfToday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Footprints, Loader2, Send, UserPlus } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { useUser } from '@/lib/db-hooks';
import { useFriends } from '@/lib/friends';
import { SocialAvatar, socialName } from '@/components/social/SocialAvatar';
import {
  CHALLENGE_LIMITS,
  formatChallengeKm,
  useChallengeActions,
  useChallenges,
  type ChallengeView,
} from '@/lib/challenges';

const KM_PRESETS = [5, 10, 21.1, 42.2, 50, 100];
const DURATION_PRESETS = [
  { days: 7, label: 'Tydzień' },
  { days: 14, label: '2 tyg.' },
  { days: 30, label: 'Miesiąc' },
] as const;

type Duration = (typeof DURATION_PRESETS)[number]['days'] | 'custom';

const DEFAULT_KM = 10;
const DEFAULT_DAYS = 14;

interface ChallengeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Friend to preselect (rematch, "challenge" from their row). */
  friendId?: string | null;
  targetKm?: number;
  onCreated?: (challenge: ChallengeView) => void;
}

const isoDay = (date: Date) => format(date, 'yyyy-MM-dd');

/** Bottom sheet for challenging a friend to a race to N km. */
export function ChallengeSheet({ open, onOpenChange, friendId, targetKm, onCreated }: ChallengeSheetProps) {
  const { user } = useUser();
  const { data: friendsData, isLoading: friendsLoading } = useFriends(open);
  const { data: challenges } = useChallenges(open);
  const { create, pendingKey } = useChallengeActions();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [km, setKm] = useState(String(DEFAULT_KM));
  const [duration, setDuration] = useState<Duration>(DEFAULT_DAYS);
  const [customDay, setCustomDay] = useState(isoDay(addDays(startOfToday(), DEFAULT_DAYS)));
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelectedId(friendId ?? null);
    setKm(String(targetKm ?? DEFAULT_KM));
    setDuration(DEFAULT_DAYS);
    setCustomDay(isoDay(addDays(startOfToday(), DEFAULT_DAYS)));
    setMessage('');
  }, [open, friendId, targetKm]);

  const friends = useMemo(() => friendsData?.friends.map(f => f.user) ?? [], [friendsData]);

  // Friends already in an open challenge with me can't get a second one.
  const busyWith = useMemo(() => {
    const ids = new Set<string>();
    for (const c of challenges ?? []) {
      if (c.status === 'pending' || c.status === 'accepted') {
        ids.add(c.challengerId === user?.uid ? c.challengedId : c.challengerId);
      }
    }
    return ids;
  }, [challenges, user?.uid]);

  // The preselected friend first, so a rematch doesn't hide them off-screen.
  const orderedFriends = useMemo(
    () => [...friends].sort((a, b) => Number(b.userId === friendId) - Number(a.userId === friendId)),
    [friends, friendId]
  );

  const selected = friends.find(f => f.userId === selectedId) ?? null;
  const today = startOfToday();
  const maxDay = addDays(today, CHALLENGE_LIMITS.maxDays);
  const lastDay = duration === 'custom' ? parseISO(customDay) : addDays(today, duration);
  const kmValue = Number(km.replace(',', '.'));

  const errors = {
    friend: !selected ? 'Wybierz znajomego.' : busyWith.has(selected.userId) ? 'Macie już otwarte wyzwanie.' : null,
    km:
      !Number.isFinite(kmValue) || kmValue < CHALLENGE_LIMITS.minKm || kmValue > CHALLENGE_LIMITS.maxKm
        ? `Od ${CHALLENGE_LIMITS.minKm} do ${CHALLENGE_LIMITS.maxKm} km.`
        : null,
    day:
      !isValid(lastDay) || lastDay < today
        ? 'Wybierz dzień od dziś.'
        : lastDay > maxDay
          ? `Najwyżej ${CHALLENGE_LIMITS.maxDays} dni.`
          : null,
  };
  const canSubmit = !errors.friend && !errors.km && !errors.day && message.length <= CHALLENGE_LIMITS.messageMaxLength;
  const isSubmitting = pendingKey === 'create';

  const daysToRun = isValid(lastDay) ? differenceInCalendarDays(lastDay, today) + 1 : 0;
  const perDay = daysToRun > 0 && !errors.km ? kmValue / daysToRun : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selected) {
      haptic('warning');
      return;
    }
    const created = await create(
      { challengedId: selected.userId, targetKm: kmValue, lastDay, message },
      socialName(selected)
    );
    if (created) {
      onOpenChange(false);
      onCreated?.(created);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="mb-5 text-left">
          <SheetTitle className="flex items-center gap-2 font-headline text-xl">
            <Footprints className="h-5 w-5 text-volt" />
            Rzuć wyzwanie
          </SheetTitle>
          <SheetDescription>
            Wyścig do celu: wygrywa ten, kto pierwszy przebiegnie zadany dystans. Liczą się biegi z aplikacji i ze Stravy.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Friend */}
          <fieldset>
            <legend className="mb-2.5 text-sm font-semibold">Z kim?</legend>
            {friendsLoading && !friendsData ? (
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-14 rounded-full" />
                ))}
              </div>
            ) : friends.length === 0 ? (
              <div className="rounded-2xl bg-secondary/60 p-4 text-center">
                <p className="text-sm text-muted-foreground">Wyzwania wysyła się znajomym. Dodaj kogoś, z kim chcesz się ścigać.</p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link to="/athlete/social?tab=people" onClick={() => onOpenChange(false)}>
                    <UserPlus />
                    Znajdź znajomych
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Znajomy">
                {orderedFriends.map(friend => {
                  const isSelected = friend.userId === selectedId;
                  const isBusy = busyWith.has(friend.userId);
                  return (
                    <li key={friend.userId} className="shrink-0">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={isBusy}
                        onClick={() => {
                          haptic('tap');
                          setSelectedId(friend.userId);
                        }}
                        className="flex w-16 flex-col items-center gap-1.5 transition-transform enabled:active:scale-95 disabled:opacity-45"
                      >
                        <span
                          className={cn(
                            'rounded-full p-[2.5px] transition-colors',
                            isSelected ? 'bg-volt' : 'bg-transparent'
                          )}
                        >
                          <SocialAvatar user={friend} className="h-12 w-12 border-2 border-background" />
                        </span>
                        <span className={cn('w-full truncate text-center text-xs', isSelected ? 'font-bold' : 'font-medium')}>
                          {friend.displayName}
                        </span>
                        {isBusy && <span className="-mt-1 text-[10px] font-semibold text-muted-foreground">w trakcie</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>

          {/* Distance */}
          <div>
            <label htmlFor="challenge-km" className="mb-2.5 block text-sm font-semibold">
              Dystans do przebiegnięcia
            </label>
            <div className="relative">
              <Input
                id="challenge-km"
                type="number"
                inputMode="decimal"
                min={CHALLENGE_LIMITS.minKm}
                max={CHALLENGE_LIMITS.maxKm}
                step="0.1"
                value={km}
                onChange={e => setKm(e.target.value)}
                className="h-14 rounded-xl pr-12 font-display text-4xl font-bold tabular-nums"
                aria-invalid={Boolean(errors.km)}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                km
              </span>
            </div>
            <div className="no-scrollbar -mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5">
              {KM_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setKm(String(preset))}
                  className={cn(
                    'h-8 shrink-0 rounded-full px-3.5 text-sm font-semibold tabular-nums transition-colors',
                    kmValue === preset ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {formatChallengeKm(preset)}
                  {preset === 21.1 ? ' · pół' : preset === 42.2 ? ' · maraton' : ''}
                </button>
              ))}
            </div>
            {errors.km && km !== '' && <p className="mt-1.5 text-sm font-medium text-destructive">{errors.km}</p>}
          </div>

          {/* Deadline */}
          <div>
            <p className="mb-2.5 text-sm font-semibold">Ile czasu?</p>
            <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Czas trwania">
              {[...DURATION_PRESETS, { days: 'custom' as const, label: 'Data' }].map(option => (
                <button
                  key={option.days}
                  type="button"
                  role="radio"
                  aria-checked={duration === option.days}
                  onClick={() => setDuration(option.days)}
                  className={cn(
                    'h-10 rounded-xl text-sm font-semibold transition-colors',
                    duration === option.days ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {duration === 'custom' && (
              <Input
                type="date"
                value={customDay}
                min={isoDay(today)}
                max={isoDay(maxDay)}
                onChange={e => setCustomDay(e.target.value)}
                className="mt-2.5 h-12 rounded-xl"
                aria-label="Ostatni dzień wyzwania"
              />
            )}
            {errors.day ? (
              <p className="mt-1.5 text-sm font-medium text-destructive">{errors.day}</p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Koniec: {format(lastDay, 'EEEE, d MMMM', { locale: pl })}, o północy
                {perDay !== null && ` · ok. ${formatChallengeKm(perDay)} km dziennie`}
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <label htmlFor="challenge-message" className="mb-2.5 flex items-baseline justify-between text-sm font-semibold">
              Wiadomość <span className="text-xs font-normal text-muted-foreground">opcjonalnie</span>
            </label>
            <Textarea
              id="challenge-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={CHALLENGE_LIMITS.messageMaxLength}
              rows={2}
              placeholder="Np. przegrany stawia kawę ☕"
              className="resize-none rounded-xl"
            />
            {message.length > CHALLENGE_LIMITS.messageMaxLength - 30 && (
              <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
                {CHALLENGE_LIMITS.messageMaxLength - message.length}
              </p>
            )}
          </div>

          <div className="space-y-2">
            {selected && !errors.km && !errors.day && (
              <p className="text-center text-sm text-muted-foreground">
                Ty vs <span className="font-semibold text-foreground">{socialName(selected)}</span> — kto pierwszy{' '}
                <span className="font-semibold text-foreground">{formatChallengeKm(kmValue)} km</span>?
              </p>
            )}
            {errors.friend && selected && <p className="text-center text-sm font-medium text-destructive">{errors.friend}</p>}
            <Button type="submit" size="lg" variant="volt" className="w-full" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
              Wyślij wyzwanie
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
