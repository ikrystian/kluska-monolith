import { differenceInHours } from 'date-fns';
import type { WorkoutLog } from '@/lib/types';

export type MuscleAreaId = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core';

/** How the app's many muscle names map onto what an athlete actually plans around. */
export const MUSCLE_AREAS: { id: MuscleAreaId; label: string; muscles: string[] }[] = [
  { id: 'chest', label: 'Klatka', muscles: ['Klatka piersiowa'] },
  { id: 'back', label: 'Plecy', muscles: ['Plecy', 'Kaptury', 'Dolny odcinek pleców'] },
  { id: 'shoulders', label: 'Barki', muscles: ['Barki', 'Tylne aktony barków'] },
  { id: 'arms', label: 'Ramiona', muscles: ['Biceps', 'Triceps', 'Przedramiona'] },
  { id: 'legs', label: 'Nogi', muscles: ['Czworogłowe uda', 'Dwugłowe uda', 'Pośladki', 'Łydki', 'Przywodziciele', 'Odwodziciele', 'Biodra', 'Piszczele'] },
  { id: 'core', label: 'Brzuch', muscles: ['Brzuch'] },
];

/** A muscle group is usually ready to train hard again after about three days. */
export const RECOVERY_HOURS = 72;

export const areaOfMuscle = (muscle: string): MuscleAreaId | null =>
  MUSCLE_AREAS.find(area => area.muscles.includes(muscle))?.id ?? null;

function lastTrained(logs: WorkoutLog[], muscles: string[]): Date | null {
  for (const log of logs) {
    const hit = log.exercises?.some(series => series.exercise?.mainMuscleGroups?.some(group => muscles.includes(group.name)));
    if (hit) return new Date(log.endTime);
  }
  return null;
}

export interface AreaReadiness {
  id: MuscleAreaId;
  label: string;
  /** 0 = just trained, 1 = fully recovered. */
  ready: number;
  hours: number;
  trained: boolean;
  lastDate?: Date | null;
}

/** Readiness per area, worked out from completed sessions sorted newest first. */
export function areaReadiness(logs: WorkoutLog[], now = new Date()): AreaReadiness[] {
  return MUSCLE_AREAS.map(area => {
    const date = lastTrained(logs, area.muscles);
    const hours = date ? differenceInHours(now, date) : RECOVERY_HOURS;
    return { id: area.id, label: area.label, ready: Math.min(1, hours / RECOVERY_HOURS), hours, trained: Boolean(date), lastDate: date };
  });
}
