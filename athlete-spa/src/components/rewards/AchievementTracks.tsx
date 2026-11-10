import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, ChevronDown, Lock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import type { Track } from '@/hooks/useRewards';
import { formatNumber, rarityOf, rewardIcon, tint } from './reward-meta';

const withUnit = (value: number, unit: string) => (unit ? `${formatNumber(value)} ${unit}` : formatNumber(value));

function TrackRow({ track }: { track: Track }) {
  const [open, setOpen] = useState(false);
  const Icon = rewardIcon(track.icon);
  const complete = track.nextThreshold === null;
  const started = track.unlockedCount > 0 || track.value > 0;
  const color = complete ? 'hsl(var(--volt))' : started ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          haptic('tap');
          setOpen(value => !value);
        }}
        className="row-tap flex w-full items-center gap-3 p-3.5 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: tint(color, 16), color }}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold">{track.title}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {track.unlockedCount}/{track.tiers.length}
            </span>
          </span>
          <Progress value={track.progressToNext * 100} className="mt-2 h-1.5" />
          <span className="mt-1 block truncate text-xs tabular-nums text-muted-foreground">
            {complete
              ? `Ukończone · ${withUnit(track.value, track.unit)}`
              : `${withUnit(track.value, track.unit)} / ${withUnit(track.nextThreshold!, track.unit)}`}
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul className="space-y-1.5 px-3.5 pb-3.5">
          {track.tiers.map(tier => {
            const rarity = rarityOf(tier.rarity);
            return (
              <li
                key={tier.key}
                className={cn('flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5', !tier.unlocked && 'opacity-60')}
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                  style={
                    tier.unlocked
                      ? { background: rarity.color, color: 'hsl(var(--background))' }
                      : { background: tint(rarity.color, 18), color: rarity.color }
                  }
                >
                  {tier.unlocked ? <Check className="h-4 w-4" strokeWidth={3} /> : <Lock className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{tier.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {withUnit(tier.threshold, track.unit)} · {rarity.label}
                    {tier.unlockedAt && ` · ${format(new Date(tier.unlockedAt), 'd MMM yyyy', { locale: pl })}`}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">+{tier.xp} XP</span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/**
 * Osiągnięcia ułożone w ścieżki (Tonaż, Treningi, Seria…): każda pokazuje,
 * ile brakuje do następnego progu, a po rozwinięciu — wszystkie progi.
 */
export function AchievementTracks({ tracks }: { tracks: Track[] }) {
  // Najpierw ścieżki, w których coś się już dzieje; nietknięte na końcu.
  const ordered = [...tracks].sort((a, b) => {
    const weight = (track: Track) => (track.nextThreshold === null ? 1 : track.value > 0 ? 0 : 2);
    return weight(a) - weight(b) || b.progressToNext - a.progressToNext;
  });

  return (
    <ul className="divide-y divide-border/60 rounded-2xl bg-card">
      {ordered.map(track => (
        <TrackRow key={track.id} track={track} />
      ))}
    </ul>
  );
}
