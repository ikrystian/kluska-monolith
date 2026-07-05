'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { ExerciseFiltersProps } from './types';

export function ExerciseFilters({
  searchTerm,
  onSearchChange,
  selectedMuscleGroup,
  onMuscleGroupChange,
  muscleGroupOptions,
}: ExerciseFiltersProps) {
  return (
    <div className="flex gap-2 w-full md:w-auto">
      <div className="relative flex-grow md:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Szukaj ćwiczeń..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select value={selectedMuscleGroup} onValueChange={onMuscleGroupChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Partia mięśniowa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszystkie</SelectItem>
          {muscleGroupOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}