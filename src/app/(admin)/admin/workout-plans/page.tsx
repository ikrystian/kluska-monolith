import { WorkoutPlansListView } from '@/components/shared/WorkoutPlansListView';

export default function AdminWorkoutPlansPage() {
  return (
    <WorkoutPlansListView
      role="admin"
      basePath="/admin/workout-plans"
    />
  );
}
