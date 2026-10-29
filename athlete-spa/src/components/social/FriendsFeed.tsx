import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useSWRConfig } from 'swr';
import { format } from 'date-fns';
import {
  Activity,
  Bike,
  ChevronRight,
  Dumbbell,
  Footprints,
  Loader2,
  Plus,
  Send,
  Trash2,
  Users,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api-client';
import { useUser } from '@/lib/db-hooks';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  SOCIAL_KEYS,
  useFriends,
  useFriendsActivity,
  useFriendStatuses,
  type FriendActivityItem,
  type FriendStatusPost,
  type SocialUserSummary,
} from '@/lib/friends';
import { SocialAvatar, socialName } from './SocialAvatar';
import { dayLabel, formatDuration, pluralPl, timeAgo } from './social-format';

const MAX_STATUS_LENGTH = 280;
const STRAVA_COLOR = '#FC4C02';

type FeedEntry =
  | { kind: 'activity'; key: string; date: string; item: FriendActivityItem }
  | { kind: 'status'; key: string; date: string; status: FriendStatusPost };

interface FriendsFeedProps {
  onProfileClick: (userId: string) => void;
  onOpenPeople: () => void;
}

export function FriendsFeed({ onProfileClick, onOpenPeople }: FriendsFeedProps) {
  const { data: friendsData, isLoading: friendsLoading } = useFriends();
  const { data: activity, isLoading: activityLoading, error: activityError, mutate: refetchActivity } =
    useFriendsActivity();
  const { data: statuses, isLoading: statusesLoading, error: statusesError, mutate: refetchStatuses } =
    useFriendStatuses();

  const friends = friendsData?.friends ?? [];
  const incoming = friendsData?.incoming ?? [];

  // Activity covers friends only; statuses also include the caller's own, so they come from their own endpoint.
  const days = useMemo(() => {
    const entries: FeedEntry[] = [
      ...(activity ?? [])
        .filter(item => item.type !== 'status')
        .map(item => ({ kind: 'activity' as const, key: `${item.type}-${item.id}`, date: item.date, item })),
      ...(statuses ?? []).map(status => ({
        kind: 'status' as const,
        key: `status-${status.id}`,
        date: status.createdAt,
        status,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const groups: { day: string; label: string; entries: FeedEntry[] }[] = [];
    for (const entry of entries) {
      const day = format(new Date(entry.date), 'yyyy-MM-dd');
      const last = groups[groups.length - 1];
      if (last?.day === day) last.entries.push(entry);
      else groups.push({ day, label: dayLabel(entry.date), entries: [entry] });
    }
    return groups;
  }, [activity, statuses]);

  const isFeedLoading = (activityLoading && !activity) || (statusesLoading && !statuses);
  const hasError = activityError || statusesError;

  return (
    <div className="space-y-5">
      <FriendsStrip
        friends={friends.map(f => f.user)}
        isLoading={friendsLoading && !friendsData}
        onProfileClick={onProfileClick}
        onAdd={onOpenPeople}
      />

      {incoming.length > 0 && (
        <button
          type="button"
          onClick={onOpenPeople}
          className="flex w-full items-center gap-3 rounded-[1.5rem] border border-primary/25 bg-primary/5 p-3 text-left transition-transform active:scale-[0.99]"
        >
          <div className="flex -space-x-3">
            {incoming.slice(0, 3).map(invite => (
              <SocialAvatar key={invite.friendshipId} user={invite.user} className="h-9 w-9 border-2 border-background" />
            ))}
          </div>
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold text-primary">
              {incoming.length} {pluralPl(incoming.length, 'nowe zaproszenie', 'nowe zaproszenia', 'nowych zaproszeń')}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {incoming.map(i => socialName(i.user)).join(', ')}
            </span>
          </p>
          <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
        </button>
      )}

      <StatusComposer />

      {hasError ? (
        <EmptyCard
          icon={Activity}
          text="Nie udało się wczytać aktywności znajomych."
          action={
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                void refetchActivity();
                void refetchStatuses();
              }}
            >
              Spróbuj ponownie
            </Button>
          }
        />
      ) : isFeedLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-[1.75rem]" />
          ))}
        </div>
      ) : days.length === 0 ? (
        friends.length === 0 ? (
          <EmptyCard
            icon={Users}
            title="Trenuj w towarzystwie"
            text="Dodaj znajomych, aby widzieć tutaj ich treningi, biegi i statusy."
            action={
              <Button size="sm" className="rounded-full" onClick={onOpenPeople}>
                Znajdź znajomych
              </Button>
            }
          />
        ) : (
          <EmptyCard icon={Activity} text="Twoi znajomi nie mieli ostatnio żadnej aktywności. Napisz pierwszy status!" />
        )
      ) : (
        <div className="space-y-6">
          {days.map(group => (
            <section key={group.day} aria-label={group.label}>
              <h3 className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground first-letter:uppercase">
                {group.label}
              </h3>
              <ul className="space-y-3">
                {group.entries.map(entry =>
                  entry.kind === 'activity' ? (
                    <ActivityCard key={entry.key} item={entry.item} onProfileClick={onProfileClick} />
                  ) : (
                    <StatusCard key={entry.key} status={entry.status} onProfileClick={onProfileClick} />
                  )
                )}
              </ul>
            </section>
          ))}
          <p className="pb-2 text-center text-xs text-muted-foreground">Pokazujemy aktywność z ostatnich 14 dni</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Pieces ---------- */

function EmptyCard({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title?: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
      <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
        <Icon className="h-7 w-7" />
      </span>
      {title && <p className="mb-1 font-headline text-lg font-bold">{title}</p>}
      <p className="mx-auto max-w-xs text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function FriendsStrip({
  friends,
  isLoading,
  onProfileClick,
  onAdd,
}: {
  friends: SocialUserSummary[];
  isLoading: boolean;
  onProfileClick: (userId: string) => void;
  onAdd: () => void;
}) {
  return (
    <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" aria-label="Twoi znajomi">
      <li className="shrink-0">
        <button
          type="button"
          onClick={onAdd}
          className="flex w-16 flex-col items-center gap-1.5 transition-transform active:scale-95"
        >
          <span className="grid h-[3.875rem] w-[3.875rem] place-items-center rounded-full border-2 border-dashed border-primary/50 text-primary">
            <Plus className="h-6 w-6" />
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">Dodaj</span>
        </button>
      </li>
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="shrink-0">
              <Skeleton className="h-[3.875rem] w-[3.875rem] rounded-full" />
            </li>
          ))
        : friends.map(friend => (
            <li key={friend.userId} className="shrink-0">
              <button
                type="button"
                disabled={!friend.nickname}
                onClick={() => onProfileClick(friend.userId)}
                className="flex w-16 flex-col items-center gap-1.5 transition-transform enabled:active:scale-95"
                aria-label={`Profil ${socialName(friend)}`}
              >
                <span className="rounded-full bg-gradient-to-tr from-primary via-chart-5 to-volt p-[2.5px]">
                  <span className="block rounded-full border-[3px] border-background">
                    <SocialAvatar user={friend} className="h-12 w-12" />
                  </span>
                </span>
                <span className="w-full truncate text-center text-[11px] font-medium">{friend.displayName}</span>
              </button>
            </li>
          ))}
    </ul>
  );
}

