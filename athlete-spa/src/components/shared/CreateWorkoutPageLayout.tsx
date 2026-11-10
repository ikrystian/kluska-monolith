'use client';

import { CreateWorkout } from '@/components/workouts/CreateWorkout';

export interface CreateWorkoutPageLayoutProps {
    /** The URL to redirect to after successful creation */
    redirectPath: string;
}

/**
 * Shared layout component for workout creation pages.
 * The app header already carries the title and the way back.
 */
export function CreateWorkoutPageLayout({ redirectPath }: CreateWorkoutPageLayoutProps) {
    return (
        <div className="page">
            <CreateWorkout redirectPath={redirectPath} />
        </div>
    );
}