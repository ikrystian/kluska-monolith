import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/db-hooks';
import { SectionHeader } from '@/components/ui/section';
import { SocialAvatar, socialName } from '@/components/social/SocialAvatar';
import {
  challengeBucket,
  challengeHref,
  challengeSides,
  formatChallengeKm,
  useChallenges,
  type ChallengeView,
} from '@/lib/challenges';
import { ChallengeCard } from './ChallengeCard';
import { LEAD_TONE_CLASS, RaceBars, leadLine, timeLeftLabel } from './challenge-ui';

const MAX_SHOWN = 3;

/**
 * Open running challenges for the dashboard and the running screen:
 * invitations to answer first, then live races. Renders nothing when there
 * are none, so the screen it sits on stays quiet for people who don't race.
 */
export function ActiveChallenges({
  title = 'Wyzwania biegowe',
  emptyFallback = null,
}: {
  title?: string;
  /** Shown instead of nothing once the list has loaded empty. */
  emptyFallback?: ReactNode;
}) {
  const { user } = useUser();
  const { data: challenges } = useChallenges(Boolean(user && !user.isGuest));
  const myId = user?.uid ?? '';

  const invites = (challenges ?? []).filter(c => challengeBucket(c, myId) === 'invite');
  const races = (challenges ?? [])
    .filter(c => challengeBucket(c, myId) === 'active')
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  if (!user || user.isGuest || !challenges) return null;
  if (invites.length + races.length === 0) return <>{emptyFallback}</>;

  const shownInvites = invites.slice(0, MAX_SHOWN);
  const shownRaces = races.slice(0, Math.max(0, MAX_SHOWN - shownInvites.length));

  return (
    <section>
      <SectionHeader title={title} href="/athlete/challenges" />
      <div className="space-y-3">
        {shownInvites.length > 0 && (
          <ul className="space-y-3">
            {shownInvites.map(c => (
              <ChallengeCard key={c.id} challenge={c} myId={myId} />
            ))}
          </ul>
        )}
        {shownRaces.length > 0 && (
          <ul className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
            {shownRaces.map(c => (
              <RaceRow key={c.id} challenge={c} myId={myId} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function RaceRow({ challenge, myId }: { challenge: ChallengeView; myId: string }) {
  const sides = challengeSides(challenge, myId);
  const lead = leadLine(sides);
  return (
    <li>
      <Link to={challengeHref(challenge.id)} className="row-tap block px-3.5 py-3">
        <div className="flex items-center gap-3">
          <SocialAvatar user={sides.opponent.user} className="h-9 w-9" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold leading-tight">
              vs {socialName(sides.opponent.user)}
            </span>
            <span className={cn('block truncate text-xs font-semibold', LEAD_TONE_CLASS[lead.tone])}>{lead.text}</span>
          </span>
          <span className="shrink-0 text-right text-xs text-muted-foreground">
            <span className="block font-semibold text-foreground">{formatChallengeKm(challenge.targetKm)} km</span>
            {timeLeftLabel(challenge.endDate)}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        </div>
        <RaceBars sides={sides} targetKm={challenge.targetKm} className="mt-2.5" />
      </Link>
    </li>
  );
}
