import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { formatKcal, shiftISO, todayISO, weekOf, type DiaryDaySummary, type DiaryGoal } from '@/lib/nutrition';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

const RING = 34;
const STROKE = 3;
const RADIUS = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** How a logged day reads against the goal: still under, on target (±5%) or over. */
function dayState(calories: number, goal: number | null): { share: number; tone: 'none' | 'under' | 'hit' | 'over' } {
    if (calories <= 0) return { share: 0, tone: 'none' };
    if (!goal) return { share: 1, tone: 'under' };
    const ratio = calories / goal;
    if (ratio > 1.05) return { share: 1, tone: 'over' };
    if (ratio >= 0.95) return { share: 1, tone: 'hit' };
    return { share: ratio, tone: 'under' };
}

const TONE_STROKE = {
    none: 'transparent',
    under: 'hsl(var(--food))',
    hit: 'hsl(var(--volt))',
    over: 'hsl(var(--destructive))',
} as const;

/** Monday first; date-fns' short Polish names ("nie" for Sunday) read oddly on their own. */
const WEEKDAYS = ['pn', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];

const TONE_LABEL = { none: 'brak wpisów', under: 'poniżej celu', hit: 'cel trafiony', over: 'ponad cel' } as const;

interface WeekStripProps {
    date: string;
    onChange: (date: string) => void;
    /** Per-day totals of the visible week; days without entries are simply missing. */
    days?: DiaryDaySummary[];
    goal: DiaryGoal | null;
}

/**
 * The week around the open day: one tap per day, each with a ring showing how
 * much of the calorie goal was eaten, so missed and finished days stand out.
 */
export function WeekStrip({ date, onChange, days, goal }: WeekStripProps) {
    const today = todayISO();
    const week = useMemo(() => weekOf(date), [date]);
    const byDate = useMemo(() => new Map((days ?? []).map((day) => [day.date, day])), [days]);
    const isToday = date === today;
    const parsed = parseISO(date);

    const logged = week.map((day) => byDate.get(day)).filter((day): day is DiaryDaySummary => !!day && day.calories > 0);
    const average = logged.length >= 2 ? logged.reduce((sum, day) => sum + day.calories, 0) / logged.length : null;

    const go = (next: string) => {
        if (next === date) return;
        haptic('tap');
        onChange(next);
    };

    return (
        <div data-tour="nutrition-day" className="space-y-2.5">
            <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 px-1">
                    <p className="truncate text-[17px] font-bold capitalize leading-tight">
                        {isToday ? 'Dzisiaj' : date === shiftISO(today, -1) ? 'Wczoraj' : date === shiftISO(today, 1) ? 'Jutro' : format(parsed, 'EEEE', { locale: pl })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {format(parsed, 'd MMMM', { locale: pl })}
                        {average !== null && <span className="tabular-nums"> · śr. tygodnia {formatKcal(average)} kcal</span>}
                    </p>
                </div>
                {!isToday && (
                    <button
                        type="button"
                        onClick={() => go(today)}
                        className="pressable-sm h-9 shrink-0 rounded-full bg-secondary px-3.5 text-[13px] font-semibold"
                    >
                        Dziś
                    </button>
                )}
                <div className="flex shrink-0 gap-1">
                    <button
                        type="button"
                        onClick={() => go(shiftISO(date, -7))}
                        aria-label="Poprzedni tydzień"
                        className="pressable-sm grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground"
                    >
                        <ChevronLeft className="h-[18px] w-[18px]" />
                    </button>
                    <button
                        type="button"
                        onClick={() => go(shiftISO(date, 7))}
                        aria-label="Następny tydzień"
                        className="pressable-sm grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground"
                    >
                        <ChevronRight className="h-[18px] w-[18px]" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Dni tygodnia">
                {week.map((day, index) => {
                    const selected = day === date;
                    const calories = byDate.get(day)?.calories ?? 0;
                    const { share, tone } = dayState(calories, goal?.dailyCalories ?? null);
                    const dayDate = parseISO(day);
                    return (
                        <button
                            key={day}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            aria-label={`${format(dayDate, 'EEEE, d MMMM', { locale: pl })}${calories > 0 ? `, ${formatKcal(calories)} kcal, ${TONE_LABEL[tone]}` : ', brak wpisów'}`}
                            onClick={() => go(day)}
                            className={cn(
                                'flex min-w-0 flex-col items-center gap-1.5 rounded-2xl pb-2 pt-2 transition-colors',
                                selected ? 'bg-card' : 'active:bg-card/60'
                            )}
                        >
                            <span
                                className={cn(
                                    'text-[11px] font-semibold leading-none',
                                    day === today ? 'text-primary' : selected ? 'text-foreground' : 'text-muted-foreground'
                                )}
                            >
                                {day === today ? 'dziś' : WEEKDAYS[index]}
                            </span>
                            <span className="relative grid place-items-center" style={{ width: RING, height: RING }}>
                                <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} className="absolute inset-0 -rotate-90" aria-hidden>
                                    <circle cx={RING / 2} cy={RING / 2} r={RADIUS} fill="none" stroke="hsl(var(--foreground) / 0.1)" strokeWidth={STROKE} />
                                    {share > 0 && (
                                        <circle
                                            cx={RING / 2}
                                            cy={RING / 2}
                                            r={RADIUS}
                                            fill="none"
                                            stroke={TONE_STROKE[tone]}
                                            strokeWidth={STROKE}
                                            strokeLinecap="round"
                                            strokeDasharray={CIRCUMFERENCE}
                                            strokeDashoffset={CIRCUMFERENCE * (1 - share)}
                                            className="transition-[stroke-dashoffset] duration-500"
                                        />
                                    )}
                                </svg>
                                <span
                                    className={cn(
                                        'font-display text-[15px] font-bold leading-none tabular-nums',
                                        !selected && day > today && 'text-muted-foreground'
                                    )}
                                >
                                    {dayDate.getDate()}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
