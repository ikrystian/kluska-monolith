import type { ReactNode } from 'react';
import { ArrowLeft, Check, ChevronRight, Coffee, Cookie, Loader2, Minus, Moon, Plus, Sun, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { MEAL_TYPES, MEAL_TYPE_LABELS, formatGrams, formatKcal, type DiaryGoal, type DiaryTotals, type MealType } from '@/lib/nutrition';
import { cn } from '@/lib/utils';

export const MEAL_TYPE_ICONS: Record<MealType, LucideIcon> = {
    Breakfast: Coffee,
    Lunch: Sun,
    Dinner: Moon,
    Snack: Cookie,
};

/**
 * Segmented picker for the diary section the food goes to. `compact` drops the
 * icons for a single slim row — used where the picker sits above a long list.
 */
export function MealTypePicker({ value, onChange, compact }: { value: MealType; onChange: (type: MealType) => void; compact?: boolean }) {
    return (
        <div className={cn('grid grid-cols-4 gap-1 bg-secondary/60 p-1', compact ? 'rounded-xl' : 'rounded-2xl')} role="radiogroup" aria-label="Posiłek">
            {MEAL_TYPES.map((type) => {
                const Icon = MEAL_TYPE_ICONS[type];
                const active = value === type;
                return (
                    <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(type)}
                        className={cn(
                            'flex min-w-0 items-center font-semibold transition-colors',
                            compact ? 'h-8 justify-center rounded-lg px-1 text-[12.5px]' : 'flex-col gap-0.5 rounded-xl px-1 py-1.5 text-[11px]',
                            active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                        )}
                    >
                        {!compact && <Icon className={cn('h-4 w-4', active && 'text-food')} />}
                        <span className={cn('truncate', !compact && 'w-full text-center')}>{MEAL_TYPE_LABELS[type]}</span>
                    </button>
                );
            })}
        </div>
    );
}

/**
 * The day's calorie budget on one line: eaten so far, the portion being
 * considered (`pending`) and what would be left — the dialog's live answer to
 * "can I still fit this in?".
 */
export function BudgetLine({ goal, totals, pending = 0 }: { goal?: DiaryGoal | null; totals?: DiaryTotals; pending?: number }) {
    const eaten = totals?.calories ?? 0;
    if (!goal || goal.dailyCalories <= 0) {
        return (
            <p className="text-[13px] tabular-nums text-muted-foreground">
                Dziś <span className="font-semibold text-foreground">{formatKcal(eaten)} kcal</span>
                {pending > 0 && <span className="font-semibold text-food"> + {formatKcal(pending)}</span>}
            </p>
        );
    }

    const left = Math.round(goal.dailyCalories - eaten - pending);
    // Past the goal the bar stretches to fit everything, so the portion being added stays visible.
    const scale = Math.max(goal.dailyCalories, eaten + pending);
    const eatenWidth = (eaten / scale) * 100;
    const pendingWidth = (pending / scale) * 100;
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className={cn('h-full transition-[width] duration-300', left < 0 && pending === 0 ? 'bg-destructive' : 'bg-food/50')} style={{ width: `${eatenWidth}%` }} />
                <div className={cn('h-full transition-[width] duration-300', left < 0 ? 'bg-destructive' : 'bg-food')} style={{ width: `${pendingWidth}%` }} />
            </div>
            <p className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                {left >= 0 ? (pending > 0 ? 'zostanie ' : 'zostało ') : 'ponad cel o '}
                <span className={cn('font-semibold', left < 0 ? 'text-destructive' : 'text-foreground')}>{formatKcal(Math.abs(left))} kcal</span>
            </p>
        </div>
    );
}

/** "← Title" row for the dialog's sub-views. */
export function SubHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: ReactNode }) {
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={onBack}
                aria-label="Wstecz"
                className="-ml-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors active:bg-secondary"
            >
                <ArrowLeft className="h-5 w-5" />
            </button>
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</p>
            {action}
        </div>
    );
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <p className="eyebrow uppercase tracking-wide">{children}</p>
            {action}
        </div>
    );
}

