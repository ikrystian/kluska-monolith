import { PencilLine, Target } from 'lucide-react';

import { MACROS, formatGrams, formatKcal, type DiaryGoal, type DiaryTotals } from '@/lib/nutrition';
import { BigNumber } from '@/components/ui/section';
import { cn } from '@/lib/utils';

const RING = 92;
const STROKE = 9;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Share of the calorie goal eaten so far, as a ring with the percentage inside. */
function CalorieRing({ eaten, goal }: { eaten: number; goal: number }) {
    const ratio = goal > 0 ? eaten / goal : 0;
    const over = ratio > 1;
    return (
        <span className="relative grid shrink-0 place-items-center" style={{ width: RING, height: RING }}>
            <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} className="absolute inset-0 -rotate-90" aria-hidden>
                <circle cx={RING / 2} cy={RING / 2} r={RADIUS} fill="none" stroke="hsl(var(--secondary))" strokeWidth={STROKE} />
                <circle
                    cx={RING / 2}
                    cy={RING / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={over ? 'hsl(var(--destructive))' : 'hsl(var(--food))'}
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(1, ratio))}
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                />
            </svg>
            <span className="text-center leading-none">
                <span className="font-display text-[1.375rem] font-bold tabular-nums">{Math.round(ratio * 100)}%</span>
                <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">celu</span>
            </span>
        </span>
    );
}

interface DayBalanceProps {
    totals: DiaryTotals;
    goal: DiaryGoal | null;
    /** Opens the goal editor. */
    onEditGoal: () => void;
}

/** Calories left for the day, how much of the goal is eaten and where the three macros stand. */
export function DayBalance({ totals, goal, onEditGoal }: DayBalanceProps) {
    const remaining = goal ? goal.dailyCalories - totals.calories : null;
    const over = remaining !== null && remaining < 0;

    return (
        <section data-tour="nutrition-summary" className="rounded-2xl bg-card p-4">
            <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                    <p className="eyebrow">{remaining === null ? 'Zjedzone' : over ? 'Ponad cel' : 'Zostało'}</p>
                    <p className="mt-1.5 flex items-baseline gap-1.5">
                        <BigNumber
                            value={formatKcal(Math.abs(remaining ?? totals.calories))}
                            className={cn('text-[3.25rem]', over && 'text-destructive')}
                        />
                        <span className="text-sm font-medium text-muted-foreground">kcal</span>
                    </p>
                    {goal ? (
                        <button
                            type="button"
                            onClick={onEditGoal}
                            aria-label="Zmień cel dzienny"
                            className="-mx-1.5 mt-1.5 flex max-w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-[13px] tabular-nums text-muted-foreground active:bg-secondary"
                        >
                            <span className="truncate">
                                <span className="font-semibold text-foreground">{formatKcal(totals.calories)}</span> z {formatKcal(goal.dailyCalories)} kcal
                            </span>
                            <PencilLine className="h-3.5 w-3.5 shrink-0" />
                        </button>
                    ) : (
                        <p className="mt-1.5 text-[13px] text-muted-foreground">Bez celu trudno ocenić, ile jeszcze możesz zjeść.</p>
                    )}
                </div>
                {goal && <CalorieRing eaten={totals.calories} goal={goal.dailyCalories} />}
            </div>

            {!goal && (
                <button
                    type="button"
                    onClick={onEditGoal}
                    className="pressable-sm mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
                >
                    <Target className="h-4 w-4" />
                    Ustaw dzienny cel
                </button>
            )}

            <div className="mt-4 grid grid-cols-3 gap-3">
                {MACROS.map((macro) => {
                    const value = totals[macro.key];
                    const target = goal?.[macro.goalKey] ?? 0;
                    const percent = target > 0 ? Math.min(100, (value / target) * 100) : 0;
                    return (
                        <div key={macro.key} className="min-w-0">
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: macro.color }} />
                                <span className="truncate">{macro.label}</span>
                            </p>
                            <p className="mt-1 truncate text-[13px] tabular-nums text-muted-foreground">
                                <span className="text-[15px] font-bold text-foreground">{formatGrams(Math.round(value))}</span>
                                {target > 0 ? ` / ${target} g` : ' g'}
                            </p>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                                <div
                                    className="h-full rounded-full transition-[width] duration-500"
                                    style={{ width: `${target > 0 ? percent : value > 0 ? 100 : 0}%`, background: macro.color, opacity: target > 0 ? 1 : 0.45 }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