const STRAVA_SPORTS: Record<string, { label: string; icon: LucideIcon }> = {
  Run: { label: 'Bieg', icon: Footprints },
  TrailRun: { label: 'Bieg terenowy', icon: Footprints },
  Walk: { label: 'Spacer', icon: Footprints },
  Hike: { label: 'Wędrówka', icon: Footprints },
  Ride: { label: 'Rower', icon: Bike },
  VirtualRide: { label: 'Rower', icon: Bike },
  Swim: { label: 'Pływanie', icon: Waves },
};

function activityView(item: FriendActivityItem): {
  icon: LucideIcon;
  color: string;
  kind: string;
  title: string;
  stats: { label: string; value: string }[];
} {
  const duration = formatDuration(item.durationMin);
  const distance = item.distanceKm ? item.distanceKm.toLocaleString('pl-PL', { maximumFractionDigits: 2 }) + ' km' : null;
  const pace =
    item.distanceKm && item.durationMin
      ? (() => {
          const secPerKm = Math.round((item.durationMin * 60) / item.distanceKm);
          return `${Math.floor(secPerKm / 60)}:${String(secPerKm % 60).padStart(2, '0')} /km`;
        })()
      : null;
  const stat = (label: string, value: string | null) => (value ? [{ label, value }] : []);

  switch (item.type) {
    case 'workout':
      return {
        icon: Dumbbell,
        color: 'hsl(var(--primary))',
        kind: 'Trening siłowy',
        title: item.title,
        stats: [...stat('Czas', duration), ...stat('Ćwiczenia', item.exerciseCount ? String(item.exerciseCount) : null)],
      };
    case 'run':
      return {
        icon: Footprints,
        color: 'hsl(var(--volt))',
        kind: 'Bieg',
        title: item.title,
        stats: [...stat('Dystans', distance), ...stat('Tempo', pace), ...stat('Czas', duration)],
      };
    case 'strava':
    default: {
      const sport = (item.sport && STRAVA_SPORTS[item.sport]) || { label: item.sport || 'Aktywność', icon: Activity };
      return {
        icon: sport.icon,
        color: STRAVA_COLOR,
        kind: `${sport.label} · Strava`,
        title: item.title,
        stats: [...stat('Dystans', distance), ...stat('Czas', duration)],
      };
    }
  }
}

