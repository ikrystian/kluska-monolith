import { Link } from 'react-router-dom';
import { Check, ChevronRight, Clock, Loader2, Quote, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SocialAvatar, socialName } from '@/components/social/SocialAvatar';
import {
  CLOSED_LABELS,
  challengeBucket,
  challengeHref,
  challengeResult,
  challengeSides,
  formatChallengeKm,
  useChallengeActions,
  type ChallengeView,
} from '@/lib/challenges';
import {
  LEAD_TONE_CLASS,
  Pill,
  RaceBars,
  ResultBadge,
  deadlineLabel,
  leadLine,
  timeLeftLabel,
} from './challenge-ui';

interface ChallengeCardProps {
  challenge: ChallengeView;
  myId: string;
  /** Offered on finished challenges: challenge the same friend again. */
  onRematch?: (opponentId: string, targetKm: number) => void;
}

/** One challenge in a list: invitation, waiting, live race, result or a closed one. */
export function ChallengeCard({ challenge, myId, onRematch }: ChallengeCardProps) {
  const { respond, isPending } = useChallengeActions();
  const bucket = challengeBucket(challenge, myId);
  const sides = challengeSides(challenge, myId);
  const opponent = sides.opponent.user;
  const opponentName = socialName(opponent);
  const result = challengeResult(challenge, myId);
  const busy = isPending(challenge.id);
  const target = formatChallengeKm(challenge.targetKm);

  const header = {
    invite: { title: opponentName, subtitle: 'rzuca Ci wyzwanie', trailing: <Pill className="bg-primary text-primary-foreground">Nowe</Pill> },
    sent: {
      title: `vs ${opponentName}`,
      subtitle: 'Czeka na odpowiedź',
      trailing: (
        <Pill className="text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Wysłane
        </Pill>
      ),
    },
    active: {
      title: `vs ${opponentName}`,
      subtitle: `Cel ${target} km · do ${deadlineLabel(challenge.endDate)}`,
      trailing: (
        <Pill>
          <Clock className="h-3.5 w-3.5" />
          {timeLeftLabel(challenge.endDate)}
        </Pill>
      ),
    },
    finished: {
      title: `vs ${opponentName}`,
      subtitle: `${target} km · ${deadlineLabel(challenge.completedAt ?? challenge.endDate, 'd MMM yyyy')}`,
      trailing: result && <ResultBadge result={result} />,
    },
    closed: {
      title: `vs ${opponentName}`,
      subtitle: `${target} km · ${CLOSED_LABELS[challenge.status] ?? ''}`,
      trailing: null,
    },
  }[bucket];

  const lead = bucket === 'active' ? leadLine(sides) : null;

  return (
    <li className={cn('overflow-hidden rounded-2xl bg-card', bucket === 'closed' && 'opacity-60')}>
      <Link
        to={challengeHref(challenge.id)}
        className="block p-4 transition-colors active:bg-secondary/40"
        aria-label={`${header.title}: szczegóły wyzwania`}
      >
        <div className="flex items-center gap-3">
          <SocialAvatar user={opponent} className={cn('h-11 w-11', bucket === 'closed' && 'grayscale')} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">{header.title}</p>
            <p className="truncate text-xs text-muted-foreground">{header.subtitle}</p>
          </div>
          {header.trailing}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        </div>

        {(bucket === 'invite' || bucket === 'sent') && (
          <div className="mt-3.5">
            <p className="text-xs font-semibold text-muted-foreground">Kto pierwszy przebiegnie</p>
            <div className="mt-0.5 flex items-end justify-between gap-3">
              <p className="font-display text-5xl font-bold leading-none tabular-nums">
                {target}
                <span className="ml-1 font-body text-base font-semibold text-muted-foreground">km</span>
              </p>
              <p className="pb-1 text-right text-xs text-muted-foreground">
                do {deadlineLabel(challenge.endDate)}
                <span className="block font-semibold text-foreground">zostało {timeLeftLabel(challenge.endDate)}</span>
              </p>
            </div>
            {challenge.message && (
              <p className="mt-3 flex gap-2 rounded-xl bg-secondary/60 px-3 py-2.5 text-sm">
                <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 break-words">{challenge.message}</span>
              </p>
            )}
          </div>
        )}

        {bucket === 'active' && lead && (
          <>
            <RaceBars sides={sides} targetKm={challenge.targetKm} className="mt-3.5" />
            <p className={cn('mt-3 text-sm font-semibold', LEAD_TONE_CLASS[lead.tone])}>{lead.text}</p>
          </>
        )}

        {bucket === 'finished' && (
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="font-display text-3xl font-bold leading-none tabular-nums">
              {formatChallengeKm(sides.me.km)}
              <span className="mx-1.5 text-muted-foreground">:</span>
              {formatChallengeKm(sides.opponent.km)}
              <span className="ml-1 font-body text-sm font-semibold text-muted-foreground">km</span>
            </p>
            {result === 'win' && challenge.rewardPoints ? (
              <span className="pb-0.5 text-xs font-bold text-food">+{challenge.rewardPoints} FitCoinów</span>
            ) : challenge.outcome === 'forfeit' ? (
              <span className="pb-0.5 text-xs text-muted-foreground">
                {result === 'win' ? 'Rywal się poddał' : 'Poddano'}
              </span>
            ) : null}
          </div>
        )}
      </Link>

      {bucket === 'invite' && (
        <div className="flex gap-2 border-t border-border/60 px-4 py-3">
          <Button
            size="sm"
            className="flex-1"
            disabled={busy}
            onClick={() => respond(challenge.id, 'accept')}
          >
            {isPending(challenge.id, 'accept') ? <Loader2 className="animate-spin" /> : <Check />}
            Przyjmuję
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            disabled={busy}
            onClick={() => respond(challenge.id, 'decline')}
          >
            {isPending(challenge.id, 'decline') ? <Loader2 className="animate-spin" /> : <X />}
            Odrzuć
          </Button>
        </div>
      )}

      {bucket === 'sent' && (
        <div className="border-t border-border/60 px-4 py-2">
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-muted-foreground"
            disabled={busy}
            onClick={() => respond(challenge.id, 'cancel')}
          >
            {busy ? <Loader2 className="animate-spin" /> : <X />}
            Wycofaj wyzwanie
          </Button>
        </div>
      )}

      {bucket === 'finished' && onRematch && (
        <div className="border-t border-border/60 px-4 py-2">
          <Button
            size="sm"
            variant="ghost"
            className="w-full"
            onClick={() => onRematch(opponent.userId, challenge.targetKm)}
          >
            <RotateCcw />
            {result === 'loss' ? 'Rewanż' : 'Jeszcze raz'}
          </Button>
        </div>
      )}
    </li>
  );
}
