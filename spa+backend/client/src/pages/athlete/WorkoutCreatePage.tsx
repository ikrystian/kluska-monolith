'use client';

import { CreateWorkoutPageLayout } from '@/components/shared/CreateWorkoutPageLayout';

export default function WorkoutCreatePage() {
    return (
        <CreateWorkoutPageLayout
            backHref="/athlete/workouts"
            redirectPath="/athlete/workouts"
            description="Skomponuj swój własny plan treningowy."
        />
    );
}
