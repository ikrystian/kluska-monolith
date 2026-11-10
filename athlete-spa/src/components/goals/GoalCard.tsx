import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, MoreVertical, Pencil, Plus, Share2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { pluralForm } from '@/lib/plural';
import type { GoalView } from '@/hooks/useRewards';
import { ProgressRing } from '@/components/rewards/ProgressRing';
import { formatNumber, templateFor, tint } from '@/components/rewards/reward-meta';

const days = (count: number) => `${count} ${pluralForm(count, 'dzień', 'dni', 'dni')}`;

/** Jedno zdanie o tym, jak cel stoi względem terminu. */
function paceLine(goal: GoalView): { text: string; tone: 'muted' | 'good' | 'warn' | 'bad' } {
  const { status, daysLeft, projectedDate } = goal.pace;
  const projected = projectedDate ? format(new Date(projectedDate), 'd MMM', { locale: pl }) : null;
  const left = daysLeft === null ? null : daysLeft === 0 ? 'termin dziś' : `zostało ${days(daysLeft)}`;

  switch (status) {
    case 'done':
      return { text: 'Cel osiągnięty', tone: 'good' };
    case 'overdue':
      return { text: `${days(Math.abs(daysLeft ?? 0))} po terminie`, tone: 'bad' };
    case 'on_track':
      return { text: `W tempie · ${left}`, tone: 'good' };
    case 'behind':
      return { text: `Za wolno · ${left}${projected ? ` · w tym tempie ${projected}` : ''}`, tone: 'warn' };
    case 'not_started':
      return { text: `Jeszcze nie ruszył · ${left}`, tone: 'muted' };
    default:
      return { text: projected ? `Bez terminu · w tym tempie ${projected}` : 'Bez terminu', tone: 'muted' };
  }
}

const TONE = {
  muted: 'text-muted-foreground',
  good: 'text-volt',
  warn: 'text-food',
  bad: 'text-destructive',
};

interface GoalCardProps {
  goal: GoalView;
  busy?: boolean;
  onUpdateProgress: (goal: GoalView) => void;
  onComplete: (goal: GoalView) => void;
  onEdit: (goal: GoalView) => void;
  onShare: (goal: GoalView) => void;
  onDelete: (goal: GoalView) => void;
}

export function GoalCard({ goal, busy, onUpdateProgress, onComplete, onEdit, onShare, onDelete }: GoalCardProps) {
  const template = templateFor(goal.metric);
  const Icon = template.icon;
  const pace = paceLine(goal);
  const color = goal.reached ? 'hsl(var(--volt))' : template.color;

  return (
    <article className="rounded-2xl bg-card p-4">
      <div className="flex items-start gap-3.5">
        <ProgressRing value={goal.percent / 100} size={60} color={color}>
          {goal.reached ? (
            <Check className="h-6 w-6 text-volt" strokeWidth={3} />
          ) : (
            <span className="font-display text-lg font-bold leading-none tabular-nums">
              {goal.percent}
              <span className="text-[0.6em] text-muted-foreground">%</span>
            </span>
          )}
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md" style={{ background: tint(template.color, 16), color: template.color }}>
              <Icon className="h-3 w-3" />
            </span>
            <span className="truncate">{template.label}</span>
            {goal.auto && (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold">auto</span>
            )}
          </p>
          <h3 className="mt-1 text-[15px] font-semibold leading-snug">{goal.title}</h3>
          <p className="mt-1 font-display text-xl font-bold leading-none tabular-nums">
            {formatNumber(goal.current)}
            <span className="font-body text-sm font-medium text-muted-foreground">
              {' '}
              / {formatNumber(goal.target)} {goal.unit}
            </span>
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Opcje celu ${goal.title}`}
              className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-secondary"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(goal)}>
              <Pencil className="mr-2 h-4 w-4" /> Edytuj
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShare(goal)}>
              <Share2 className="mr-2 h-4 w-4" /> Udostępnij
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(goal)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Usuń
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className={cn('min-w-0 text-xs font-medium', TONE[pace.tone])}>{pace.text}</p>
        {goal.reached ? (
          <Button size="sm" className="shrink-0" disabled={busy} onClick={() => onComplete(goal)}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Odbierz nagrodę
          </Button>
        ) : (
          !goal.auto && (
            <Button size="sm" variant="secondary" className="shrink-0" onClick={() => onUpdateProgress(goal)}>
              <Plus className="mr-1 h-4 w-4" /> Postęp
            </Button>
          )
        )}
      </div>
    </article>
  );
}
