import { EditWorkoutPageLayout } from '@/components/shared/EditWorkoutPageLayout';

interface AdminEditWorkoutPageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminEditWorkoutPage({ params }: AdminEditWorkoutPageProps) {
    const { id } = await params;

    return (
        <EditWorkoutPageLayout
            workoutId={id}
            backHref="/admin/workouts"
            redirectPath="/admin/workouts"
            description="Edytuj trening w bazie systemowej."
        />
    );
}
