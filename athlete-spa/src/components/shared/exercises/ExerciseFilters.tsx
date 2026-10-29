'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import { ExerciseFiltersProps } from './types';

export function ExerciseFilters({
  searchTerm,
  onSearchChange,
  selectedMuscleGroup,
  onMuscleGroupChange,
  muscleGroupOptions,
}: ExerciseFiltersProps) {
  const chips = [{ label: 'Wszystkie', value: 'all' }, ...muscleGroupOptions];

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          inputMode="search"
          placeholder="Szukaj ćwiczeń lub partii…"
          className="h-11 rounded-full bg-card pl-10 pr-10"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Wyczyść wyszukiwanie</span>
          </button>
        )}
      </div>

      {/* Partie mięśniowe jako przewijane chipy */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        {chips.map((option) => {
          const active = selectedMuscleGroup === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onMuscleGroupChange(option.value)}
              className={cn(
                'h-8 flex-shrink-0 whitespace-nowrap rounded-full border px-3.5 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
