'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isSameDay,
    isToday,
    parseISO,
} from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from './FullCalendarWrapper';

interface DayStripProps {
    events: CalendarEvent[];
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    monthsBack?: number;
    monthsForward?: number;
    className?: string;
}

const MAX_DOTS = 3;

export function DayStrip({
    events,
    selectedDate,
    onDateSelect,
    monthsBack = 3,
    monthsForward = 12,
    className,
}: DayStripProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number>(0);

    const days = useMemo(() => {
        const today = new Date();
        return eachDayOfInterval({
            start: startOfMonth(subMonths(today, monthsBack)),
            end: endOfMonth(addMonths(today, monthsForward)),
        });
    }, [monthsBack, monthsForward]);

    const [visibleMonth, setVisibleMonth] = useState<Date>(selectedDate);

    // Kolory kropek wydarzeń pogrupowane po dniu (yyyy-MM-dd)
    const dotsByDay = useMemo(() => {
        const map = new Map<string, string[]>();
        events.forEach(event => {
            const key = format(new Date(event.start), 'yyyy-MM-dd');
            const dots = map.get(key) ?? [];
            if (dots.length < MAX_DOTS) {
                dots.push(event.backgroundColor ?? 'hsl(var(--primary))');
            }
            map.set(key, dots);
        });
        return map;
    }, [events]);

    const centerOnDate = useCallback((date: Date, behavior: ScrollBehavior = 'auto') => {
        const container = containerRef.current;
        if (!container) return;
        const cell = container.querySelector<HTMLElement>(
            `[data-date="${format(date, 'yyyy-MM-dd')}"]`
        );
        if (!cell) return;
        container.scrollTo({
            left: cell.offsetLeft - (container.clientWidth - cell.offsetWidth) / 2,
            behavior,
        });
    }, []);

    // Wyśrodkuj wybrany dzień przy pierwszym renderze
    useEffect(() => {
        centerOnDate(selectedDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Aktualizuj etykietę miesiąca na podstawie dnia znajdującego się na środku widoku
    const handleScroll = useCallback(() => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            const container = containerRef.current;
            if (!container) return;
            const center = container.scrollLeft + container.clientWidth / 2;
            const cells = container.querySelectorAll<HTMLElement>('[data-date]');
            for (const cell of cells) {
                if (cell.offsetLeft + cell.offsetWidth >= center) {
                    setVisibleMonth(parseISO(cell.dataset.date!));
                    break;
                }
            }
        });
    }, []);

    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

    const handleTodayClick = () => {
        const today = new Date();
        onDateSelect(today);
        centerOnDate(today, 'smooth');
    };

    return (
        <div className={className}>
            <div className="mb-3 flex items-center justify-between px-1">
                <p className="font-headline text-lg font-bold capitalize">
                    {format(visibleMonth, 'LLLL yyyy', { locale: pl })}
                </p>
                <Button variant="outline" size="sm" onClick={handleTodayClick}>
                    Dziś
                </Button>
            </div>
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="no-scrollbar flex snap-x gap-2 overflow-x-auto pb-1"
            >
                {days.map(day => {
                    const key = format(day, 'yyyy-MM-dd');
                    const isSelected = isSameDay(day, selectedDate);
                    const dots = dotsByDay.get(key) ?? [];
                    const isFirstOfMonth = day.getDate() === 1;

                    return (
                        <div key={key} className="flex shrink-0 items-stretch gap-2">
                            {isFirstOfMonth && (
                                <div className="flex items-center">
                                    <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        {format(day, 'LLL', { locale: pl })}
                                    </span>
                                </div>
                            )}
                            <button
                                type="button"
                                data-date={key}
                                onClick={() => onDateSelect(day)}
                                className={cn(
                                    'flex w-12 shrink-0 snap-center flex-col items-center gap-1 rounded-2xl border py-2 transition-colors',
                                    isSelected
                                        ? 'border-primary bg-primary text-primary-foreground shadow'
                                        : 'border-border/60 bg-card active:bg-accent',
                                    !isSelected && isToday(day) && 'border-primary text-primary'
                                )}
                            >
                                <span className={cn(
                                    'text-[10px] font-medium uppercase',
                                    isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                )}>
                                    {format(day, 'EEEEEE', { locale: pl })}
                                </span>
                                <span className="text-base font-bold leading-none">
                                    {format(day, 'd')}
                                </span>
                                <span className="flex h-1.5 items-center gap-0.5">
                                    {dots.map((color, i) => (
                                        <span
                                            key={i}
                                            className="h-1.5 w-1.5 rounded-full"
                                            style={{
                                                backgroundColor: isSelected ? 'currentColor' : color,
                                            }}
                                        />
                                    ))}
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
