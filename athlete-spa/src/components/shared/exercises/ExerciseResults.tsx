'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Dumbbell, LayoutGrid, List, LoaderCircle } from 'lucide-react';
import { Exercise } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExerciseCardHorizontal } from './ExerciseCardHorizontal';
import { ExerciseCardGrid } from './ExerciseCardGrid';
import { ExerciseCardProps } from './types';

export type ExerciseViewMode = 'list' | 'grid';

const VIEW_MODE_STORAGE_KEY = 'exercises:view-mode';
const LIST_ROW_HEIGHT = 96; // 88px karta + 8px odstęp
const GRID_GAP = 12;

function readViewMode(): ExerciseViewMode {
  try {
    return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

/** Tryb lista/siatka, wspólny dla biblioteki i wyboru ćwiczenia do treningu. */
export function useExerciseViewMode() {
  const [viewMode, setViewModeState] = useState<ExerciseViewMode>(readViewMode);
  const setViewMode = useCallback((mode: ExerciseViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // brak dostępu do storage – tryb działa tylko w tej sesji
    }
  }, []);
  return [viewMode, setViewMode] as const;
}

/** Liczba kolumn gridu wg szerokości kontenera (nie viewportu – działa też w panelach). */
function getGridColumns(width: number): number {
  if (width >= 1200) return 5;
  if (width >= 900) return 4;
  if (width >= 600) return 3;
  return 2;
}

export function ViewModeToggle({ value, onChange }: { value: ExerciseViewMode; onChange: (mode: ExerciseViewMode) => void }) {
  const options: { mode: ExerciseViewMode; icon: typeof List; label: string }[] = [
    { mode: 'list', icon: List, label: 'Widok listy' },
    { mode: 'grid', icon: LayoutGrid, label: 'Widok siatki' },
  ];
  return (
    <div className="flex h-10 items-center rounded-full border bg-card p-1">
      {options.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          aria-label={label}
          title={label}
          onClick={() => onChange(mode)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
            value === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

export interface ExerciseResultsHandle {
  /** Przewija do karty ćwiczenia (np. po zamknięciu podglądu). */
  scrollToExercise: (exerciseId: string) => void;
}

interface ExerciseResultsProps {
  exercises: Exercise[];
  viewMode: ExerciseViewMode;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  /** Zmiana klucza (nowe filtry) przewija listę na górę. */
  queryKey: string;
  /** Propsy karty poza samym ćwiczeniem. */
  getCardProps: (exercise: Exercise, index: number) => Omit<ExerciseCardProps, 'exercise'>;
  empty: ReactNode;
  onRetry?: () => void;
}

/**
 * Wyniki biblioteki ćwiczeń: wirtualizowana lista albo siatka z infinite
 * scrollem. Ten sam widok w bibliotece i przy wyborze ćwiczenia do treningu.
 */
export const ExerciseResults = forwardRef<ExerciseResultsHandle, ExerciseResultsProps>(function ExerciseResults(
  { exercises, viewMode, isLoading, isLoadingMore, error, hasMore, loadMore, queryKey, getCardProps, empty, onRetry },
  ref,
) {
  // Kontener scrolla: mierzymy jego szerokość, żeby dobrać liczbę kolumn gridu.
  const parentRef = useRef<HTMLDivElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const setScrollContainer = useCallback((el: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect();
    parentRef.current = el;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    resizeObserverRef.current = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    resizeObserverRef.current.observe(el);
  }, []);

  // Wirtualizujemy wiersze; w gridzie wiersz zawiera `columns` kart.
  const columns = viewMode === 'grid' ? getGridColumns(containerWidth) : 1;
  const rowCount = Math.ceil(exercises.length / columns);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => {
      if (viewMode === 'list') return LIST_ROW_HEIGHT;
      const colWidth = containerWidth ? (containerWidth - GRID_GAP * (columns - 1)) / columns : 180;
      return colWidth * 0.75 + 76 + GRID_GAP; // media 4:3 + treść + odstęp
    },
    overscan: viewMode === 'grid' ? 3 : 5,
    getItemKey: (index) => `${viewMode}-${columns}-${exercises[index * columns]?.id ?? index}`,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, viewMode, columns]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToExercise: (exerciseId) => {
        const index = exercises.findIndex((ex) => ex.id === exerciseId);
        if (index >= 0) rowVirtualizer.scrollToIndex(Math.floor(index / columns), { align: 'auto' });
      },
    }),
    [exercises, columns, rowVirtualizer],
  );

  // Infinite scroll: gdy pasek dochodzi do dołu kontenera, dołóż kolejną stronę.
  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 400;
    if (nearBottom && hasMore && !isLoadingMore) loadMore();
  }, [hasMore, isLoadingMore, loadMore]);

  // Nowe wyszukiwanie/filtry zaczynają od góry listy.
  useEffect(() => {
    parentRef.current?.scrollTo({ top: 0 });
  }, [queryKey]);

  // Gdy treść nie wypełnia kontenera (np. szeroki grid), scroll nie nastąpi – dociągnij od razu.
  useEffect(() => {
    handleScroll();
  }, [handleScroll, exercises.length, viewMode, columns]);

  const renderCard = (exercise: Exercise, index: number) => {
    const CardComponent = viewMode === 'grid' ? ExerciseCardGrid : ExerciseCardHorizontal;
    return <CardComponent key={exercise.id} exercise={exercise} {...getCardProps(exercise, index)} />;
  };

  if (isLoading) {
    return viewMode === 'grid' ? (
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-hidden">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border bg-card">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex h-[88px] flex-shrink-0 items-center gap-3 rounded-2xl border bg-card p-2">
            <Skeleton className="aspect-square h-full flex-shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center rounded-2xl border-dashed py-20">
        <CardContent className="text-center">
          <Dumbbell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-headline text-xl font-semibold">Błąd ładowania</h3>
          <p className="mb-4 text-muted-foreground">{error.message || 'Nie udało się pobrać ćwiczeń.'}</p>
          {onRetry && (
            <Button type="button" variant="outline"  onClick={onRetry}>
              Spróbuj ponownie
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (exercises.length === 0) return <>{empty}</>;

  return (
    <div
      ref={setScrollContainer}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * columns;
          const rowItems = exercises.slice(start, start + columns);
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={viewMode === 'grid' ? 'pb-3' : 'pb-2'}
            >
              {viewMode === 'grid' ? (
                <div className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: GRID_GAP }}>
                  {rowItems.map((exercise, i) => renderCard(exercise, start + i))}
                </div>
              ) : (
                rowItems.map((exercise, i) => renderCard(exercise, start + i))
              )}
            </div>
          );
        })}
      </div>
      {isLoadingMore && (
        <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          Ładowanie kolejnych ćwiczeń…
        </div>
      )}
    </div>
  );
});
