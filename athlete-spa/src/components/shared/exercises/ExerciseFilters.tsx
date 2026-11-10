'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import {
  EMPTY_EXERCISE_FILTERS,
  ExerciseLibraryFilters,
  countExtraFilters,
} from '@/hooks/useExerciseLibrary';
import { SETUP_GROUPS, SETUP_SUGGESTIONS } from './setup';
import { ExerciseFiltersProps } from './types';

const TYPE_OPTIONS = [
  { value: 'weight', label: 'Na ciężar' },
  { value: 'reps', label: 'Na powtórzenia' },
  { value: 'duration', label: 'Na czas' },
];

const toOptions = (values: string[]) => values.map((value) => ({ value, label: value }));

type SheetFilterKey = 'muscleGroup' | 'type' | 'bodyPart' | 'equipment' | 'category';

type SheetGroup = { key: SheetFilterKey; label: string; options: { value: string; label: string }[] };

const STATIC_GROUPS: SheetGroup[] = [
  { key: 'type', label: 'Typ ćwiczenia', options: TYPE_OPTIONS },
  { key: 'bodyPart', label: SETUP_GROUPS.bodyPart, options: toOptions(SETUP_SUGGESTIONS.bodyPart) },
  { key: 'category', label: SETUP_GROUPS.category, options: toOptions(SETUP_SUGGESTIONS.category) },
  { key: 'equipment', label: SETUP_GROUPS.equipment, options: toOptions(SETUP_SUGGESTIONS.equipment) },
];

function Chip({
  active,
  onClick,
  children,
  revealWhenActive = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** W przewijanym rzędzie: aktywny chip (np. wybrany z zewnątrz) ma być widoczny. */
  revealWhenActive?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active && revealWhenActive) ref.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [active, revealWhenActive]);

  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-8 flex-shrink-0 whitespace-nowrap rounded-full border px-3.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export function ExerciseFilters({ filters, onChange, muscleGroupOptions, resultCount }: ExerciseFiltersProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const extraCount = countExtraFilters(filters);
  const sheetGroups: SheetGroup[] = [
    { key: 'muscleGroup', label: 'Partia mięśniowa', options: muscleGroupOptions },
    ...STATIC_GROUPS,
  ];

  const set = (patch: Partial<ExerciseLibraryFilters>) => onChange({ ...filters, ...patch });

  // Ponowne kliknięcie aktywnego chipa w arkuszu zdejmuje filtr.
  const toggle = (key: SheetFilterKey, value: string) =>
    set({ [key]: filters[key] === value ? 'all' : value });

  const activeExtras = sheetGroups.flatMap(({ key, options }) => {
    const option = options.find((o) => o.value === filters[key]);
    return option ? [{ key, label: option.label }] : [];
  });

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            inputMode="search"
            placeholder="Szukaj ćwiczeń…"
            className="h-11 rounded-full bg-card pl-10 pr-10"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => set({ search: '' })}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Wyczyść wyszukiwanie</span>
            </button>
          )}
        </div>
        {/* Wyraźny przycisk z etykietą: tu są wszystkie filtry (partia, typ, sprzęt…). */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={extraCount > 0 ? `Filtry (aktywne: ${extraCount})` : 'Filtry'}
          className={cn(
            'flex h-11 flex-shrink-0 items-center gap-2 rounded-full border pl-3.5 pr-4 text-sm font-semibold transition-[transform,background-color] duration-150 active:scale-[0.97]',
            extraCount > 0
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15',
          )}
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
          Filtry
          {extraCount > 0 && (
            <span className="-mr-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1 text-[11px] font-bold text-primary">
              {extraCount}
            </span>
          )}
        </button>
      </div>

      {/* Aktywne filtry z arkusza — szybkie zdejmowanie bez otwierania go */}
      {activeExtras.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeExtras.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => set({ [key]: 'all' })}
              className="flex h-7 items-center gap-1 rounded-full bg-primary/10 pl-3 pr-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {label}
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Usuń filtr</span>
            </button>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto flex max-h-[85vh] w-full max-w-lg flex-col gap-0 rounded-t-3xl px-0 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5"
        >
          <SheetHeader className="mb-2 px-5 text-left">
            <SheetTitle className="font-headline text-xl">Filtry</SheetTitle>
            <SheetDescription>Zawęź bibliotekę po partii, typie, części ciała, kategorii i sprzęcie.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-3">
            {sheetGroups.map(({ key, label, options }) => (
              <section key={key} className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">{label}</h3>
                <div className="flex flex-wrap gap-2">
                  {options.map((option) => (
                    <Chip
                      key={option.value}
                      active={filters[key] === option.value}
                      onClick={() => toggle(key, option.value)}
                    >
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="flex gap-2 border-t px-5 pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-full"
              disabled={extraCount === 0}
              onClick={() =>
                set({
                  muscleGroup: EMPTY_EXERCISE_FILTERS.muscleGroup,
                  type: EMPTY_EXERCISE_FILTERS.type,
                  bodyPart: EMPTY_EXERCISE_FILTERS.bodyPart,
                  equipment: EMPTY_EXERCISE_FILTERS.equipment,
                  category: EMPTY_EXERCISE_FILTERS.category,
                })
              }
            >
              Wyczyść
            </Button>
            <Button type="button" className="h-11 flex-[2]" onClick={() => setSheetOpen(false)}>
              {resultCount === undefined ? 'Pokaż wyniki' : `Pokaż ${resultCount} ćwiczeń`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
