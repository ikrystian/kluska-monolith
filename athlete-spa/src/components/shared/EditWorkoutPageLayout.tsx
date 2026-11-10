'use client';

import { EditWorkout } from '@/components/workouts/EditWorkout';

export interface EditWorkoutPageLayoutProps {
    /** The workout ID to edit */
    workoutId: string;
    /** The URL to redirect to after successful update */
    redirectPath: string;
}

/**
 * Shared layout component for workout editing pages.
 * The app header already carries the title and the way back.
 */
export function EditWorkoutPageLayout({ workoutId, redirectPath }: EditWorkoutPageLayoutProps) {
    return (
        <div className="page">
            <EditWorkout workoutId={workoutId} redirectPath={redirectPath} />
        </div>
    );
}