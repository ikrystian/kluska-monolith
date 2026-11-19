import { AudioLines } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPaceS, type AdvancedGoal } from '@/lib/advanced-goal';
import type { CoachUpdate } from '@/hooks/useRunCoach';
import type { CoachAdvice } from '@/lib/run-tracking';

const STATUS_STYLE: Record<CoachAdvice['status'], string> = {
  ahead: 'bg-volt text-volt-foreground',
  on_track: 'bg-primary text-primary-foreground',
  behind: 'bg-food text-white',
  at_risk: 'bg-destructive text-destructive-foreground',
  achieved: 'bg-volt text-volt-foreground',
};

function statusLabel(advice: CoachAdvice, goal: AdvancedGoal, km: number): string {
  if (advice.goalCompleted && advice.status !== 'achieved') return 'Dystans zaliczony';
  switch (advice.status) {
    case 'ahead':
      // For an even-pace plan (or the first half of a negative split) faster isn't better.
      return goal.kind === 'steady_pace' || (goal.kind === 'negative_split' && km <= goal.distanceKm / 2)
        ? 'Za szybko'
        : 'Przed planem';
    case 'on_track':
      return 'W planie';
    case 'behind':
      return 'Za planem';
    case 'at_risk':
      return 'Cel zagrożony';
    case 'achieved':
      return 'Cel osiągnięty';
  }
}

/** "13 s za planem" — only for goals with a time or pace plan to measure against. */
function deltaLabel(advice: CoachAdvice, goal: AdvancedGoal): string | null {
  const hasPlan =
    goal.kind === 'distance_time' ||
    goal.kind === 'progressive' ||
    (goal.kind === 'steady_pace' && goal.targetPaceSPerKm != null) ||
    (goal.kind === 'negative_split' && goal.targetTimeS != null);
  if (!hasPlan || advice.deltaVsPlanS == null) return null;
  const abs = Math.abs(Math.round(advice.deltaVsPlanS));
  if (abs < 3) return 'równo z planem';
  const amount = abs >= 60 ? `${Math.floor(abs / 60)} min ${abs % 60} s` : `${abs} s`;
  return `${amount} ${advice.deltaVsPlanS > 0 ? 'za planem' : 'przed planem'}`;
}

interface CoachBannerProps {
  goal: AdvancedGoal;
  latest: CoachUpdate | null;
  pendingKm: number | null;
}

/** Latest AI coach advice floating over the run map; stays up until the next kilometre's. */
export function CoachBanner({ goal, latest, pendingKm }: CoachBannerProps) {
  const advice = latest?.coaching;
  if (!advice && pendingKm == null) return null;

  return (
    <div className="space-y-1.5 rounded-2xl bg-black/60 px-3 py-2.5 text-white backdrop-blur-md">
      {advice && latest && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', STATUS_STYLE[advice.status])}>
              {statusLabel(advice, goal, latest.km)}
            </span>
            <span className="text-xs font-semibold text-white/70">
              Km {latest.km}
              {deltaLabel(advice, goal) && ` · ${deltaLabel(advice, goal)}`}
            </span>
          </div>
          <div className="flex items-baseline gap-3 text-sm font-semibold tabular-nums">
            <span>
              <span className="text-white/60">Ostatni km </span>
              {formatPaceS(advice.currentPaceSPerKm)}
            </span>
            {advice.nextKmTargetSplitS != null && !advice.goalCompleted && (
              <span>
                <span className="text-white/60">Następny </span>
                {formatPaceS(advice.nextKmTargetSplitS)}/km
              </span>
            )}
          </div>
          {advice.tip && <p className="text-xs text-white/80">{advice.tip}</p>}
        </>
      )}
      {pendingKm != null && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
          <AudioLines className="h-3.5 w-3.5 animate-pulse" />
          Trener analizuje {pendingKm}. km…
        </p>
      )}
    </div>
  );
}
