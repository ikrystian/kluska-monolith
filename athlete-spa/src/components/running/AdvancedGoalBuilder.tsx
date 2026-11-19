import { useState, type ReactNode } from 'react';
import {
  AudioLines,
  ChartNoAxesColumnIncreasing,
  Minus,
  MoveRight,
  Plus,
  Timer,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PACE_S,
  DISTANCE_PRESETS_KM,
  DURATION_PRESETS_MIN,
  GOAL_KIND_META,
  PACE_MAX_S,
  PACE_MIN_S,
  PACE_STEP_S,
  STEP_PRESETS_S,
  describeGoal,
  formatDurationS,
  formatGoalKm,
  formatPaceS,
  progressiveFinalPace,
  targetPaceOf,
  type AdvancedGoal,
  type AdvancedGoalKind,
  type AdvancedGoalTarget,
} from '@/lib/advanced-goal';

const KIND_ICONS: Record<AdvancedGoalKind, LucideIcon> = {
  distance_time: Timer,
  steady_pace: MoveRight,
  negative_split: TrendingUp,
  progressive: ChartNoAxesColumnIncreasing,
};

const KINDS: AdvancedGoalKind[] = ['distance_time', 'steady_pace', 'negative_split', 'progressive'];

const DISTANCE_MIN_KM = 1;
const DISTANCE_MAX_KM = 100;
const DISTANCE_STEP_KM = 0.5;
/** Goal time moves in half-minute taps; finer control comes from the pace stepper. */
const TIME_STEP_S = 30;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundTo = (value: number, step: number) => Math.round(value / step) * step;

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
);

function ChipRow<T extends number | string>({
  options,
  value,
  onChange,
  format,
}: {
  options: T[];
  value: T | null;
  onChange: (value: T) => void;
  format: (value: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors active:scale-95',
            value === option
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border/60 text-foreground hover:border-primary/30'
          )}
        >
          {format(option)}
        </button>
      ))}
    </div>
  );
}

