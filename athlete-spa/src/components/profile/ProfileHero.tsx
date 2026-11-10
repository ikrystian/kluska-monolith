import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ChevronRight, Coins, Flame, MapPin, Medal, Pencil } from 'lucide-react';
import { Facebook, Instagram, Twitter } from '@/components/ui/social-icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useGamificationProfile } from '@/hooks/useGamification';
import { useUser } from '@/lib/db-hooks';
import { resolveMediaUrl } from '@/lib/api-client';
import { placeholderImages } from '@/lib/placeholder-images';
import { haptic } from '@/lib/haptics';
import { pluralForm } from '@/lib/plural';
import { tint } from './profile-ui';

const ROLE_LABELS: Record<string, string> = {
  athlete: 'Sportowiec',
  trainer: 'Trener',
  admin: 'Administrator',
};

const getInitials = (name: string | null | undefined) =>
  name
    ? name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : 'U';

const RING_SIZE = 116;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** The avatar sits inside a ring that fills with XP toward the next level. */
function XpRing({ percent }: { percent: number }) {
  return (
    <svg
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="absolute inset-0 h-full w-full -rotate-90"
      aria-hidden
    >
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        strokeWidth={RING_STROKE}
        className="stroke-foreground/10"
      />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={`${(percent / 100) * RING_LENGTH} ${RING_LENGTH}`}
        className="stroke-volt transition-[stroke-dasharray] duration-1000 ease-out"
      />
    </svg>
  );
}

/** One counter of the gamification strip. */
function StripStat({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 px-2 py-3">
      <span className="flex items-center gap-1.5">
        <span className="grid h-6 w-6 place-items-center rounded-full" style={{ backgroundColor: tint(color, 16), color }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="font-display text-xl font-bold leading-none tabular-nums">{value}</span>
      </span>
      <span className="truncate text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Top of the "Ty" tab, shared by Profil and Ustawienia: who you are, how far
 * the next level is (the ring around the avatar), and your streak, coins and
 * badges, which open achievements.
 */
export function ProfileHero({ onEditProfile, onEditAvatar }: { onEditProfile: () => void; onEditAvatar: () => void }) {
  const { user } = useUser();
  const { userProfile, isLoading } = useUserProfile();
  const { stats, isLoading: statsLoading } = useGamificationProfile();

  const fallbackAvatar = placeholderImages.find(img => img.id === 'avatar-male');
  const avatarSrc = userProfile?.avatarUrl ? resolveMediaUrl(userProfile.avatarUrl) : fallbackAvatar?.imageUrl;
  const level = stats?.level ?? 1;
  const xpPercent = stats && stats.xpForNextLevel > 0 ? Math.min(100, (stats.currentXP / stats.xpForNextLevel) * 100) : 0;
  const xpLeft = stats ? Math.max(0, stats.xpForNextLevel - stats.currentXP) : 0;
  const streak = stats?.streaks.workout ?? 0;
  const badges = stats?.achievementCount ?? 0;

  const socialLinks = [
    { href: userProfile?.socialLinks?.instagram, icon: Instagram, label: 'Instagram' },
    { href: userProfile?.socialLinks?.facebook, icon: Facebook, label: 'Facebook' },
    { href: userProfile?.socialLinks?.twitter, icon: Twitter, label: 'Twitter / X' },
  ].filter((l): l is { href: string; icon: typeof Instagram; label: string } => Boolean(l.href));

  return (
    <section className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <XpRing percent={xpPercent} />
        <Avatar className="absolute inset-[10px] h-auto w-auto">
          {avatarSrc && <AvatarImage src={avatarSrc} alt="Awatar użytkownika" className="object-cover" />}
          <AvatarFallback className="bg-secondary font-display text-3xl font-bold">
            {isLoading ? '' : getInitials(userProfile?.name)}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={onEditAvatar}
          aria-label="Zmień zdjęcie profilowe"
          className="absolute right-0 top-1 grid h-9 w-9 place-items-center rounded-full bg-card text-foreground shadow-sm ring-4 ring-background transition-transform active:scale-90"
        >
          <Camera className="h-4 w-4" />
        </button>
        <Link
          to="/athlete/gamification"
          onClick={() => haptic('tap')}
          aria-label={`Poziom ${level}. Do następnego brakuje ${xpLeft} XP`}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-1 font-display text-sm font-bold uppercase leading-none tracking-wide text-primary-foreground ring-4 ring-background"
        >
          Poz. {level}
        </Link>
      </div>

      {isLoading && !userProfile ? (
        <>
          <Skeleton className="mt-5 h-8 w-44" />
          <Skeleton className="mt-2 h-4 w-28" />
        </>
      ) : (
        <>
          <p className="mt-1.5 flex max-w-full items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <span className="font-medium">{user?.isGuest ? 'Gość' : ROLE_LABELS[userProfile?.role ?? ''] ?? 'Sportowiec'}</span>
            {userProfile?.location && (
              <>
                <span aria-hidden>·</span>
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{userProfile.location}</span>
              </>
            )}
          </p>
        </>
      )}

      <p className="mt-1 text-xs tabular-nums text-muted-foreground/80">
        {statsLoading && !stats ? ' ' : `${stats?.currentXP ?? 0} / ${stats?.xpForNextLevel ?? 0} XP · ${xpLeft} do poziomu ${level + 1}`}
      </p>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onEditProfile}
          disabled={!userProfile}
          className="pressable inline-flex h-9 items-center gap-1.5 rounded-full bg-secondary px-4 text-sm font-semibold disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edytuj profil
        </button>
        {socialLinks.map(({ href, icon: Icon, label }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="pressable grid h-9 w-9 place-items-center rounded-full bg-secondary"
          >
            <Icon className="h-4 w-4" />
          </a>
        ))}
      </div>

      <Link
        to="/athlete/gamification"
        onClick={() => haptic('tap')}
        aria-label="Osiągnięcia i nagrody"
        className="pressable-lg relative mt-5 grid w-full grid-cols-3 divide-x divide-border/60 rounded-2xl bg-card pr-5"
      >
        {statsLoading && !stats ? (
          <Skeleton className="col-span-3 m-3 h-10" />
        ) : (
          <>
            <StripStat icon={Flame} color="hsl(var(--primary))" value={streak} label={`${pluralForm(streak, 'dzień', 'dni', 'dni')} serii`} />
            <StripStat icon={Coins} color="hsl(var(--food))" value={stats?.currentFitCoins ?? 0} label="FitCoins" />
            <StripStat icon={Medal} color="hsl(var(--social))" value={badges} label={pluralForm(badges, 'odznaka', 'odznaki', 'odznak')} />
          </>
        )}
        <ChevronRight className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
      </Link>
    </section>
  );
}
