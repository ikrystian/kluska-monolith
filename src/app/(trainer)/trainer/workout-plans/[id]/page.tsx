import { WorkoutPlanEditView } from '@/components/shared/workout-plans/WorkoutPlanViews';

interface TrainerEditWorkoutPlanPageProps {
    params: Promise<{ id: string }>;
}

export default async function TrainerEditWorkoutPlanPage({ params }: TrainerEditWorkoutPlanPageProps) {
    const { id } = await params;

    return <WorkoutPlanEditView role="trainer" basePath="/trainer/workout-plans" planId={id} />;
}
