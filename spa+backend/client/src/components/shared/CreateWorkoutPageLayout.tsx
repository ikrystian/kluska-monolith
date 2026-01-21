'use client';

import { CreateWorkout } from '@/components/workouts/CreateWorkout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export interface CreateWorkoutPageLayoutProps {
    /** The URL to navigate back to (e.g., "/trainer/workouts") */
    backHref: string;
    /** The URL to redirect to after successful creation */
    redirectPath: string;
    /** Page title - defaults to "Nowy Trening" */
    title?: string;
    /** Page description text */
    description?: string;
    /** Back button text - defaults to "Powrót do listy" */
    backButtonText?: string;
}

/**
 * Shared layout component for workout creation pages.
 * Used by /trainer/workouts/create, /athlete/workouts/create, and /admin/workouts/create
 */
export function CreateWorkoutPageLayout({
    backHref,
    redirectPath,
    title = 'Nowy Trening',
    description,
    backButtonText = 'Powrót do listy',
}: CreateWorkoutPageLayoutProps) {
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

            <CreateWorkout redirectPath={redirectPath} />
        </div>
    );
}