import { CreateWorkoutPageLayout } from '@/components/shared/CreateWorkoutPageLayout';

export default function TrainerCreateWorkoutPage() {
    return (
        <CreateWorkoutPageLayout
            backHref="/trainer/workouts"
            redirectPath="/trainer/workouts"
            description="Stwórz nowy plan treningowy dla swoich podopiecznych."
        />
    );
}
