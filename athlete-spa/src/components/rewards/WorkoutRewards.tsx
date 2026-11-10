import { Link } from 'react-router-dom';
import { ChevronRight, Flame, Sparkles, Target, TrendingUp } from 'lucide-react';
import { pluralForm } from '@/lib/plural';
import type { RewardSummary } from '@/hooks/useRewards';
import { rarityOf, rewardIcon, tint } from './reward-meta';

function Line({ icon: Icon, color, title, detail, xp }: { icon: typeof Flame; color: string; title: string; detail?: string; xp?: number }) {
  return (
    <li className="flex items-center gap-3 rounded-xl bg-background/70 p-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: tint(color, 18), color }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {detail && <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
      {xp ? <span className="shrink-0 text-xs font-semibold tabular-nums text-volt">+{xp} XP</span> : null}
    </li>
  );
}

/** Co wpadło za ten trening: punkty, seria, awans, osiągnięcia, cele i wyzwania. */
export function WorkoutRewards({ rewards }: { rewards: RewardSummary }) {
  const records = rewards.newRecords.length;

  return (
    <section className="rounded-2xl bg-volt/10 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-volt font-display text-lg font-bold leading-none text-volt-foreground">
          +{rewards.xp}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold">Zdobyte w tym treningu</h3>
          <p className="text-xs text-muted-foreground">
            {rewards.xp} XP · poziom {rewards.level}
            {records > 0 && ` · ${records} ${pluralForm(records, 'rekord', 'rekordy', 'rekordów')}`}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {rewards.levelUp && (
          <Line
            icon={TrendingUp}
            color="hsl(var(--volt))"
            title={`Awans na poziom ${rewards.levelUp.to}`}
            detail={`Z poziomu ${rewards.levelUp.from}`}
          />
        )}
        {rewards.streakDays > 1 && (
          <Line
            icon={Flame}
            color="hsl(var(--primary))"
            title={`Seria: ${rewards.streakDays} ${pluralForm(rewards.streakDays, 'dzień', 'dni', 'dni')} z rzędu`}
            detail={rewards.streakBonus > 0 ? 'Kamień milowy serii' : undefined}
            xp={rewards.streakBonus || undefined}
          />
        )}
        {rewards.unlocked.map(item => (
          <Line
            key={item.achievementId}
            icon={rewardIcon(item.icon)}
            color={rarityOf(item.rarity).color}
            title={item.name}
            detail={item.description}
            xp={item.pointsAwarded}
          />
        ))}
        {rewards.goalsCompleted.map(goal => (
          <Line key={goal.id} icon={Target} color="hsl(var(--volt))" title={`Cel osiągnięty: ${goal.title}`} xp={goal.points || undefined} />
        ))}
        {rewards.quests.map(quest => (
          <Line key={quest.id} icon={Sparkles} color="hsl(var(--food))" title={quest.title} detail="Wyzwanie tygodnia" xp={quest.xp} />
        ))}
      </ul>

      <Link
        to="/athlete/goals"
        className="row-tap -mx-1 mt-2 flex items-center justify-between rounded-xl px-1 py-2 text-sm font-medium text-muted-foreground"
      >
        Cele i osiągnięcia
        <ChevronRight className="h-4 w-4 shrink-0" />
      </Link>
    </section>
  );
}