/** Calories + macros of what is about to be added. */
export function MacroSummary({ calories, protein, carbs, fat }: { calories: number; protein: number; carbs: number; fat: number }) {
    const items = [
        { label: 'Białko', value: protein },
        { label: 'Węgle', value: carbs },
        { label: 'Tłuszcz', value: fat },
    ];
    return (
        <div className="flex items-stretch gap-3 rounded-2xl bg-secondary/50 p-3">
            <div className="flex min-w-[5.5rem] flex-col justify-center rounded-xl bg-food/15 px-3 py-2">
                <span className="font-display text-3xl font-bold leading-none tabular-nums text-food">{Math.round(calories)}</span>
                <span className="mt-1 text-[11px] font-medium text-muted-foreground">kcal</span>
            </div>
            <div className="grid flex-1 grid-cols-3 gap-2">
                {items.map((item) => (
                    <div key={item.label} className="flex flex-col justify-center">
                        <span className="text-lg font-bold leading-none tabular-nums">
                            {formatGrams(item.value)}
                            <span className="ml-0.5 text-xs font-medium text-muted-foreground">g</span>
                        </span>
                        <span className="mt-1 truncate text-[11px] text-muted-foreground">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** How the portion compares to the daily goal, with a bar showing today before/after. */
export function GoalImpact({ goal, totals, adding }: { goal?: DiaryGoal | null; totals?: DiaryTotals; adding: number }) {
    if (!goal || goal.dailyCalories <= 0) return null;
    const eaten = totals?.calories ?? 0;
    const remainingAfter = Math.round(goal.dailyCalories - eaten - adding);
    const percent = Math.round((adding / goal.dailyCalories) * 100);
    const eatenWidth = Math.min(100, (eaten / goal.dailyCalories) * 100);
    const addingWidth = Math.max(0, Math.min(100 - eatenWidth, (adding / goal.dailyCalories) * 100));

    return (
        <div className="space-y-2 rounded-2xl border px-3 py-2.5">
            <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-food/45" style={{ width: `${eatenWidth}%` }} />
                <div className={cn('h-full transition-[width] duration-300', remainingAfter < 0 ? 'bg-destructive' : 'bg-food')} style={{ width: `${addingWidth}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{percent}%</span> dziennego celu.{' '}
                {remainingAfter >= 0 ? (
                    <>Zostanie <span className="font-semibold text-foreground">{remainingAfter} kcal</span>.</>
                ) : (
                    <>Przekroczysz cel o <span className="font-semibold text-destructive">{-remainingAfter} kcal</span>.</>
                )}
            </p>
        </div>
    );
}

/** Groups food rows into one card with hairlines between them. */
export function FoodList({ children, className }: { children: ReactNode; className?: string }) {
    return <ul className={cn('divide-y divide-border/40 overflow-hidden rounded-2xl bg-secondary/40', className)}>{children}</ul>;
}

/** One tappable food/dish row: name, detail line, calories on the right and an optional trailing action. Lives inside a `FoodList`. */
export function FoodRow({
    icon,
    title,
    detail,
    calories,
    caloriesLabel,
    onClick,
    trailing,
}: {
    icon?: ReactNode;
    title: string;
    detail: ReactNode;
    calories: number;
    caloriesLabel: string;
    onClick: () => void;
    trailing?: ReactNode;
}) {
    return (
        <li className="flex items-center gap-1 pr-2">
            <button type="button" onClick={onClick} className="row-tap flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left">
                {icon}
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{detail}</span>
                </span>
                <span className="shrink-0 pr-1 text-right">
                    <span className="block text-sm font-bold tabular-nums">{formatKcal(calories)}</span>
                    <span className="block text-[10px] text-muted-foreground">{caloriesLabel}</span>
                </span>
            </button>
            {trailing ?? <ChevronRight className="mr-1 h-4 w-4 shrink-0 text-muted-foreground/60" />}
        </li>
    );
}

/** The one-tap "log it as it is" button of a row; turns into a tick with a counter once used. */
export function QuickAddButton({ label, busy, count, onClick }: { label: string; busy: boolean; count: number; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={busy}
            aria-label={label}
            className={cn(
                'relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors',
                count > 0 ? 'bg-lime text-lime-foreground' : 'bg-primary/15 text-primary active:bg-primary/25'
            )}
        >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : count > 0 ? <Check className="h-4 w-4" /> : <Plus className="h-[18px] w-[18px]" />}
            {count > 1 && !busy && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[10px] font-bold leading-none text-background">
                    {count}
                </span>
            )}
        </button>
    );
}

export function FoodIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
    return (
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background/60 text-muted-foreground', className)}>
            <Icon className="h-4 w-4" />
        </span>
    );
}

const QUICK_AMOUNTS = [50, 100, 150, 200, 250];

/** Big gram counter: type the weight, nudge it by 10 g or pick a common amount. */
export function GramsStepper({ value, onChange }: { value: string; onChange: (amount: string) => void }) {
    const grams = Number(value.replace(',', '.')) || 0;
    const step = (delta: number) => onChange(String(Math.min(5000, Math.max(5, Math.round((grams + delta) / 5) * 5))));
    return (
        <div className="rounded-2xl bg-secondary/40 p-3">
            <div className="flex items-center gap-3">
                <Button type="button" variant="secondary" size="icon" className="rounded-full bg-background/70" onClick={() => step(-10)} aria-label="Mniej">
                    <Minus className="h-4 w-4" />
                </Button>
                <label className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
                    <input
                        type="text"
                        inputMode="decimal"
                        maxLength={6}
                        value={value}
                        onChange={(event) => onChange(event.target.value.replace(/[^\d.,]/g, ''))}
                        onFocus={(event) => event.target.select()}
                        aria-label="Ilość w gramach"
                        style={{ width: `${Math.max(2, value.length) + 0.5}ch` }}
                        className="bg-transparent text-center font-display text-4xl font-bold tabular-nums outline-none"
                    />
                    <span className="text-sm font-medium text-muted-foreground">g</span>
                </label>
                <Button type="button" variant="secondary" size="icon" className="rounded-full bg-background/70" onClick={() => step(10)} aria-label="Więcej">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
                {QUICK_AMOUNTS.map((quick) => (
                    <button
                        key={quick}
                        type="button"
                        onClick={() => onChange(String(quick))}
                        className={cn(
                            'pressable-sm rounded-xl py-1.5 text-xs font-semibold transition-colors',
                            grams === quick ? 'bg-foreground text-background' : 'bg-background/60 text-muted-foreground'
                        )}
                    >
                        {quick} g
                    </button>
                ))}
            </div>
        </div>
    );
}

const QUICK_SERVINGS = [0.5, 1, 1.5, 2];

export const formatServings = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 2 });

/** Big portion counter with ± in half-serving steps and quick picks. */
export function ServingsStepper({ value, onChange, detail }: { value: number; onChange: (servings: number) => void; detail?: string }) {
    const step = (delta: number) => onChange(Math.min(10, Math.max(0.5, Math.round((value + delta) * 2) / 2)));
    return (
        <div className="rounded-2xl bg-secondary/40 p-3">
            <div className="flex items-center gap-3">
                <Button type="button" variant="secondary" size="icon" className="rounded-full bg-background/70" onClick={() => step(-0.5)} disabled={value <= 0.5} aria-label="Mniej">
                    <Minus className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1 text-center">
                    <span className="font-display text-4xl font-bold leading-none tabular-nums">{formatServings(value)}</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {value === 1 ? 'porcja' : 'porcji'}
                        {detail ? ` · ${detail}` : ''}
                    </p>
                </div>
                <Button type="button" variant="secondary" size="icon" className="rounded-full bg-background/70" onClick={() => step(0.5)} disabled={value >= 10} aria-label="Więcej">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
                {QUICK_SERVINGS.map((quick) => (
                    <button
                        key={quick}
                        type="button"
                        onClick={() => onChange(quick)}
                        className={cn(
                            'pressable-sm rounded-xl py-1.5 text-xs font-semibold transition-colors',
                            value === quick ? 'bg-foreground text-background' : 'bg-background/60 text-muted-foreground'
                        )}
                    >
                        {formatServings(quick)}×
                    </button>
                ))}
            </div>
        </div>
    );
}
