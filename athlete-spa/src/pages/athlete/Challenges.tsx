import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Footprints, Plus, Trophy, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/section';
import { useUser } from '@/lib/db-hooks';
import { useFriends } from '@/lib/friends';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import {
  challengeBucket,
  challengeResult,
  useChallenges,
  type ChallengeBucket,
  type ChallengeView,
} from '@/lib/challenges';
import { ChallengeCard } from '@/components/challenges/ChallengeCard';
import { ChallengeSheet } from '@/components/challenges/ChallengeSheet';

const HISTORY_PREVIEW = 5;

interface SheetState {
  open: boolean;
  friendId?: string | null;
  targetKm?: number;
}

export default function ChallengesPage() {
  const { user } = useUser();
  const myId = user?.uid ?? '';
  const { data: challenges, isLoading, error, mutate } = useChallenges(Boolean(user));
  const { data: friendsData } = useFriends(Boolean(user));
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAllHistory, setShowAllHistory] = useState(false);

  // `?friend=<id>` (from a friend's row or a rematch link) opens the sheet with that friend.
  const friendParam = searchParams.get('friend');
  const [sheet, setSheet] = useState<SheetState>(() => ({ open: Boolean(friendParam), friendId: friendParam }));

  const openSheet = (friendId?: string | null, targetKm?: number) => {
    haptic('tap');
    setSheet({ open: true, friendId, targetKm });
  };

  const closeSheet = (open: boolean) => {
    setSheet(s => ({ ...s, open }));
    if (!open && friendParam) setSearchParams({}, { replace: true });
  };

  const groups = useMemo(() => {
    const byBucket: Record<ChallengeBucket, ChallengeView[]> = { invite: [], sent: [], active: [], finished: [], closed: [] };
    for (const c of challenges ?? []) byBucket[challengeBucket(c, myId)].push(c);
    // Races ending soonest first; history newest first.
    byBucket.active.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    const history = [...byBucket.finished, ...byBucket.closed].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return { ...byBucket, history };
  }, [challenges, myId]);

  const record = useMemo(() => {
    const tally = { win: 0, loss: 0, draw: 0 };
    for (const c of groups.finished) {
      const result = challengeResult(c, myId);
      if (result) tally[result] += 1;
    }
    return tally;
  }, [groups.finished, myId]);

  const hasFriends = (friendsData?.friends.length ?? 0) > 0;
  const total = challenges?.length ?? 0;
  const history = showAllHistory ? groups.history : groups.history.slice(0, HISTORY_PREVIEW);
  const card = (c: ChallengeView) => (
    <ChallengeCard key={c.id} challenge={c} myId={myId} onRematch={(friendId, km) => openSheet(friendId, km)} />
  );

  return (
    <div className="page space-y-5">
      <section className="grid grid-cols-[1fr_auto] gap-2.5">
        <button
          type="button"
          onClick={() => openSheet()}
          className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-lime p-4 text-left text-lime-foreground transition-transform active:scale-[0.98]"
        >
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold opacity-75">Wyścig ze znajomym</span>
            <span className="mt-0.5 block font-display text-[2.25rem] font-bold uppercase leading-none">Wyzwij</span>
          </span>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lime-foreground text-lime">
            <Plus className="h-5 w-5" />
          </span>
        </button>
        <div
          className="flex w-[6.5rem] flex-col justify-center rounded-2xl bg-card px-3 text-center"
          aria-label={`Bilans: ${record.win} wygranych, ${record.draw} remisów, ${record.loss} przegranych`}
        >
          <Trophy className="mx-auto h-4 w-4 text-food" />
          <p className="mt-1 font-display text-[1.75rem] font-bold leading-none tabular-nums">
            {record.win}
            <span className="text-muted-foreground">–</span>
            {record.draw}
            <span className="text-muted-foreground">–</span>
            {record.loss}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">W – R – P</p>
        </div>
      </section>

      {error && !challenges ? (
        <EmptyState
          icon={Footprints}
          title="Nie udało się wczytać wyzwań"
          action={
            <Button size="sm" variant="outline" onClick={() => mutate()}>
              Spróbuj ponownie
            </Button>
          }
        />
      ) : isLoading && !challenges ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={Footprints}
          title="Żadnych wyzwań… jeszcze"
          description={
            hasFriends
              ? 'Wybierz znajomego, dystans i termin. Kto pierwszy dobiegnie do celu, ten wygrywa — i zgarnia FitCoiny.'
              : 'Wyzwania wysyła się znajomym. Dodaj kogoś, z kim chcesz się ścigać.'
          }
          action={
            hasFriends ? (
              <Button size="sm" onClick={() => openSheet()}>
                Rzuć pierwsze wyzwanie
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/athlete/social?tab=people">
                  <UserPlus />
                  Znajdź znajomych
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <Group title="Zaproszenia" items={groups.invite} accent>
            {groups.invite.map(card)}
          </Group>
          <Group title="Trwające" items={groups.active}>
            {groups.active.map(card)}
          </Group>
          <Group title="Czekają na odpowiedź" items={groups.sent}>
            {groups.sent.map(card)}
          </Group>
          <Group title="Historia" items={groups.history}>
            {history.map(card)}
          </Group>
          {!showAllHistory && groups.history.length > HISTORY_PREVIEW && (
            <Button variant="ghost" className="-mt-2 w-full" onClick={() => setShowAllHistory(true)}>
              Pokaż całą historię ({groups.history.length})
            </Button>
          )}
        </>
      )}

      <section className="rounded-2xl bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1 text-sm font-semibold text-foreground">Zasady</p>
        Wyścig startuje, gdy znajomy przyjmie wyzwanie. Liczą się biegi zapisane w aplikacji i zsynchronizowane ze
        Stravy (ten sam bieg z obu źródeł liczy się raz). Wygrywa ten, kto pierwszy przebiegnie zadany dystans. Jeśli do
        terminu nikt nie dobiegnie do celu, wygrywa ten, kto przebiegł więcej. Zwycięzca dostaje FitCoiny.
      </section>

      <ChallengeSheet
        open={sheet.open}
        onOpenChange={closeSheet}
        friendId={sheet.friendId}
        targetKm={sheet.targetKm}
      />
    </div>
  );
}

function Group({
  title,
  items,
  accent,
  children,
}: {
  title: string;
  items: ChallengeView[];
  accent?: boolean;
  children: ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-2.5 flex items-baseline gap-2 px-1">
        <h2 className={cn('text-[15px] font-semibold', accent && 'text-primary')}>{title}</h2>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{items.length}</span>
      </div>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}
