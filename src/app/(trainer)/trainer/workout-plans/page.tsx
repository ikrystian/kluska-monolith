import { WorkoutPlansListView } from '@/components/shared/WorkoutPlansListView';

export default function TrainerWorkoutPlansPage() {
  return (
    <WorkoutPlansListView
      role="trainer"
      basePath="/trainer/workout-plans"
    />
  );
}
