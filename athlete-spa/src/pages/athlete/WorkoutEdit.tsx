import { useParams } from 'react-router-dom';
import { EditWorkoutPageLayout } from '@/components/shared/EditWorkoutPageLayout';

export default function AthleteEditWorkoutPage() {
    const { id } = useParams<{ id: string }>();

    if (!id) return null;

    return (
        <EditWorkoutPageLayout
            workoutId={id}
            backHref={`/athlete/workouts/${id}`}
            redirectPath="/athlete/workouts"
            description="Edytuj swój trening."
        />
    );
}
