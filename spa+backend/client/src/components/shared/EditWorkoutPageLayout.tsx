'use client';

import { EditWorkout } from '@/components/workouts/EditWorkout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export interface EditWorkoutPageLayoutProps {
    /** The workout ID to edit */
    workoutId: string;
    /** The URL to navigate back to (e.g., "/trainer/workouts") */
    backHref: string;
    /** The URL to redirect to after successful update */
    redirectPath: string;
    /** Page title - defaults to "Edytuj Trening" */
    title?: string;
    /** Page description text */
    description?: string;
    /** Back button text - defaults to "Powrót do listy" */
    backButtonText?: string;
}

/**
 * Shared layout component for workout editing pages.
 * Used by /trainer/workouts/[id], /athlete/workouts/[id]/edit, and /admin/workouts/[id]
 */
export function EditWorkoutPageLayout({
    workoutId,
    backHref,
    redirectPath,
    title = 'Edytuj Trening',
    description,
    backButtonText = 'Powrót do listy',
}: EditWorkoutPageLayoutProps) {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <Link href={backHref}>
                    <Button variant="ghost" className="mb-4 pl-0 hover:pl-0 hover:bg-transparent">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {backButtonText}
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold font-headline">{title}</h1>
                {description && (
                    <p className="text-muted-foreground">{description}</p>
                )}
            </div>

            <EditWorkout workoutId={workoutId} redirectPath={redirectPath} />
        </div>
    );
}