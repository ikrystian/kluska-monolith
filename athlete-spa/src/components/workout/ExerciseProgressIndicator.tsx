'use client';

import { differenceInCalendarDays } from 'date-fns';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProgressComparisonProps {
    currentWeight?: number;
    currentReps?: number;
    currentDuration?: number;
    previousWeight?: number;
    previousReps?: number;
    previousDuration?: number;
    exerciseType: 'weight' | 'reps' | 'duration';
    compact?: boolean;
}

/**
 * Component that displays real-time comparison between current and previous set data.
 * Shows:
 * - Green arrow up when current > previous (improvement)
 * - Red arrow down when current < previous (regression)
 * - Gray equals when current == previous (same)
 * - Previous values for reference
 */
export function ExerciseProgressIndicator({
    currentWeight = 0,
    currentReps = 0,
    currentDuration = 0,
    previousWeight,
    previousReps,
    previousDuration,
    exerciseType,
    compact = false,
}: ProgressComparisonProps) {
    // No previous data - don't show anything
    if (previousWeight === undefined && previousReps === undefined && previousDuration === undefined) {
        return null;
    }

    const renderIndicator = (current: number, previous: number, unit: string) => {
        const diff = current - previous;
        const showDiff = current > 0; // Only show diff when user has entered a value

        if (!showDiff) {
            // Just show previous value as hint
            return (
                <span className="text-[11px] text-muted-foreground">
                    poprz: {previous}{unit}
                </span>
            );
        }

        if (diff > 0) {
            return (
                <span className="flex items-center gap-0.5 text-[11px] font-medium text-volt">
                    <ArrowUp className="h-3 w-3" />
                    +{diff}{unit}
                </span>
            );
        } else if (diff < 0) {
            return (
                <span className="flex items-center gap-0.5 text-[11px] font-medium text-destructive">
                    <ArrowDown className="h-3 w-3" />
                    {diff}{unit}
                </span>
            );
        } else {
            return (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                    <Minus className="h-3 w-3" />
                    {previous}{unit}
                </span>
            );
        }
    };

    if (compact) {
        // Compact mode: just show diff indicators
        return (
            <div className="flex gap-2 justify-center">
                {exerciseType === 'weight' && previousWeight !== undefined && (
                    <>
                        {renderIndicator(currentWeight, previousWeight, 'kg')}
                        {previousReps !== undefined && renderIndicator(currentReps, previousReps, '')}
                    </>
                )}
                {exerciseType === 'reps' && previousReps !== undefined && (
                    renderIndicator(currentReps, previousReps, ' powt.')
                )}
                {exerciseType === 'duration' && previousDuration !== undefined && (
                    renderIndicator(currentDuration, previousDuration, 's')
                )}
            </div>
        );
    }

    // Default mode: show previous values with diff
    return (
        <div className="flex gap-3 text-[11px]">
            {exerciseType === 'weight' && (
                <>
                    {previousWeight !== undefined && (
                        <div className="flex flex-col items-center">
                            {renderIndicator(currentWeight, previousWeight, 'kg')}
                        </div>
                    )}
                    {previousReps !== undefined && (
                        <div className="flex flex-col items-center">
                            {renderIndicator(currentReps, previousReps, '')}
                        </div>
                    )}
                </>
            )}
            {exerciseType === 'reps' && previousReps !== undefined && (
                <div className="flex flex-col items-center">
                    {renderIndicator(currentReps, previousReps, ' powt.')}
                </div>
            )}
            {exerciseType === 'duration' && previousDuration !== undefined && (
                <div className="flex flex-col items-center">
                    {renderIndicator(currentDuration, previousDuration, 's')}
                </div>
            )}
        </div>
    );
}

export interface ExerciseHistoryBadgeProps {
    lastWorkoutDate: Date;
    lastWorkoutName?: string;
}

/**
 * Badge showing when this exercise was last performed
 */
export function ExerciseHistoryBadge({ lastWorkoutDate, lastWorkoutName }: ExerciseHistoryBadgeProps) {
    const daysAgo = differenceInCalendarDays(new Date(), lastWorkoutDate);

    let timeText: string;
    if (daysAgo === 0) {
        timeText = 'dzisiaj';
    } else if (daysAgo === 1) {
        timeText = 'wczoraj';
    } else if (daysAgo < 7) {
        timeText = `${daysAgo} dni temu`;
    } else if (daysAgo < 30) {
        const weeks = Math.floor(daysAgo / 7);
        timeText = `${weeks} ${weeks === 1 ? 'tydzień' : 'tygodni'} temu`;
    } else {
        const months = Math.floor(daysAgo / 30);
        timeText = `${months} ${months === 1 ? 'miesiąc' : 'miesięcy'} temu`;
    }

    return (
        <span>Ostatnio {timeText}</span>
    );
}
