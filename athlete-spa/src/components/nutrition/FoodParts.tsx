import type { ReactNode } from 'react';
import { ArrowLeft, Coffee, Cookie, Minus, Moon, Plus, Sun, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { MEAL_TYPES, MEAL_TYPE_LABELS, type DiaryGoal, type DiaryTotals, type MealType } from '@/lib/nutrition';
import { cn } from '@/lib/utils';

export const MEAL_TYPE_ICONS: Record<MealType, LucideIcon> = {
    Breakfast: Coffee,
    Lunch: Sun,
    Dinner: Moon,
    Snack: Cookie,
};

/** Segmented picker for the diary section the food goes to. */
export function MealTypePicker({ value, onChange }: { value: MealType; onChange: (type: MealType) => void }) {
    return (
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-secondary/60 p-1" role="radiogroup" aria-label="Posiłek">
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
                            'flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-colors',
                            active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                        )}
                    >
                        <Icon className={cn('h-4 w-4', active && 'text-food')} />
                        <span className="w-full truncate text-center">{MEAL_TYPE_LABELS[type]}</span>
                    </button>
                );
            })}
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
                        <span className="text-lg font-bold leading-none tabular-nums">{item.value.toFixed(1)}</span>
                        <span className="mt-1 text-[11px] text-muted-foreground">{item.label} (g)</span>
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

/** One tappable food/dish row: name, detail line, calories on the right and an optional trailing action. */
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
        <div className="flex items-center gap-1 rounded-2xl bg-secondary/40 pr-1.5 transition-colors active:bg-secondary/70">
            <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left">
                {icon}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{title}</p>
                    <p className="truncate text-xs text-muted-foreground">{detail}</p>
                </div>
                <div className="shrink-0 pr-1.5 text-right">
                    <p className="text-sm font-bold tabular-nums">{Math.round(calories)}</p>
                    <p className="text-[10px] text-muted-foreground">{caloriesLabel}</p>
                </div>
            </button>
            {trailing}
        </div>
    );
}

export function FoodIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
    return (
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background/60 text-muted-foreground', className)}>
            <Icon className="h-4 w-4" />
        </span>
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
