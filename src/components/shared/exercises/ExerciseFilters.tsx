'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { EMPTY_EXERCISE_FILTERS, ExerciseLibraryFilters } from '@/hooks/useExerciseLibrary';
import { SETUP_GROUPS, SETUP_SUGGESTIONS } from './setup';
import { ExerciseFiltersProps } from './types';

const TYPE_OPTIONS = [
  { value: 'weight', label: 'Na ciężar' },
  { value: 'reps', label: 'Na powtórzenia' },
  { value: 'duration', label: 'Na czas' },
];

const toOptions = (values: string[]) => values.map((value) => ({ value, label: value }));

type SelectFilterKey = Exclude<keyof ExerciseLibraryFilters, 'search'>;

export function ExerciseFilters({ filters, onChange, muscleGroupOptions }: ExerciseFiltersProps) {
  const selects: { key: SelectFilterKey; placeholder: string; allLabel: string; options: { value: string; label: string }[] }[] = [
    { key: 'muscleGroup', placeholder: 'Partia mięśniowa', allLabel: 'Wszystkie partie', options: muscleGroupOptions },
    { key: 'type', placeholder: 'Typ', allLabel: 'Wszystkie typy', options: TYPE_OPTIONS },
    { key: 'bodyPart', placeholder: SETUP_GROUPS.bodyPart, allLabel: 'Każda część ciała', options: toOptions(SETUP_SUGGESTIONS.bodyPart) },
    { key: 'equipment', placeholder: SETUP_GROUPS.equipment, allLabel: 'Każdy sprzęt', options: toOptions(SETUP_SUGGESTIONS.equipment) },
    { key: 'category', placeholder: SETUP_GROUPS.category, allLabel: 'Każda kategoria', options: toOptions(SETUP_SUGGESTIONS.category) },
  ];

  const hasActiveFilters = (Object.keys(EMPTY_EXERCISE_FILTERS) as (keyof ExerciseLibraryFilters)[])
    .some((key) => filters[key] !== EMPTY_EXERCISE_FILTERS[key]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Szukaj po nazwie, partii, sprzęcie..."
          className="pl-9"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {selects.map(({ key, placeholder, allLabel, options }) => (
          <Select key={key} value={filters[key]} onValueChange={(value) => onChange({ ...filters, [key]: value })}>
            <SelectTrigger aria-label={placeholder} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{allLabel}</SelectItem>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={!hasActiveFilters}
          onClick={() => onChange(EMPTY_EXERCISE_FILTERS)}
        >
          <X className="mr-2 h-4 w-4" />
          Wyczyść
        </Button>
      </div>
    </div>
  );
}
