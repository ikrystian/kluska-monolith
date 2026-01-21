'use client';

import { useState, useCallback } from 'react';
import { useCollection, useUser } from '@/lib/db-hooks';
import { type PersonalRecord, type Exercise, type WorkoutSet, SetType } from '@/lib/types';
import { type ExerciseType } from '@/lib/set-type-config';

interface ExerciseSetData {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  sets: WorkoutSet[];
}

interface NewRecord {
  exerciseId: string;
  exerciseName: string;
  type: 'max_weight' | 'max_reps' | 'max_duration';
  value: number;
  reps?: number;
  previousValue?: number;
}

export function usePersonalRecords() {
  const { user } = useUser();
  const [isChecking, setIsChecking] = useState(false);

  // Fetch existing personal records for the user
  const { data: existingRecords, isLoading: recordsLoading, refetch: refetchRecords } = useCollection<PersonalRecord>(
    user?.uid ? 'personalRecords' : null,
    user?.uid ? { athleteId: user.uid } : undefined
  );

  /**
   * Check if any sets in the workout beat existing personal records
   * Returns an array of new records that were achieved
   */
  const checkForNewRecords = useCallback((exercisesData: ExerciseSetData[]): NewRecord[] => {
    if (!existingRecords) return [];

    const newRecords: NewRecord[] = [];

    for (const exerciseData of exercisesData) {
      const { exerciseId, exerciseName, exerciseType, sets } = exerciseData;

      // Filter only completed sets
      const completedSets = sets.filter(s => s.completed);
      if (completedSets.length === 0) continue;

      // Get existing records for this exercise
      const existingExerciseRecords = existingRecords.filter(r => r.exerciseId === exerciseId);

      if (exerciseType === 'weight') {
        // For weight exercises, track max weight at any rep count
        const maxWeightSet = completedSets.reduce((max, set) => {
          if ((set.weight || 0) > (max.weight || 0)) return set;
          return max;
        }, completedSets[0]);

        if (maxWeightSet && maxWeightSet.weight && maxWeightSet.weight > 0) {
          const existingMaxWeight = existingExerciseRecords.find(r => r.type === 'max_weight');

          if (!existingMaxWeight || maxWeightSet.weight > existingMaxWeight.value) {
            newRecords.push({
              exerciseId,
              exerciseName,
              type: 'max_weight',
              value: maxWeightSet.weight,
              reps: maxWeightSet.reps,
              previousValue: existingMaxWeight?.value,
            });
          }
        }
      } else if (exerciseType === 'reps') {
        // For reps-only exercises, track max reps in a single set
        const maxRepsSet = completedSets.reduce((max, set) => {
          if ((set.reps || 0) > (max.reps || 0)) return set;
          return max;
        }, completedSets[0]);

        if (maxRepsSet && maxRepsSet.reps && maxRepsSet.reps > 0) {
          const existingMaxReps = existingExerciseRecords.find(r => r.type === 'max_reps');

          if (!existingMaxReps || maxRepsSet.reps > existingMaxReps.value) {
            newRecords.push({
              exerciseId,
              exerciseName,
              type: 'max_reps',
              value: maxRepsSet.reps,
              previousValue: existingMaxReps?.value,
            });
          }
        }
      } else if (exerciseType === 'duration') {
        // For duration exercises, track max duration
        const maxDurationSet = completedSets.reduce((max, set) => {
          if ((set.duration || 0) > (max.duration || 0)) return set;
          return max;
        }, completedSets[0]);

        if (maxDurationSet && maxDurationSet.duration && maxDurationSet.duration > 0) {
          const existingMaxDuration = existingExerciseRecords.find(r => r.type === 'max_duration');

          if (!existingMaxDuration || maxDurationSet.duration > existingMaxDuration.value) {
            newRecords.push({
              exerciseId,
              exerciseName,
              type: 'max_duration',
              value: maxDurationSet.duration,
              previousValue: existingMaxDuration?.value,
            });
          }
        }
      }
    }

    return newRecords;
  }, [existingRecords]);

  /**
   * Save new personal records to the database
   */
  const saveNewRecords = useCallback(async (
    newRecords: NewRecord[],
    workoutLogId: string
  ): Promise<PersonalRecord[]> => {
    if (!user?.uid || newRecords.length === 0) return [];

    setIsChecking(true);
    const savedRecords: PersonalRecord[] = [];

    try {
      for (const record of newRecords) {
        // Check if there's an existing record to update
        const existingRecord = existingRecords?.find(
          r => r.exerciseId === record.exerciseId && r.type === record.type
        );

        const recordData = {
          athleteId: user.uid,
          exerciseId: record.exerciseId,
          exerciseName: record.exerciseName,
          type: record.type,
          value: record.value,
          reps: record.reps,
          achievedAt: new Date(),
          workoutLogId,
        };

        if (existingRecord) {
          // Update existing record
          const response = await fetch(`/api/db/personalRecords/${existingRecord.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recordData),
          });

          if (response.ok) {
            const result = await response.json();
            savedRecords.push({ ...recordData, id: existingRecord.id } as unknown as PersonalRecord);
          }
        } else {
          // Create new record
          const response = await fetch('/api/db/personalRecords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recordData),
          });

          if (response.ok) {
            const result = await response.json();
            savedRecords.push({ ...recordData, id: result.data.id } as unknown as PersonalRecord);
          }
        }
      }

      // Refetch records to update local state
      refetchRecords();
    } catch (error) {
      console.error('Error saving personal records:', error);
    } finally {
      setIsChecking(false);
    }

    return savedRecords;
  }, [user?.uid, existingRecords, refetchRecords]);

  /**
   * Get personal records for a specific exercise
   */
  const getRecordsForExercise = useCallback((exerciseId: string): PersonalRecord[] => {
    if (!existingRecords) return [];
    return existingRecords.filter(r => r.exerciseId === exerciseId);
  }, [existingRecords]);

  /**
   * Get the best record of a specific type for an exercise
   */
  const getBestRecord = useCallback((
    exerciseId: string,
    type: 'max_weight' | 'max_reps' | 'max_duration'
  ): PersonalRecord | undefined => {
    if (!existingRecords) return undefined;
    return existingRecords.find(r => r.exerciseId === exerciseId && r.type === type);
  }, [existingRecords]);

  /**
   * Format a record value for display
   */
  const formatRecordValue = useCallback((record: PersonalRecord | NewRecord): string => {
    switch (record.type) {
      case 'max_weight':
        return `${record.value} kg${record.reps ? ` @ ${record.reps} powt.` : ''}`;
      case 'max_reps':
        return `${record.value} powtórzeń`;
      case 'max_duration':
        return `${record.value} sekund`;
      default:
        return String(record.value);
    }
  }, []);

  return {
    existingRecords,
    isLoading: recordsLoading,
    isChecking,
    checkForNewRecords,
    saveNewRecords,
    getRecordsForExercise,
    getBestRecord,
    formatRecordValue,
  };
}

export type { NewRecord, ExerciseSetData };