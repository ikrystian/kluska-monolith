import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Bike, Dumbbell, Footprints, MessageSquareText, Activity, UserPlus, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFriends, useFriendsActivity, type FriendActivityItem } from '@/lib/friends';
import { SocialAvatar, socialName } from './SocialAvatar';

const STRAVA_SPORTS: Record<string, { label: string; icon: LucideIcon }> = {
  Run: { label: 'Bieg', icon: Footprints },
  TrailRun: { label: 'Bieg terenowy', icon: Footprints },
  Walk: { label: 'Spacer', icon: Footprints },
  Hike: { label: 'Wędrówka', icon: Footprints },
  Ride: { label: 'Jazda na rowerze', icon: Bike },
  VirtualRide: { label: 'Jazda na rowerze', icon: Bike },
  Swim: { label: 'Pływanie', icon: Activity },
};

function formatDuration(minutes?: number): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function describe(item: FriendActivityItem): { icon: LucideIcon; label: string; meta: string[] } {
  const distance = item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : null;
  const duration = formatDuration(item.durationMin);

  switch (item.type) {
    case 'workout':
      return {
        icon: Dumbbell,
        label: `Trening: ${item.title}`,
        meta: [duration, item.exerciseCount ? `${item.exerciseCount} ćw.` : null].filter(Boolean) as string[],
      };
    case 'run':
      return {
        icon: Footprints,
        label: item.title === 'Bieg' ? 'Bieg' : `Bieg: ${item.title}`,
        meta: [distance, duration].filter(Boolean) as string[],
      };
    case 'strava': {
      const sport = (item.sport && STRAVA_SPORTS[item.sport]) || { label: item.sport || 'Aktywność', icon: Activity };
      return {
        icon: sport.icon,
        label: `${sport.label}: ${item.title}`,
        meta: [distance, duration, 'Strava'].filter(Boolean) as string[],
      };
    }
    case 'status':
      return { icon: MessageSquareText, label: `„${item.text}”`, meta: [] };
  }
}

function invitesLabel(count: number): string {
  if (count === 1) return '1 zaproszenie';
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} zaproszenia`;
  return `${count} zaproszeń`;
}

function timeAgo(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
  } catch {
    return '';
  }
}

export function FriendActivityRow({ item }: { item: FriendActivityItem }) {
  const { icon: Icon, label, meta } = describe(item);
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft">
      <div className="relative shrink-0">
        <SocialAvatar user={item.user} />
        <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-card bg-secondary text-primary">
          <Icon className="h-3 w-3" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold">{socialName(item.user)}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(item.date)}</span>
        </div>
        <p className={item.type === 'status' ? 'line-clamp-2 text-sm' : 'truncate text-sm'}>{label}</p>
        {meta.length > 0 && <p className="text-xs tabular-nums text-muted-foreground">{meta.join(' · ')}</p>}
      </div>
    </li>
  );
}

/** Dashboard feed of accepted friends' recent workouts, runs and statuses. */
export function FriendsActivityFeed({ limit = 5 }: { limit?: number }) {
  const { data: activity, isLoading } = useFriendsActivity();
  const { data: friends } = useFriends();

  if (isLoading && !activity) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.5rem] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  const hasFriends = (friends?.friends.length ?? 0) > 0;
  const pendingInvites = friends?.incoming.length ?? 0;

  if (!activity || activity.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-6 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
          <UserPlus className="h-6 w-6" />
        </span>
        <p className="text-sm text-muted-foreground">
          {hasFriends
            ? 'Twoi znajomi nie mieli ostatnio żadnej aktywności.'
            : pendingInvites > 0
              ? `Masz ${invitesLabel(pendingInvites)} do znajomych.`
              : 'Dodaj znajomych, aby widzieć tutaj ich treningi i biegi.'}
        </p>
        {!hasFriends && (
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link to={pendingInvites > 0 ? '/athlete/social?tab=friends' : '/athlete/social?tab=nearby'}>
              {pendingInvites > 0 ? 'Zobacz zaproszenia' : 'Znajdź znajomych'}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul className="grid gap-2.5 md:grid-cols-2">
      {activity.slice(0, limit).map(item => (
        <FriendActivityRow key={`${item.type}-${item.id}`} item={item} />
      ))}
    </ul>
  );
}
