import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Flag, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialAvatar, socialName } from '@/components/social/SocialAvatar';
import { pluralPl } from '@/components/social/social-format';
import {
  formatChallengeKm,
  type ChallengeResult,
  type ChallengeSides,
} from '@/lib/challenges';

/** Shared pieces of the running-challenge screens: race lanes, lead line, result badge. */

// The app's two accents: you are lime (as in "ahead"), the opponent ember (as in "behind").
export const ME_COLOR = 'hsl(var(--volt))';
export const OPPONENT_COLOR = 'hsl(var(--primary))';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** "12 dni", "1 dzień", "5 h" — what is left until `endDate`. */
export function timeLeftLabel(endDate: string, now: Date = new Date()): string {
  const ms = new Date(endDate).getTime() - now.getTime();
  if (ms <= 0) return 'Koniec';
  const days = Math.floor(ms / DAY_MS);
  if (days >= 1) return `${days} ${pluralPl(days, 'dzień', 'dni', 'dni')}`;
  return `${Math.max(1, Math.ceil(ms / HOUR_MS))} h`;
}

export function deadlineLabel(endDate: string, pattern = 'd MMMM'): string {
  return format(new Date(endDate), pattern, { locale: pl });
}

/** Who leads and by how much, from the viewer's side. */
export function leadLine(sides: ChallengeSides): { text: string; tone: 'ahead' | 'behind' | 'even' } {
  const diff = sides.me.km - sides.opponent.km;
  if (Math.abs(diff) < 0.01) {
    return { text: sides.me.km === 0 ? 'Czekamy na pierwszy bieg' : 'Łeb w łeb', tone: 'even' };
  }
  return diff > 0
    ? { text: `Prowadzisz o ${formatChallengeKm(diff)} km`, tone: 'ahead' }
    : { text: `Tracisz ${formatChallengeKm(-diff)} km`, tone: 'behind' };
}

export const LEAD_TONE_CLASS = {
  ahead: 'text-volt',
  behind: 'text-primary',
  even: 'text-muted-foreground',
} as const;

/** Two thin progress bars, "Ty" over the opponent — for cards and rows. */
export function RaceBars({ sides, targetKm, className }: { sides: ChallengeSides; targetKm: number; className?: string }) {
  const lanes = [
    { key: 'me', label: 'Ty', km: sides.me.km, color: ME_COLOR },
    { key: 'opponent', label: socialName(sides.opponent.user), km: sides.opponent.km, color: OPPONENT_COLOR },
  ];
  return (
    <div className={cn('space-y-2', className)}>
      {lanes.map(lane => {
        const pct = Math.min(100, (lane.km / targetKm) * 100);
        return (
          <div key={lane.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate font-semibold">{lane.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                <span className="font-semibold text-foreground">{formatChallengeKm(lane.km)}</span> /{' '}
                {formatChallengeKm(targetKm)} km
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-label={`${lane.label}: ${formatChallengeKm(lane.km)} z ${formatChallengeKm(targetKm)} km`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
            >
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: lane.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The big race track of the detail screen: each runner's avatar travels from the
 * start towards the finish flag. With `live`, the runners keep bouncing, light
 * runs along their lanes and the flag waves — the race is still on.
 */
export function RaceTrack({ sides, targetKm, live = false }: { sides: ChallengeSides; targetKm: number; live?: boolean }) {
  const lanes = [
    { key: 'me', side: sides.me, color: ME_COLOR, label: 'Ty' },
    { key: 'opponent', side: sides.opponent, color: OPPONENT_COLOR, label: socialName(sides.opponent.user) },
  ];
  return (
    <div>
      <div className="relative space-y-3 pr-5">
        {/* Finish line */}
        <div
          aria-hidden
          className="absolute bottom-0 right-5 top-0 border-r-2 border-dashed border-foreground/25"
        />
        <motion.span
          aria-hidden
          className="absolute -top-1 right-0 origin-bottom-left text-foreground/60"
          animate={live ? { rotate: [-10, 12, -10] } : undefined}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flag className="h-4 w-4" />
        </motion.span>
        {lanes.map((lane, index) => {
          const pct = Math.min(100, (lane.side.km / targetKm) * 100);
          const travel = { duration: 1.4, delay: 0.5 + index * 0.15, ease: [0.16, 1, 0.3, 1] as const };
          return (
            <div
              key={lane.key}
              className="relative h-11"
              role="progressbar"
              aria-label={`${lane.label}: ${formatChallengeKm(lane.side.km)} z ${formatChallengeKm(targetKm)} km`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
            >
              <div className="absolute inset-x-0 top-1/2 -mt-[5px] h-2.5 rounded-full bg-secondary" />
              <motion.div
                className="absolute left-0 top-1/2 -mt-[5px] h-2.5 overflow-hidden rounded-full"
                style={{ backgroundColor: lane.color }}
                initial={{ width: '0%' }}
                animate={{ width: `${pct}%` }}
                transition={travel}
              >
                {live && pct > 0 && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                    initial={{ left: '-30%' }}
                    animate={{ left: '110%' }}
                    transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.9, ease: 'easeInOut', delay: 2 + index * 0.3 }}
                  />
                )}
              </motion.div>
              {/* The avatar rides in a lane one avatar shorter than the track, so it never overshoots. */}
              <div className="absolute inset-y-0 left-0 right-11">
                <motion.div
                  className="absolute top-0"
                  initial={{ left: '0%' }}
                  animate={{ left: `${pct}%` }}
                  transition={travel}
                >
                  <motion.span
                    className="block rounded-full p-[2px]"
                    style={{ backgroundColor: lane.color }}
                    animate={live ? { y: [0, -3, 0] } : undefined}
                    transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.25 }}
                  >
                    <SocialAvatar user={lane.side.user} className="h-10 w-10 border-2 border-card" />
                  </motion.span>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-semibold tabular-nums text-muted-foreground">
        <span>0 km</span>
        <span>{formatChallengeKm(targetKm)} km</span>
      </div>
    </div>
  );
}

export function ResultBadge({ result, className }: { result: ChallengeResult; className?: string }) {
  const view = {
    win: { label: 'Wygrana', className: 'bg-food/15 text-food', icon: true },
    loss: { label: 'Przegrana', className: 'bg-secondary text-muted-foreground', icon: false },
    draw: { label: 'Remis', className: 'bg-secondary text-foreground', icon: false },
  }[result];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        view.className,
        className
      )}
    >
      {view.icon && <Trophy className="h-3.5 w-3.5" />}
      {view.label}
    </span>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold tabular-nums',
        className
      )}
    >
      {children}
    </span>
  );
}

/** A small "me vs opponent" avatar pair. */
export function VersusAvatars({ sides, className }: { sides: ChallengeSides; className?: string }) {
  return (
    <span className={cn('flex shrink-0 -space-x-3', className)}>
      <SocialAvatar user={sides.opponent.user} className="h-11 w-11 border-2 border-card" />
      <SocialAvatar user={sides.me.user} className="h-11 w-11 border-2 border-card" />
    </span>
  );
}
