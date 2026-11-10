import { Link } from 'react-router-dom';
import { ChevronRight, Footprints } from 'lucide-react';
import { useUser } from '@/lib/db-hooks';
import { SocialAvatar, socialName } from '@/components/social/SocialAvatar';
import { pluralPl } from '@/components/social/social-format';
import { challengeBucket, challengeSides, useChallenges } from '@/lib/challenges';

/**
 * Way into running challenges from the friends feed: new invitations stand
 * out, otherwise a quiet row counts the live races or invites to start one.
 */
export function ChallengesBanner() {
  const { user } = useUser();
  const { data: challenges } = useChallenges(Boolean(user && !user.isGuest));
  if (!user || !challenges) return null;

  const myId = user.uid;
  const invites = challenges.filter(c => challengeBucket(c, myId) === 'invite');
  const races = challenges.filter(c => challengeBucket(c, myId) === 'active');

  if (invites.length > 0) {
    const from = invites.map(c => challengeSides(c, myId).opponent.user);
    return (
      <Link
        to="/athlete/challenges"
        className="flex w-full items-center gap-3 rounded-2xl border border-volt/30 bg-volt/10 p-3 text-left transition-transform active:scale-[0.99]"
      >
        <div className="flex -space-x-3">
          {from.slice(0, 3).map(u => (
            <SocialAvatar key={u.userId} user={u} className="h-9 w-9 border-2 border-background" />
          ))}
        </div>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold text-volt">
            {invites.length} {pluralPl(invites.length, 'wyzwanie biegowe', 'wyzwania biegowe', 'wyzwań biegowych')}
          </span>
          <span className="block truncate text-xs text-muted-foreground">od {from.map(socialName).join(', ')}</span>
        </p>
        <ChevronRight className="h-4 w-4 shrink-0 text-volt" />
      </Link>
    );
  }

  return (
    <Link to="/athlete/challenges" className="row-tap flex items-center gap-3 rounded-2xl bg-card px-3.5 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-volt/15 text-volt">
        <Footprints className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">Wyzwania biegowe</span>
        <span className="block truncate text-xs text-muted-foreground">
          {races.length > 0
            ? `${races.length} ${pluralPl(races.length, 'trwający wyścig', 'trwające wyścigi', 'trwających wyścigów')}`
            : 'Rzuć znajomemu wyzwanie na kilometry'}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}