function Stepper({
  label,
  value,
  onDecrement,
  onIncrement,
  canDecrement = true,
  canIncrement = true,
}: {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement?: boolean;
  canIncrement?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 py-2 pl-4 pr-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`${label}: mniej`}
          onClick={onDecrement}
          disabled={!canDecrement}
          className="grid h-9 w-9 place-items-center rounded-xl bg-secondary transition-transform active:scale-90 disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[5.25rem] text-center font-display text-2xl font-bold tabular-nums leading-none">
          {value}
        </span>
        <button
          type="button"
          aria-label={`${label}: więcej`}
          onClick={onIncrement}
          disabled={!canIncrement}
          className="grid h-9 w-9 place-items-center rounded-xl bg-secondary transition-transform active:scale-90 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Distance chips plus a ±0.5 km stepper for anything in between. */
function DistancePicker({ value, onChange }: { value: number; onChange: (km: number) => void }) {
  return (
    <div className="space-y-2">
      <SectionLabel>Dystans</SectionLabel>
      <ChipRow options={DISTANCE_PRESETS_KM} value={value} onChange={onChange} format={(km) => `${formatGoalKm(km)} km`} />
      <Stepper
        label="Dystans (km)"
        value={formatGoalKm(value)}
        onDecrement={() => onChange(clamp(roundTo(value - DISTANCE_STEP_KM, DISTANCE_STEP_KM), DISTANCE_MIN_KM, DISTANCE_MAX_KM))}
        onIncrement={() => onChange(clamp(roundTo(value + DISTANCE_STEP_KM, DISTANCE_STEP_KM), DISTANCE_MIN_KM, DISTANCE_MAX_KM))}
        canDecrement={value > DISTANCE_MIN_KM}
        canIncrement={value < DISTANCE_MAX_KM}
      />
    </div>
  );
}

function PaceStepper({ label, value, onChange }: { label: string; value: number; onChange: (paceS: number) => void }) {
  return (
    <Stepper
      label={label}
      value={formatPaceS(value)}
      // A pace derived from a goal time (5:03) snaps to the 5-second grid on the first tap.
      onDecrement={() => onChange(clamp(Math.ceil(value / PACE_STEP_S) * PACE_STEP_S - PACE_STEP_S, PACE_MIN_S, PACE_MAX_S))}
      onIncrement={() => onChange(clamp(Math.floor(value / PACE_STEP_S) * PACE_STEP_S + PACE_STEP_S, PACE_MIN_S, PACE_MAX_S))}
      canDecrement={value > PACE_MIN_S}
      canIncrement={value < PACE_MAX_S}
    />
  );
}

/**
 * Goal time and pace for a fixed distance, linked: change either and the
 * other follows, so "10 km in 50 min" and "10 km at 5:00/km" are both one tap
 * sequence away.
 */
function TimeAndPace({
  distanceKm,
  timeS,
  onTimeChange,
}: {
  distanceKm: number;
  timeS: number;
  onTimeChange: (timeS: number) => void;
}) {
  const minTime = Math.ceil(PACE_MIN_S * distanceKm);
  const maxTime = Math.floor(PACE_MAX_S * distanceKm);
  const pace = timeS / distanceKm;
  return (
    <div className="space-y-2">
      <Stepper
        label="Czas"
        value={formatDurationS(timeS)}
        onDecrement={() => onTimeChange(clamp(roundTo(timeS - TIME_STEP_S, TIME_STEP_S), minTime, maxTime))}
        onIncrement={() => onTimeChange(clamp(roundTo(timeS + TIME_STEP_S, TIME_STEP_S), minTime, maxTime))}
        canDecrement={timeS > minTime}
        canIncrement={timeS < maxTime}
      />
      <PaceStepper
        label="Tempo (/km)"
        value={pace}
        onChange={(nextPace) => onTimeChange(Math.round(nextPace * distanceKm))}
      />
    </div>
  );
}

interface AdvancedGoalBuilderProps {
  onStart: (goal: AdvancedGoal) => void;
}

/**
 * Composes an advanced goal from preset options: pick one of four templates,
 * then its distance / time / pace with chips and steppers — no free typing,
 * so every combination is one the coach backend accepts.
 */
export function AdvancedGoalBuilder({ onStart }: AdvancedGoalBuilderProps) {
  const [kind, setKind] = useState<AdvancedGoalKind>('distance_time');
  const [distanceKm, setDistanceKm] = useState(5);
  const [timeS, setTimeS] = useState(5 * DEFAULT_PACE_S);
  const [durationMin, setDurationMin] = useState(40);
  const [steadyPaceS, setSteadyPaceS] = useState<number | null>(null);
  const [negativeTimed, setNegativeTimed] = useState(false);
  const [startPaceS, setStartPaceS] = useState(360);
  const [stepS, setStepS] = useState(10);
  const [voiceCoach, setVoiceCoach] = useState(true);

  /** A new distance keeps the pace the athlete already chose. */
  const changeDistance = (km: number) => {
    const pace = timeS / distanceKm;
    setDistanceKm(km);
    setTimeS(clamp(roundTo(pace * km, 5), Math.ceil(PACE_MIN_S * km), Math.floor(PACE_MAX_S * km)));
  };

  const target: AdvancedGoalTarget = (() => {
    switch (kind) {
      case 'distance_time':
        return { kind, distanceKm, targetTimeS: timeS };
      case 'steady_pace':
        return { kind, durationMin, targetPaceSPerKm: steadyPaceS };
      case 'negative_split':
        return { kind, distanceKm, targetTimeS: negativeTimed ? timeS : null };
      case 'progressive':
        return { kind, distanceKm, startPaceSPerKm: startPaceS, stepSPerKm: stepS };
    }
  })();

  const summaryDetail = (() => {
    switch (target.kind) {
      case 'distance_time':
        return `Średnie tempo ${formatPaceS(targetPaceOf(target) ?? 0)}/km przez cały dystans.`;
      case 'steady_pace':
        return target.targetPaceSPerKm
          ? `Każdy kilometr jak najbliżej ${formatPaceS(target.targetPaceSPerKm)}/km.`
          : 'Trener pilnuje, żeby kolejne kilometry nie odjeżdżały od Twojej średniej.';
      case 'negative_split': {
        if (!target.targetTimeS) return 'Druga połowa dystansu szybciej niż pierwsza.';
        const pace = target.targetTimeS / target.distanceKm;
        return `Pierwsza połowa ok. ${formatPaceS(pace * 1.015)}/km, druga ok. ${formatPaceS(pace * 0.985)}/km.`;
      }
      case 'progressive':
        return `Start ${formatPaceS(target.startPaceSPerKm)}/km, ostatni km ${formatPaceS(progressiveFinalPace(target))}/km.`;
    }
  })();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5">
        {KINDS.map((option) => {
          const Icon = KIND_ICONS[option];
          const selected = option === kind;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              aria-pressed={selected}
              className={cn(
                'flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-colors active:scale-[0.98]',
                selected ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/30'
              )}
            >
              <Icon className={cn('h-5 w-5', selected ? 'text-primary' : 'text-muted-foreground')} />
              <span>
                <span className="block text-sm font-semibold leading-tight">{GOAL_KIND_META[option].title}</span>
                <span className="block text-xs text-muted-foreground">{GOAL_KIND_META[option].example}</span>
              </span>
            </button>
          );
        })}
      </div>

      {kind === 'distance_time' && (
        <>
          <DistancePicker value={distanceKm} onChange={changeDistance} />
          <div className="space-y-2">
            <SectionLabel>Czas docelowy</SectionLabel>
            <TimeAndPace distanceKm={distanceKm} timeS={timeS} onTimeChange={setTimeS} />
          </div>
        </>
      )}

      {kind === 'steady_pace' && (
        <>
          <div className="space-y-2">
            <SectionLabel>Czas biegu</SectionLabel>
            <ChipRow
              options={DURATION_PRESETS_MIN}
              value={durationMin}
              onChange={setDurationMin}
              format={(min) => `${min} min`}
            />
          </div>
          <div className="space-y-2">
            <SectionLabel>Tempo</SectionLabel>
            <ChipRow
              options={['free', 'set']}
              value={steadyPaceS == null ? 'free' : 'set'}
              onChange={(mode) => setSteadyPaceS(mode === 'free' ? null : DEFAULT_PACE_S)}
              format={(mode) => (mode === 'free' ? 'Moje tempo' : 'Ustaw tempo')}
            />
            {steadyPaceS != null && <PaceStepper label="Tempo (/km)" value={steadyPaceS} onChange={setSteadyPaceS} />}
          </div>
        </>
      )}

      {kind === 'negative_split' && (
        <>
          <DistancePicker value={distanceKm} onChange={changeDistance} />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <SectionLabel>Cel czasowy</SectionLabel>
              <Switch checked={negativeTimed} onCheckedChange={setNegativeTimed} aria-label="Cel czasowy" />
            </div>
            {negativeTimed && <TimeAndPace distanceKm={distanceKm} timeS={timeS} onTimeChange={setTimeS} />}
          </div>
        </>
      )}

      {kind === 'progressive' && (
        <>
          <DistancePicker value={distanceKm} onChange={changeDistance} />
          <div className="space-y-2">
            <SectionLabel>Tempo startowe</SectionLabel>
            <PaceStepper label="Pierwszy km (/km)" value={startPaceS} onChange={setStartPaceS} />
          </div>
          <div className="space-y-2">
            <SectionLabel>Przyspieszenie co kilometr</SectionLabel>
            <ChipRow options={STEP_PRESETS_S} value={stepS} onChange={setStepS} format={(s) => `−${s} s`} />
          </div>
        </>
      )}

      <div className="rounded-2xl bg-card p-4">
        <p className="font-display text-xl font-bold leading-tight">{describeGoal(target)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{summaryDetail}</p>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-border/60 p-3.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-run/15 text-run">
          <AudioLines className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Trener głosowy AI</p>
          <p className="text-sm text-muted-foreground">Co 1 km: postęp, tempo na kolejny km i wskazówki</p>
        </div>
        <Switch checked={voiceCoach} onCheckedChange={setVoiceCoach} aria-label="Trener głosowy AI" />
      </label>

      <Button className="w-full rounded-xl" size="lg" onClick={() => onStart({ ...target, voiceCoach })}>
        Rozpocznij bieg
      </Button>
    </div>
  );
}
