import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import useSWR from 'swr';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, Heart, Image as ImageIcon, MapPin, Trophy, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, SectionHeader } from '@/components/ui/section';
import { FriendButton } from '@/components/social/FriendButton';
import { SocialAvatar } from '@/components/social/SocialAvatar';
import { resolveMediaUrl } from '@/lib/api-client';
import { jsonFetcher, useUser } from '@/lib/db-hooks';
import { useAthletes, type SocialUserSummary } from '@/lib/friends';
import { resolveStoredImageUrl } from '@/lib/upload';

interface ProfileRecord {
  id: string;
  exerciseName: string;
  type: 'max_weight' | 'max_reps' | 'max_duration';
  value: number;
  reps?: number;
  achievedAt: string;
}

interface ProfilePost {
  id: string;
  imageUrl: string;
}

/** Response of GET /api/social/profile/:userId. */
interface PublicProfileResponse {
  profile: { userId: string; nickname: string; avatarUrl?: string; bio?: string; createdAt: string };
  user: SocialUserSummary | null;
  stats: { postsCount: number; totalLikes: number };
  records: ProfileRecord[];
  recentPosts: ProfilePost[];
}

function formatRecordValue(record: ProfileRecord): string {
  switch (record.type) {
    case 'max_weight':
      return `${record.value} kg${record.reps ? ` × ${record.reps}` : ''}`;
    case 'max_reps':
      return `${record.value} powt.`;
    case 'max_duration':
      return `${record.value} s`;
    default:
      return String(record.value);
  }
}

function timeAgo(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pl });
  } catch {
    return '';
  }
}

function ProfileSkeleton() {
  return (
    <div className="page space-y-6">
      <div className="flex flex-col items-center gap-3 pt-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Heart; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-card px-2 py-4 text-center">
      <Icon className="mb-1.5 h-4 w-4 text-muted-foreground" />
      <span className="font-headline text-2xl font-bold leading-none tabular-nums">{value}</span>
      <span className="mt-1 text-xs font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

/** Public profile of another athlete: who they are, their numbers and latest posts. */
export default function AthletePublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: me } = useUser();
  const isMe = !!me && me.uid === userId;

  const { data, error, isLoading } = useSWR<PublicProfileResponse>(
    userId ? `/api/social/profile/${userId}` : null,
    jsonFetcher
  );
  // The athlete list already knows our relation to this person (friends / invited / none).
  const { data: athletes } = useAthletes(!isMe);
  const athlete = useMemo(() => athletes?.find(a => a.userId === userId), [athletes, userId]);

  if (isLoading && !data) return <ProfileSkeleton />;

  if (error || !data) {
    return (
      <div className="page">
        <EmptyState
          icon={UserX}
          title="Nie znaleźliśmy tego profilu"
          description="Użytkownik mógł nie założyć jeszcze profilu społecznościowego."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/athlete/social?tab=people">Wróć do listy</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { profile, stats, records, recentPosts } = data;
  const summary: SocialUserSummary = data.user ?? {
    userId: profile.userId,
    displayName: profile.nickname,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
  };
  const joined = new Date(profile.createdAt);

  return (
    <div className="page space-y-6 pb-8">
      <section className="flex flex-col items-center pt-2 text-center">
        <SocialAvatar user={summary} className="h-24 w-24 text-3xl" />
        <h2 className="mt-3 max-w-full truncate font-headline text-2xl font-bold">@{profile.nickname}</h2>

        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {summary.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {summary.location}
            </span>
          )}
          {!Number.isNaN(joined.getTime()) && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Z nami od {format(joined, 'd MMMM yyyy', { locale: pl })}
            </span>
          )}
        </div>

        {profile.bio && <p className="mt-3 max-w-sm text-[15px] leading-relaxed">{profile.bio}</p>}

        <div className="mt-4">
          {isMe ? (
            <Badge variant="secondary" className="px-3 py-1.5 text-xs">
              To Twój profil
            </Badge>
          ) : (
            athlete && <FriendButton athlete={athlete} />
          )}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3" aria-label="Statystyki">
        <Stat icon={ImageIcon} value={stats.postsCount} label="Postów" />
        <Stat icon={Heart} value={stats.totalLikes} label="Polubień" />
        <Stat icon={Trophy} value={records.length} label="Rekordów" />
      </section>

      {records.length > 0 && (
        <section>
          <SectionHeader title="Rekordy osobiste" />
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-card">
            {records.slice(0, 5).map(record => (
              <li key={record.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{record.exerciseName}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(record.achievedAt)}</p>
                </div>
                <span className="shrink-0 font-headline text-lg font-bold tabular-nums">{formatRecordValue(record)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionHeader title="Ostatnie posty" />
        {recentPosts.length === 0 ? (
          <EmptyState icon={ImageIcon} title="Brak postów" description="Ta osoba nie dodała jeszcze żadnego zdjęcia." />
        ) : (
          <ul className="grid grid-cols-3 gap-1.5">
            {recentPosts.slice(0, 6).map(post => (
              <li key={post.id} className="aspect-square overflow-hidden rounded-xl bg-muted">
                <img
                  src={resolveMediaUrl(resolveStoredImageUrl(post.imageUrl))}
                  alt={`Post użytkownika @${profile.nickname}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