function CardHeader({
  user,
  date,
  onProfileClick,
  badge,
  trailing,
}: {
  user: SocialUserSummary;
  date: string;
  onProfileClick: (userId: string) => void;
  badge?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={!user.nickname}
        onClick={() => onProfileClick(user.userId)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity enabled:hover:opacity-80"
      >
        <SocialAvatar user={user} className="h-10 w-10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{socialName(user)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {timeAgo(date)}
            {badge}
          </p>
        </div>
      </button>
      {trailing}
    </div>
  );
}

function ActivityCard({ item, onProfileClick }: { item: FriendActivityItem; onProfileClick: (userId: string) => void }) {
  const { icon: Icon, color, kind, title, stats } = activityView(item);
  return (
    <li className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-soft">
      <div className="p-4 pb-3">
        <CardHeader
          user={item.user}
          date={item.date}
          onProfileClick={onProfileClick}
          badge={item.user.location ? ` · ${item.user.location}` : undefined}
          trailing={
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
          }
        />
        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color }}>
          {kind}
        </p>
        <h4 className="mt-0.5 font-headline text-lg font-bold leading-snug tracking-tight">{title}</h4>
      </div>
      {stats.length > 0 && (
        <dl
          className={cn(
            'grid divide-x divide-border/60 border-t border-border/60 bg-secondary/30',
            stats.length === 3 ? 'grid-cols-3' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
          )}
        >
          {stats.map(s => (
            <div key={s.label} className="px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{s.label}</dt>
              <dd className="mt-0.5 truncate font-headline text-lg font-extrabold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

function StatusCard({ status, onProfileClick }: { status: FriendStatusPost; onProfileClick: (userId: string) => void }) {
  const { user } = useUser();
  const { mutate } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState(false);
  const isOwn = user?.uid === status.authorId;
  const canDelete = isOwn || user?.role === 'admin';

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await apiFetch(`${SOCIAL_KEYS.statuses}/${status.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      await Promise.all([mutate(SOCIAL_KEYS.statuses), mutate(SOCIAL_KEYS.activity)]);
    } catch (error) {
      console.error('Failed to delete status:', error);
      toast({ title: 'Błąd', description: 'Nie udało się usunąć statusu.', variant: 'destructive' });
      setIsDeleting(false);
    }
  };

  return (
    <li className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft">
      <CardHeader
        user={status.author}
        date={status.createdAt}
        onProfileClick={onProfileClick}
        badge={isOwn ? ' · Ty' : undefined}
        trailing={
          canDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              disabled={isDeleting}
              aria-label="Usuń status"
              onClick={handleDelete}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          )
        }
      />
      <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{status.text}</p>
    </li>
  );
}

function StatusComposer() {
  const { mutate } = useSWRConfig();
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const trimmed = text.trim();
  const remaining = MAX_STATUS_LENGTH - text.length;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || trimmed.length > MAX_STATUS_LENGTH) return;

    setIsPosting(true);
    try {
      const response = await apiFetch(SOCIAL_KEYS.statuses, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setText('');
      await mutate(SOCIAL_KEYS.statuses);
    } catch (error) {
      console.error('Failed to post status:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się opublikować statusu. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.75rem] border border-border/60 bg-card p-3 shadow-soft transition-colors focus-within:border-primary/40"
    >
      <label htmlFor="friends-status" className="sr-only">
        Twój status
      </label>
      <Textarea
        id="friends-status"
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={MAX_STATUS_LENGTH}
        rows={text ? 3 : 1}
        placeholder="Jak poszedł trening? Napisz znajomym…"
        className="min-h-0 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      {text && (
        <div className="mt-1 flex items-center justify-between gap-3 px-1">
          <span className={cn('text-xs tabular-nums', remaining < 20 ? 'text-primary' : 'text-muted-foreground')}>
            {remaining}
          </span>
          <Button type="submit" size="sm" disabled={!trimmed || isPosting} className="gap-1.5 rounded-full px-4">
            {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Opublikuj
          </Button>
        </div>
      )}
    </form>
  );
}
