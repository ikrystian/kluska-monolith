'use client';

import { useState } from 'react';
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

type SheetFilterKey = 'type' | 'bodyPart' | 'equipment' | 'category';

const SHEET_GROUPS: { key: SheetFilterKey; label: string; options: { value: string; label: string }[] }[] = [
  { key: 'type', label: 'Typ ćwiczenia', options: TYPE_OPTIONS },
  { key: 'bodyPart', label: SETUP_GROUPS.bodyPart, options: toOptions(SETUP_SUGGESTIONS.bodyPart) },
  { key: 'category', label: SETUP_GROUPS.category, options: toOptions(SETUP_SUGGESTIONS.category) },
  { key: 'equipment', label: SETUP_GROUPS.equipment, options: toOptions(SETUP_SUGGESTIONS.equipment) },
];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
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
  const chips = [{ label: 'Wszystkie', value: 'all' }, ...muscleGroupOptions];
  const extraCount = countExtraFilters(filters);

  const set = (patch: Partial<ExerciseLibraryFilters>) => onChange({ ...filters, ...patch });

  // Ponowne kliknięcie aktywnego chipa w arkuszu zdejmuje filtr.
  const toggle = (key: SheetFilterKey, value: string) =>
    set({ [key]: filters[key] === value ? 'all' : value });

  const activeExtras = SHEET_GROUPS.flatMap(({ key, options }) => {
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
            placeholder="Szukaj ćwiczeń, partii, sprzętu…"
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
        <Button
          type="button"
          variant={extraCount > 0 ? 'default' : 'outline'}
          className="relative h-11 w-11 flex-shrink-0 rounded-full p-0"
          onClick={() => setSheetOpen(true)}
          aria-label={extraCount > 0 ? `Filtry (aktywne: ${extraCount})` : 'Filtry'}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {extraCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-foreground px-1 text-[10px] font-bold text-background">
              {extraCount}
            </span>
          )}
        </Button>
      </div>

      {/* Partie mięśniowe jako przewijane chipy */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        {chips.map((option) => (
          <Chip
            key={option.value}
            active={filters.muscleGroup === option.value}
            onClick={() => set({ muscleGroup: option.value })}
          >
            {option.label}
          </Chip>
        ))}
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
          className="mx-auto flex max-h-[85vh] w-full max-w-lg flex-col gap-0 rounded-t-[2rem] px-0 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5"
        >
          <SheetHeader className="mb-2 px-5 text-left">
            <SheetTitle className="font-headline text-xl">Filtry</SheetTitle>
            <SheetDescription>Zawęź bibliotekę po typie, części ciała, kategorii i sprzęcie.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-3">
            {SHEET_GROUPS.map(({ key, label, options }) => (
              <section key={key} className="space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</h3>
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
                  type: EMPTY_EXERCISE_FILTERS.type,
                  bodyPart: EMPTY_EXERCISE_FILTERS.bodyPart,
                  equipment: EMPTY_EXERCISE_FILTERS.equipment,
                  category: EMPTY_EXERCISE_FILTERS.category,
                })
              }
            >
              Wyczyść
            </Button>
            <Button type="button" className="h-11 flex-[2] rounded-full" onClick={() => setSheetOpen(false)}>
              {resultCount === undefined ? 'Pokaż wyniki' : `Pokaż ${resultCount} ćwiczeń`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
