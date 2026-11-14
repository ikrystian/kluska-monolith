import { CopyPlus, Loader2, Plus } from 'lucide-react';

import { MACROS, MEAL_TYPE_LABELS, formatGrams, formatKcal, sumTotals, type DiaryEntry, type MealType } from '@/lib/nutrition';
import { pluralForm } from '@/lib/plural';
import { MEAL_TYPE_ICONS } from '@/components/nutrition/FoodParts';
import { cn } from '@/lib/utils';

const formatAmount = (entry: DiaryEntry) => `${entry.amount.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} ${entry.unit}`;
const macroLine = (totals: { protein: number; carbs: number; fat: number }) =>
    MACROS.map((macro) => `${macro.short} ${formatGrams(totals[macro.key])}`).join(' · ');

interface MealSectionProps {
    type: MealType;
    entries: DiaryEntry[];
    /** The meal that fits the current time of day — its "+" is the primary action on the screen. */
    highlighted: boolean;
    onAdd: () => void;
    onOpenEntry: (entry: DiaryEntry) => void;
    /** What this meal looked like the day before; offered as a one-tap copy while the meal is empty. */
    previous?: DiaryEntry[];
    previousLabel: string;
    onCopyPrevious: () => void;
    isCopying: boolean;
}

/** One meal of the day: what was eaten, its calories, and the way to add more. */
export function MealSection({ type, entries, highlighted, onAdd, onOpenEntry, previous, previousLabel, onCopyPrevious, isCopying }: MealSectionProps) {
    const Icon = MEAL_TYPE_ICONS[type];
    const totals = sumTotals(entries);
    const hasEntries = entries.length > 0;
    const previousTotals = previous && previous.length > 0 ? sumTotals(previous) : null;

    return (
        <section data-tour="nutrition-meal" className="overflow-hidden rounded-2xl bg-card">
            <div className="flex items-center gap-3 py-2.5 pl-3.5 pr-2.5">
                <button type="button" onClick={onAdd} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Dodaj do: ${MEAL_TYPE_LABELS[type]}`}>
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary', hasEntries ? 'text-food' : 'text-muted-foreground')}>
                        <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                            <span className="truncate text-[15px] font-semibold">{MEAL_TYPE_LABELS[type]}</span>
                            {hasEntries && (
                                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-muted-foreground">{formatKcal(totals.calories)} kcal</span>
                            )}
                        </span>
                        <span className="block truncate text-xs tabular-nums text-muted-foreground">
                            {hasEntries ? macroLine({ protein: Math.round(totals.protein), carbs: Math.round(totals.carbs), fat: Math.round(totals.fat) }) : 'Nic jeszcze nie dodano'}
                        </span>
                    </span>
                </button>
                <button
                    type="button"
                    onClick={onAdd}
                    aria-hidden
                    tabIndex={-1}
                    className={cn(
                        'pressable-sm grid h-10 w-10 shrink-0 place-items-center rounded-full',
                        highlighted ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                    )}
                >
                    <Plus className="h-5 w-5" />
                </button>
            </div>

            {hasEntries && (
                <ul className="divide-y divide-border/50 border-t border-border/50">
                    {entries.map((entry) => (
                        <li key={entry.id}>
                            <button
                                type="button"
                                onClick={() => onOpenEntry(entry)}
                                aria-label={`Edytuj: ${entry.name}`}
                                className="row-tap flex w-full items-center gap-3 px-4 py-2.5 text-left"
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium">{entry.name}</span>
                                    <span className="block truncate text-xs tabular-nums text-muted-foreground">
                                        {formatAmount(entry)} · {macroLine(entry)}
                                    </span>
                                </span>
                                <span className="shrink-0 text-right">
                                    <span className="font-display text-xl font-bold leading-none tabular-nums">{formatKcal(entry.calories)}</span>
                                    <span className="ml-1 text-[11px] text-muted-foreground">kcal</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {!hasEntries && previous && previousTotals && (
                <button
                    type="button"
                    onClick={onCopyPrevious}
                    disabled={isCopying}
                    className="row-tap flex w-full items-center gap-3 border-t border-border/50 px-4 py-2.5 text-left disabled:opacity-60"
                >
                    <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold">{previousLabel}</span>
                        <span className="block truncate text-xs tabular-nums text-muted-foreground">
                            {previous.length === 1
                                ? previous[0].name
                                : `${previous.length} ${pluralForm(previous.length, 'produkt', 'produkty', 'produktów')}: ${previous.map((entry) => entry.name).join(', ')}`}
                        </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-muted-foreground">{formatKcal(previousTotals.calories)} kcal</span>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-volt">
                        {isCopying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CopyPlus className="h-4 w-4" />}
                    </span>
                </button>
            )}
        </section>
    );
}
