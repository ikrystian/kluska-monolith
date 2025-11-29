import { CreateWorkoutPageLayout } from '@/components/shared/CreateWorkoutPageLayout';

export default function AdminCreateWorkoutPage() {
    return (
        <CreateWorkoutPageLayout
            backHref="/admin/workouts"
            redirectPath="/admin/workouts"
            description="Dodaj nowy trening do bazy systemowej."
        />
    );
}
