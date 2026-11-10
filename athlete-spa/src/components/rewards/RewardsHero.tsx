import { Link } from 'react-router-dom';
import { ChevronRight, Coins, Flame, Medal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { pluralForm } from '@/lib/plural';
import type { RewardsOverview } from '@/hooks/useRewards';
import { formatNumber, formatVolume, tint } from './reward-meta';

function Counter({ icon: Icon, color, value, label }: { icon: LucideIcon; color: string; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-background/60 px-3 py-2.5">
      <p className="flex items-center gap-1.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md" style={{ background: tint(color, 16), color }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="font-display text-xl font-bold leading-none tabular-nums">{value}</span>
      </p>
      <p className="mt-1.5 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Lifetime({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="font-display text-2xl font-bold leading-none tabular-nums">
        {value}
        {unit && <span className="ml-1 font-body text-xs font-semibold text-muted-foreground">{unit}</span>}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/** Poziom, seria i dorobek „od początku” — to, za co aplikacja nagradza. */
export function RewardsHero({ overview }: { overview: RewardsOverview }) {
  const { profile, stats } = overview;
  const xpPercent = profile.xpForNextLevel > 0 ? (profile.currentXP / profile.xpForNextLevel) * 100 : 0;
  const volume = formatVolume(stats.totalVolumeKg);

  return (
    <section className="rounded-2xl bg-card p-4">
      <div className="flex items-end justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-muted-foreground">Poziom</span>
          <span className="font-display text-[2.5rem] font-bold leading-none tabular-nums">{profile.level}</span>
        </p>
        <p className="pb-1 text-xs font-medium tabular-nums text-muted-foreground">
          {formatNumber(profile.currentXP, 0)} / {formatNumber(profile.xpForNextLevel, 0)} XP
        </p>
      </div>
      <Progress value={xpPercent} className="mt-2 h-2 bg-foreground/10" />

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <Counter
          icon={Flame}
          color="hsl(var(--primary))"
          value={String(profile.streakDays)}
          label={`${pluralForm(profile.streakDays, 'dzień', 'dni', 'dni')} serii`}
        />
        <Counter
          icon={Medal}
          color="hsl(var(--social))"
          value={`${profile.achievementCount}/${profile.achievementTotal}`}
          label="Osiągnięcia"
        />
        <Counter icon={Coins} color="hsl(var(--food))" value={formatNumber(profile.currentFitCoins, 0)} label="FitCoins" />
      </div>

      <div className="mt-4 border-t border-border/60 pt-3.5">
        <p className="eyebrow">Twój dorobek</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Lifetime value={volume.value} unit={volume.unit} label="Podniesione" />
          <Lifetime value={formatNumber(stats.workoutCount, 0)} label="Treningi" />
          <Lifetime value={formatNumber(stats.prCount, 0)} label="Rekordy" />
        </div>
      </div>

      <Link
        to="/athlete/gamification"
        className="row-tap -mx-1 mt-3 flex items-center justify-between rounded-xl px-1 py-2 text-sm font-medium text-muted-foreground"
      >
        Wymień FitCoins na nagrody i zobacz ranking
        <ChevronRight className="h-4 w-4 shrink-0" />
      </Link>
    </section>
  );
}
