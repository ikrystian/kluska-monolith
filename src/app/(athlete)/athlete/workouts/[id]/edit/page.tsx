import { EditWorkoutPageLayout } from '@/components/shared/EditWorkoutPageLayout';

interface AthleteEditWorkoutPageProps {
    params: Promise<{ id: string }>;
}

export default async function AthleteEditWorkoutPage({ params }: AthleteEditWorkoutPageProps) {
    const { id } = await params;

    return (
        <EditWorkoutPageLayout
            workoutId={id}
            backHref={`/athlete/workouts/${id}`}
            redirectPath="/athlete/workouts"
            description="Edytuj swój trening."
        />
    );
}