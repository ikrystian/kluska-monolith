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
                <p className="text-[15px] font-semibold capitalize">
                    {format(visibleMonth, 'LLLL yyyy', { locale: pl })}
                </p>
                <Button variant="secondary" size="sm" className="h-9 px-3" onClick={handleTodayClick}>
                    Dziś
                </Button>
            </div>
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="no-scrollbar flex snap-x gap-1 overflow-x-auto"
            >
                {days.map(day => {
                    const key = format(day, 'yyyy-MM-dd');
                    const isSelected = isSameDay(day, selectedDate);
                    const dots = dotsByDay.get(key) ?? [];
                    const isFirstOfMonth = day.getDate() === 1;

                    return (
                        <div key={key} className="flex shrink-0 items-stretch gap-1">
                            {isFirstOfMonth && (
                                <div className="flex items-center">
                                    <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-semibold text-muted-foreground">
                                        {format(day, 'LLL', { locale: pl })}
                                    </span>
                                </div>
                            )}
                            <button
                                type="button"
                                data-date={key}
                                onClick={() => onDateSelect(day)}
                                className={cn(
                                    'flex w-11 shrink-0 snap-center flex-col items-center gap-1 rounded-xl py-2 transition-colors',
                                    isSelected ? 'bg-foreground text-background' : 'active:bg-secondary',
                                    !isSelected && isToday(day) && 'text-primary'
                                )}
                            >
                                <span className={cn('text-xs font-medium', isSelected ? 'opacity-70' : 'text-muted-foreground')}>
                                    {format(day, 'EEEEEE', { locale: pl })}
                                </span>
                                <span className="font-display text-[1.625rem] font-bold leading-none tabular-nums">
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
