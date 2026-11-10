import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, Clock, Flag, Footprints, Loader2, Quote, RotateCcw, Target, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/section';
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
import { useUser } from '@/lib/db-hooks';
import { cn } from '@/lib/utils';
import { STRAVA_COLOR } from '@/components/running/RunHistoryList';
import { SocialAvatar, socialName } from '@/components/social/SocialAvatar';
import {
  CLOSED_LABELS,
  challengeBucket,
  challengeResult,
  challengeSides,
  formatChallengeKm,
  kmPerDayNeeded,
  useChallenge,
  useChallengeActions,
  type ChallengeDetail,
  type ChallengeSides,
} from '@/lib/challenges';
import {
  LEAD_TONE_CLASS,
  ME_COLOR,
  OPPONENT_COLOR,
  RaceTrack,
  deadlineLabel,
  leadLine,
  timeLeftLabel,
} from '@/components/challenges/challenge-ui';
import { ChallengeSheet } from '@/components/challenges/ChallengeSheet';

export default function ChallengeDetailPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const { user } = useUser();
  const { data: challenge, isLoading, error, mutate } = useChallenge(challengeId);
  const { respond, isPending } = useChallengeActions();
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [rematchOpen, setRematchOpen] = useState(false);

  if (isLoading && !challenge) {
    return (
      <div className="page space-y-4">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-52 w-full rounded-2xl" />
      </div>
    );
  }

  if (!challenge || !user) {
    return (
      <div className="page">
        <EmptyState
          icon={Footprints}
          title={error ? 'Nie udało się wczytać wyzwania' : 'Nie ma takiego wyzwania'}
          action={
            <div className="flex justify-center gap-2">
              {error && (
                <Button size="sm" variant="outline" onClick={() => mutate()}>
                  Spróbuj ponownie
                </Button>
              )}
              <Button asChild size="sm" variant="secondary">
                <Link to="/athlete/challenges">Wszystkie wyzwania</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const myId = user.uid;
  const sides = challengeSides(challenge, myId);
  const bucket = challengeBucket(challenge, myId);
  const result = challengeResult(challenge, myId);
  const busy = isPending(challenge.id);
  const opponentName = socialName(sides.opponent.user);
  const target = formatChallengeKm(challenge.targetKm);
  const hasRace = bucket === 'active' || bucket === 'finished';

  return (
    <div className="page space-y-4">
      {/* Head to head */}
      <section className="rounded-2xl bg-card p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Runner side={sides.me} label="Ty" color={ME_COLOR} showKm={hasRace} winner={challenge.winnerId === myId} />
          <span className="font-display text-xl font-bold text-muted-foreground">VS</span>
          <Runner
            side={sides.opponent}
            label={opponentName}
            color={OPPONENT_COLOR}
            showKm={hasRace}
            winner={!!challenge.winnerId && challenge.winnerId !== myId}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Target className="h-4 w-4" />
            Cel <span className="font-semibold text-foreground">{target} km</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            do {deadlineLabel(challenge.endDate, 'd MMMM yyyy')}
          </span>
        </div>

        {challenge.message && (
          <p className="mt-4 flex gap-2 rounded-xl bg-secondary/60 px-3 py-2.5 text-sm">
            <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 break-words">
              {challenge.message}
              <span className="mt-0.5 block text-xs text-muted-foreground">— {socialName(challenge.challenger)}</span>
            </span>
          </p>
        )}
      </section>

      {/* Status */}
      {bucket === 'invite' && (
        <section className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <p className="text-[15px] font-semibold">{opponentName} rzuca Ci wyzwanie</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kto pierwszy przebiegnie {target} km? Po przyjęciu liczą się biegi od tej chwili — zostało{' '}
            {timeLeftLabel(challenge.endDate)}.
          </p>
          <div className="mt-4 flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={() => respond(challenge.id, 'accept')}>
              {isPending(challenge.id, 'accept') ? <Loader2 className="animate-spin" /> : <Check />}
              Przyjmuję
            </Button>
            <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => respond(challenge.id, 'decline')}>
              {isPending(challenge.id, 'decline') ? <Loader2 className="animate-spin" /> : <X />}
              Odrzuć
            </Button>
          </div>
        </section>
      )}

      {bucket === 'sent' && (
        <section className="rounded-2xl bg-card p-4">
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Czekamy na odpowiedź {opponentName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Wyścig wystartuje, gdy przyjmie wyzwanie. Bez odpowiedzi wygaśnie {deadlineLabel(challenge.endDate)}.
          </p>
          <Button
            variant="ghost"
            className="mt-2 w-full text-muted-foreground"
            disabled={busy}
            onClick={() => respond(challenge.id, 'cancel')}
          >
            {busy ? <Loader2 className="animate-spin" /> : <X />}
            Wycofaj wyzwanie
          </Button>
        </section>
      )}

      {bucket === 'closed' && (
        <EmptyState
          title={CLOSED_LABELS[challenge.status] ?? 'Zamknięte'}
          description={
            challenge.status === 'declined'
              ? `${socialName(challenge.challenged)} nie podjął(-ęła) wyzwania.`
              : challenge.status === 'cancelled'
                ? 'Wyzwanie wycofano przed startem.'
                : 'Nikt nie odpowiedział przed terminem.'
          }
          action={
            <Button size="sm" variant="secondary" onClick={() => setRematchOpen(true)}>
              <RotateCcw />
              Wyzwij ponownie
            </Button>
          }
        />
      )}

      {bucket === 'finished' && result && <ResultCard challenge={challenge} sides={sides} result={result} onRematch={() => setRematchOpen(true)} />}

      {bucket === 'active' && <LiveCard challenge={challenge} sides={sides} />}

      {hasRace && (
        <section className="rounded-2xl bg-card p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Wyścig</h2>
          <RaceTrack sides={sides} targetKm={challenge.targetKm} />
        </section>
      )}

      {hasRace && <RunsList challenge={challenge} sides={sides} />}

      {bucket === 'active' && (
        <Button variant="ghost" className="w-full text-muted-foreground" disabled={busy} onClick={() => setConfirmForfeit(true)}>
          <Flag />
          Poddaj wyzwanie
        </Button>
      )}

      <AlertDialog open={confirmForfeit} onOpenChange={setConfirmForfeit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poddać wyzwanie?</AlertDialogTitle>
            <AlertDialogDescription>
              {opponentName} wygra walkowerem (bez FitCoinów dla nikogo). Tego nie da się cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Walczę dalej</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void respond(challenge.id, 'forfeit')}
            >
              Poddaję się
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChallengeSheet
        open={rematchOpen}
        onOpenChange={setRematchOpen}
        friendId={sides.opponent.user.userId}
        targetKm={challenge.targetKm}
      />
    </div>
  );
}

/* ---------- Pieces ---------- */

function Runner({
  side,
  label,
  color,
  showKm,
  winner,
}: {
  side: ChallengeSides['me'];
  label: string;
  color: string;
  showKm: boolean;
  winner: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <span className="relative rounded-full p-[3px]" style={{ backgroundColor: color }}>
        <SocialAvatar user={side.user} className="h-16 w-16 border-[3px] border-card" />
        {winner && (
          <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-food text-background ring-2 ring-card">
            <Trophy className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
      <p className="mt-2 w-full truncate text-sm font-semibold">{label}</p>
      {showKm && (
        <p className="font-display text-4xl font-bold leading-none tabular-nums">
          {formatChallengeKm(side.km)}
          <span className="ml-0.5 font-body text-xs font-semibold text-muted-foreground">km</span>
        </p>
      )}
    </div>
  );
}

function LiveCard({ challenge, sides }: { challenge: ChallengeDetail; sides: ChallengeSides }) {
  const lead = leadLine(sides);
  const remaining = Math.max(0, challenge.targetKm - sides.me.km);
  const perDay = kmPerDayNeeded(remaining, challenge.endDate);

  return (
    <section className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground">Do mety</p>
        <p className="mt-1 font-display text-4xl font-bold leading-none tabular-nums">
          {formatChallengeKm(remaining)}
          <span className="ml-1 font-body text-sm font-semibold text-muted-foreground">km</span>
        </p>
        <p className={cn('mt-2 text-xs font-semibold', LEAD_TONE_CLASS[lead.tone])}>{lead.text}</p>
      </div>
      <div className="rounded-2xl bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground">Zostało</p>
        <p className="mt-1 font-display text-4xl font-bold leading-none tabular-nums">{timeLeftLabel(challenge.endDate)}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {perDay !== null ? (
            <>
              Tempo na metę: <span className="font-semibold text-foreground">{formatChallengeKm(perDay)} km/dzień</span>
            </>
          ) : (
            'Ostatnia prosta!'
          )}
        </p>
      </div>
    </section>
  );
}

function ResultCard({
  challenge,
  sides,
  result,
  onRematch,
}: {
  challenge: ChallengeDetail;
  sides: ChallengeSides;
  result: 'win' | 'loss' | 'draw';
  onRematch: () => void;
}) {
  const opponentName = socialName(sides.opponent.user);
  const target = formatChallengeKm(challenge.targetKm);

  const title = result === 'win' ? 'Wygrywasz! 🏆' : result === 'draw' ? 'Remis' : `Wygrywa ${opponentName}`;
  const reason =
    challenge.outcome === 'forfeit'
      ? result === 'win'
        ? `${opponentName} poddał(a) wyzwanie.`
        : 'Wyzwanie zostało poddane.'
      : challenge.outcome === 'target'
        ? result === 'win'
          ? `Pierwsza meta na ${target} km — ${format(new Date(sides.me.reachedAt ?? challenge.completedAt ?? challenge.endDate), 'd MMMM, HH:mm', { locale: pl })}.`
          : `${opponentName} dobiegł(a) do ${target} km jako pierwszy(-a).`
        : result === 'draw'
          ? 'Do terminu nikt nie dobiegł do celu, a wynik jest równy.'
          : `Do terminu nikt nie dobiegł do celu — ${result === 'win' ? 'masz' : `${opponentName} ma`} więcej kilometrów.`;

  return (
    <section
      className={cn(
        'rounded-2xl p-5 text-center',
        result === 'win' ? 'bg-food/10 ring-1 ring-food/30' : 'bg-card'
      )}
    >
      {result === 'win' && <Trophy className="mx-auto mb-2 h-8 w-8 text-food" />}
      <p className="font-display text-3xl font-bold uppercase leading-none">{title}</p>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{reason}</p>
      {result === 'win' && challenge.rewardPoints ? (
        <p className="mt-3 inline-flex rounded-full bg-food/15 px-3 py-1 text-sm font-bold text-food">
          +{challenge.rewardPoints} FitCoinów
        </p>
      ) : null}
      <Button variant="secondary" className="mt-4 w-full" onClick={onRematch}>
        <RotateCcw />
        {result === 'loss' ? 'Rewanż' : 'Jeszcze raz'}
      </Button>
    </section>
  );
}

function RunsList({ challenge, sides }: { challenge: ChallengeDetail; sides: ChallengeSides }) {
  const myId = sides.me.user.userId;

  return (
    <section>
      <h2 className="mb-2 px-1 text-[15px] font-semibold">Biegi w wyzwaniu</h2>
      {challenge.runs.length === 0 ? (
        <EmptyState
          icon={Footprints}
          title="Jeszcze nikt nie pobiegł"
          description="Nagraj bieg w aplikacji albo zsynchronizuj Stravę — kilometry doliczą się same."
          action={
            <Button asChild size="sm">
              <Link to="/athlete/running">Biegnij</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-card">
          {challenge.runs.map(run => {
            const isMine = run.userId === myId;
            const side = isMine ? sides.me : sides.opponent;
            return (
              <li key={`${run.source}-${run.id}`} className="flex items-center gap-3 px-3.5 py-3">
                <span className="rounded-full p-[2px]" style={{ backgroundColor: isMine ? ME_COLOR : OPPONENT_COLOR }}>
                  <SocialAvatar user={side.user} className="h-9 w-9 border-2 border-card" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {isMine ? 'Ty' : socialName(side.user)}
                    {run.title && <span className="font-normal text-muted-foreground"> · {run.title}</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    <span className="inline-block first-letter:uppercase">
                      {format(new Date(run.date), 'EEEE, d MMM · HH:mm', { locale: pl })}
                    </span>
                    {run.source === 'strava' && (
                      <span className="font-semibold" style={{ color: STRAVA_COLOR }}>
                        {' '}
                        · Strava
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 font-display text-2xl font-bold tabular-nums">
                  +{formatChallengeKm(run.distanceKm)}
                  <span className="ml-0.5 font-body text-xs font-semibold text-muted-foreground">km</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
