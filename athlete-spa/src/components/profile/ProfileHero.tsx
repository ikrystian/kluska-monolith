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
import { fmtNumber } from '@/components/dashboard/summary-visuals';
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

/** One counter under the athlete card; all three open achievements. */
function StatTile({
  icon: Icon,
  color,
  value,
  label,
  isLoading,
}: {
  icon: ComponentType<{ className?: string }>;
  color: string;
  value: number;
  label: string;
  isLoading: boolean;
}) {
  return (
    <Link
      to="/athlete/gamification"
      onClick={() => haptic('tap')}
      className="pressable flex min-w-0 flex-col rounded-2xl bg-card p-3"
    >
      <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ backgroundColor: tint(color, 16), color }}>
        <Icon className="h-4 w-4" />
      </span>
      {isLoading ? (
        <Skeleton className="mt-3 h-7 w-12" />
      ) : (
        <span className="num mt-3 text-[1.75rem]">{fmtNumber(value)}</span>
      )}
      <span className="mt-1 truncate text-[11px] font-medium text-muted-foreground">{label}</span>
    </Link>
  );
}

/**
 * Top of the "Ty" tab — the athlete card: photo, level with the XP bar toward
 * the next one, and tiles for streak, coins and badges that open achievements.
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

  const role = user?.isGuest ? 'Gość' : ROLE_LABELS[userProfile?.role ?? ''] ?? 'Sportowiec';
  const statsPending = statsLoading && !stats;

  return (
    <section className="space-y-2.5">
      <div className="relative overflow-hidden rounded-3xl bg-card p-4">
        {/* Barbell plate peeking from the corner — the app's signature shape. */}
        <svg viewBox="0 0 200 200" aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 text-foreground opacity-[0.05]">
          <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="100" cy="100" r="68" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>

        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-[84px] w-[84px] rounded-[1.5rem]">
              {avatarSrc && <AvatarImage src={avatarSrc} alt="Awatar użytkownika" className="object-cover" />}
              <AvatarFallback className="rounded-[1.5rem] bg-secondary font-display text-3xl font-bold">
                {isLoading ? '' : getInitials(userProfile?.name)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={onEditAvatar}
              aria-label="Zmień zdjęcie profilowe"
              className="absolute -bottom-1.5 -right-1.5 grid h-8 w-8 place-items-center rounded-full bg-secondary text-foreground ring-4 ring-card transition-transform active:scale-90"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            {isLoading && !userProfile ? (
              <Skeleton className="h-4 w-28" />
            ) : (
              <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <span className="shrink-0">{role}</span>
                {userProfile?.location && (
                  <>
                    <span aria-hidden>·</span>
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{userProfile.location}</span>
                  </>
                )}
              </p>
            )}
            <p className="mt-1.5 flex items-baseline gap-2">
              <span className="num text-[2.75rem] uppercase">Poziom</span>
              <span className="num text-[2.75rem] text-volt">{statsPending ? '–' : level}</span>
            </p>
          </div>
        </div>

        <Link
          to="/athlete/gamification"
          onClick={() => haptic('tap')}
          aria-label={`Poziom ${level}. Do następnego brakuje ${xpLeft} XP`}
          className="pressable-lg relative mt-4 block"
        >
          <div className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-lime transition-[width] duration-1000 ease-out"
              style={{ width: `${Math.max(xpPercent, xpPercent > 0 ? 3 : 0)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs tabular-nums">
            <span className="text-muted-foreground">
              {statsPending ? ' ' : `${fmtNumber(stats?.currentXP ?? 0)} / ${fmtNumber(stats?.xpForNextLevel ?? 0)} XP`}
            </span>
            <span className="flex items-center gap-0.5 font-semibold">
              {statsPending ? ' ' : `${fmtNumber(xpLeft)} XP do poziomu ${level + 1}`}
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          </div>
        </Link>

        <div className="relative mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onEditProfile}
            disabled={!userProfile}
            className="pressable inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-secondary px-4 text-sm font-semibold disabled:opacity-50"
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
              className="pressable grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <StatTile icon={Flame} color="hsl(var(--primary))" value={streak} label={`${pluralForm(streak, 'dzień', 'dni', 'dni')} serii`} isLoading={statsPending} />
        <StatTile icon={Coins} color="hsl(var(--food))" value={stats?.currentFitCoins ?? 0} label="FitCoins" isLoading={statsPending} />
        <StatTile icon={Medal} color="hsl(var(--social))" value={badges} label={pluralForm(badges, 'odznaka', 'odznaki', 'odznak')} isLoading={statsPending} />
      </div>
    </section>
  );
}
