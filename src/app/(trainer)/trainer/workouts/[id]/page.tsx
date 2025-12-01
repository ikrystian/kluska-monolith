import { EditWorkoutPageLayout } from '@/components/shared/EditWorkoutPageLayout';

interface TrainerEditWorkoutPageProps {
    params: Promise<{ id: string }>;
}

export default async function TrainerEditWorkoutPage({ params }: TrainerEditWorkoutPageProps) {
    const { id } = await params;

    return (
        <EditWorkoutPageLayout
            workoutId={id}
            backHref="/trainer/workouts"
            redirectPath="/trainer/workouts"
            description="Edytuj plan treningowy dla swoich podopiecznych."
        />
    );
}