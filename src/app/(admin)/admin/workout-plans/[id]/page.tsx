import { WorkoutPlanEditView } from '@/components/shared/workout-plans/WorkoutPlanViews';

interface AdminEditWorkoutPlanPageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminEditWorkoutPlanPage({ params }: AdminEditWorkoutPlanPageProps) {
    const { id } = await params;

    return <WorkoutPlanEditView role="admin" basePath="/admin/workout-plans" planId={id} />;
}
